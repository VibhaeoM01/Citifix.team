const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { callMLAPI } = require('../utils/mlIntegration');
const { sendComplaintNotedEmail } = require('../utils/emailService');
const { validateEmail } = require('../utils/emailValidation');
const path = require('path');
const fs = require('fs');

exports.getAllComplaintsByDepartment = async (req, res) => {
  try {
    // Only admin/staff can access
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // First, get all complaints
    const allComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .lean();

    // Create a department map to handle specific permissions
    const departmentMap = {
      'Roads': ['Road Issues'],
      'Water': ['Water Supply'],
      'Electricity': ['Electricity'],
      'Sanitation': ['Sanitation']
    };

    // Get the staff member's department
    const staffDepartment = req.user.department;

    // Initialize result object
    const result = {};

    // Group complaints by category
    allComplaints.forEach(complaint => {
      const category = complaint.category;
      
      // Handle department-specific complaints
      if (staffDepartment && departmentMap[staffDepartment]) {
        // If staff member belongs to a specific department
        const allowedCategories = departmentMap[staffDepartment];
        
        // Add complaint if it belongs to staff's department or is "Other"
        if (category === 'Other' || allowedCategories.includes(category)) {
          if (!result[category]) {
            result[category] = [];
          }
          result[category].push(complaint);
        }
      } else if (req.user.role === 'admin') {
        // Admins can see all complaints
        if (!result[category]) {
          result[category] = [];
        }
        result[category].push(complaint);
      }
    });

    // Sort categories so "Other" appears last
    const sortedResult = {};
    Object.keys(result)
      .sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      })
      .forEach(key => {
        sortedResult[key] = result[key];
      });

    res.json({ departments: sortedResult });
  } catch (error) {
    console.error('Get all complaints by department error:', error);
    res.status(500).json({ message: 'Failed to fetch grouped complaints' });
  }
};

exports.getComplaintsByDepartment = async (req, res) => {
  try {
    console.log('=== getComplaintsByDepartment START ===');
    console.log('User:', JSON.stringify(req.user, null, 2));
    
    // Check authentication and role
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!['admin', 'staff'].includes(req.user.role)) {
      console.log('Invalid role:', req.user.role);
      return res.status(403).json({ message: 'Access denied - invalid role' });
    }

    const dept = req.params.dept;
    console.log('Department requested:', dept);

    // For staff members, verify department access
    if (req.user.role === 'staff') {
      console.log('Staff department:', req.user.department);
      console.log('Requested department:', dept);
      if (req.user.department !== dept) {
        console.log('Staff member trying to access wrong department');
        return res.status(403).json({ message: 'Access denied - wrong department' });
      }
    }
    
    // Define the mapping between departments and their corresponding categories
    const categoryMap = {
      'Roads': ['Road Issues', 'Potholes'],
      'Water': ['Water Supply', 'Water Issues'],
      'Electricity': ['Electricity', 'Power Issues'],
      'Sanitation': ['Sanitation', 'Garbage', 'Waste Management'],
      'Other': ['Other']
    };

    // Define the mapping between departments and their corresponding categories
    const departmentToCategories = {
      'Roads': ['Road Issues', 'Traffic Management'],
      'Water': ['Water Supply'],
      'Electricity': ['Electricity', 'Street Lighting'],
      'Sanitation': ['Sanitation', 'Garbage'],
      'Other': ['Other', 'Parks & Recreation', 'Public Transport', 'Public Safety']
    };

    // Get the corresponding categories for the department
    const targetCategories = departmentToCategories[dept];
    if (!targetCategories) {
      console.log('Invalid department requested:', dept);
      return res.status(400).json({ message: 'Invalid department' });
    }

    console.log('Target categories for department:', targetCategories);

    // For staff members, check if they belong to the requested department
    if (req.user.role === 'staff' && req.user.department !== dept) {
      console.log('Staff member trying to access wrong department');
      return res.status(403).json({ message: 'Access denied - wrong department' });
    }

    const complaints = await Complaint.find({ 
      category: { $in: targetCategories }
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${complaints.length} complaints for department ${dept}`);

    // Add photo URL prefix if needed
    const processedComplaints = complaints.map(c => ({
      ...c,
      photo: c.photo.startsWith('http') ? c.photo : `${process.env.BASE_URL || ''}${c.photo}`
    }));
    
    res.json({ complaints: processedComplaints });

  } catch (error) {
    console.error('Get complaints by department error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ message: 'Failed to fetch complaints: ' + error.message });
  }
};

exports.submitComplaint = async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }
    const { description, location } = req.body;
    const photoUrl = `/uploads/${req.file.filename}`;

    // Import the proper ML API utility
    const { callMLAPI } = require('../utils/mlIntegration');

    // Call Flask ML API using the imported utility
    let mlResults = await callMLAPI(req.file.path, description);
    console.log('CONTROLLER GOT ML RESULTS:', JSON.stringify(mlResults, null, 2));
    
    // Map ML predicted_class to complaint categories
    const categoryMapping = {
      'pothole': 'Road Issues',
      'garbage': 'Sanitation',
      'manhole': 'Road Issues'
    };

    // Get the predicted class and map it to a category
    const predictedClass = mlResults.predicted_class || mlResults.detectedClass;
    console.log('ML Predicted Class:', predictedClass);

    // Map the ML prediction to a proper category
    mlResults.predictedCategory = categoryMapping[predictedClass] || 'Other';
    console.log('Mapped Category:', mlResults.predictedCategory);

    // Get the uploaded filename to help with classification
    const filename = req.file.originalname ? req.file.originalname.toLowerCase() : '';
    const desc = description ? description.toLowerCase() : '';

    // Override classification if filename/description contains specific keywords
    if (
      filename.includes('pothole') || 
      desc.includes('pothole') || 
      desc.includes('pot hole') || 
      desc.includes('road') || 
      desc.includes('street damage')
    ) {
      console.log('OVERRIDE: Detected road issue keywords in filename or description');
      mlResults.detectedClass = 'pothole';
      mlResults.predictedCategory = 'Road Issues';
      mlResults.predictedUrgency = 'high';
      mlResults.caption = 'Image appears to show a pothole';
    }
    
    console.log('FINAL CATEGORY:', mlResults.predictedCategory);

    // Ensure we have a valid category
    const validCategory = mlResults.predictedCategory || 'Other';
    console.log('Final Category:', validCategory);

    // Merge ML results into complaint
    const complaint = new Complaint({
      user: req.user._id,
      photo: photoUrl,
      description,
      location,
      email: req.body.email || req.user.email, // Use provided email or fallback to user's email
      category: validCategory,
      urgency: mlResults.predictedUrgency || 'high',
      mlResults: {
        caption: mlResults.caption,
        predictedCategory: validCategory,
        predictedUrgency: mlResults.predictedUrgency || 'high',
        confidence: mlResults.confidence
      }
    });
    await complaint.save();
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { complaints: complaint._id } }
    );
    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: {
        id: complaint._id,
        category: complaint.category,
        urgency: complaint.urgency,
        caption: complaint.mlResults.caption,
        status: complaint.status,
        createdAt: complaint.createdAt
      },
      mlResults: complaint.mlResults
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Failed to submit complaint' });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-mlResults');
    res.json({ complaints });
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('resolvedBy', 'name');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint' });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const allowedStatuses = ['pending', 'resolved'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    complaint.status = status;
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }
    await complaint.save();
    res.json({
      message: 'Complaint status updated successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (complaint.photo) {
      const photoPath = path.join(__dirname, '..', complaint.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    await Complaint.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { complaints: req.params.id } }
    );
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};

// Clear all complaints (admin only)
exports.clearAllComplaints = async (req, res) => {
  try {
    // Verify admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Get all complaints to clean up photos
    const complaints = await Complaint.find({});
    
    // Delete all complaint photos
    for (const complaint of complaints) {
      if (complaint.photo) {
        const photoPath = path.join(__dirname, '..', complaint.photo);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
    }

    // Clear complaints from all users
    await User.updateMany({}, { $set: { complaints: [] } });
    
    // Delete all complaints
    await Complaint.deleteMany({});

    res.json({ 
      message: 'All complaints cleared successfully',
      count: complaints.length 
    });
  } catch (error) {
    console.error('Clear all complaints error:', error);
    res.status(500).json({ message: 'Failed to clear complaints' });
  }
};

exports.markComplaintAsNoted = async (req, res) => {
  try {
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = 'noted';
    complaint.notedBy = req.user._id;
    complaint.notedAt = new Date();
    if (req.body && typeof req.body.notes === 'string' && req.body.notes.trim()) {
      complaint.adminNotes = req.body.notes.trim();
    }

    await complaint.save();

    // Attempt to send acknowledgement email, but do not fail request if email sending fails
    let emailResult = { success: false, message: 'Email not attempted' };
    try {
      const complaintForEmail = {
        ...complaint.toObject(),
        email: complaint.email // Use the email stored with the complaint
      };
      
      if (!complaintForEmail.email) {
        throw new Error('No email address found for this complaint');
      }
      
      console.log('Sending email notification to:', complaintForEmail.email);
      emailResult = await sendComplaintNotedEmail(complaintForEmail);
    } catch (emailError) {
      console.warn('Failed to send complaint noted email:', emailError.message);
      emailResult = { success: false, message: emailError.message };
    }

    res.json({
      message: 'Complaint marked as noted successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        notedAt: complaint.notedAt,
        notedBy: complaint.notedBy,
        adminNotes: complaint.adminNotes || null
      },
      emailNotification: {
        sent: emailResult.success,
        message: emailResult.message
      }
    });
  } catch (error) {
    console.error('Mark complaint as noted error:', error);
    res.status(500).json({ message: 'Failed to mark complaint as noted' });
  }
};

exports.getComplaintDetails = async (req, res) => {
  try {
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email phone role')
      .populate('resolvedBy', 'name email role')
      .populate('notedBy', 'name email role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint details error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint details' });
  }
};

exports.testPrediction = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required for prediction testing' });
    }

    const description = req.body?.description || '';
    const mlResults = await callMLAPI(req.file.path, description);

    // Clean up uploaded file for test endpoint to avoid disk bloat
    try {
      await fs.promises.unlink(req.file.path);
    } catch (cleanupError) {
      console.warn('Failed to clean up test prediction file:', cleanupError.message);
    }

    res.json({
      success: true,
      results: mlResults
    });
  } catch (error) {
    console.error('Test prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test prediction'
    });
  }
};

exports.testEmail = async (req, res) => {
  try {
    const emailToValidate = req.body?.email || req.user?.email;
    if (!emailToValidate) {
      return res.status(400).json({ message: 'Email is required for testing' });
    }

    const validationResult = await validateEmail(emailToValidate, {
      checkMX: false,
      checkDisposable: true,
      requireTrusted: false,
      useVerificationService: false
    });

    const response = {
      email: emailToValidate,
      validation: validationResult
    };

    if (validationResult.isValid && req.body?.sendTestEmail) {
      try {
        await sendComplaintNotedEmail({
          _id: 'TEST-COMPLAINT',
          category: req.body?.category || 'General',
          location: req.body?.location || 'N/A',
          urgency: req.body?.urgency || 'medium',
          description: req.body?.message || 'Test email from complaint system',
          createdAt: new Date(),
          email: emailToValidate
        });
        response.emailSent = true;
      } catch (emailError) {
        console.warn('Failed to send test email:', emailError.message);
        response.emailSent = false;
        response.emailError = emailError.message;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Failed to test email configuration', error: error.message });
  }
};
