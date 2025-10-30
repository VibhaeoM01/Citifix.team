const express = require('express');
const { body } = require('express-validator');
const upload = require('../utils/multerUpload');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const complaintsController = require('../controller/complaints.controller');

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Complaints service is running',
    timestamp: new Date().toISOString()
  });
});

// Analyze image route - returns ML prediction without creating complaint
router.post('/analyze-image', 
  authenticateToken,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Photo is required for analysis' });
      }

      const { description } = req.body;
      const { callMLAPI } = require('../utils/mlIntegration');

      console.log('Analyzing image:', {
        filename: req.file.originalname,
        path: req.file.path,
        description: description || 'No description provided'
      });

      const mlResults = await callMLAPI(req.file.path, description);
      
      if (!mlResults) {
        throw new Error('ML service returned empty response');
      }

      res.json({
        success: true,
        results: mlResults,
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          path: req.file.path
        }
      });

    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to analyze image',
        success: false 
      });
    }
  }
);


// Department complaints (admin/staff)
router.get('/department/:dept', authenticateToken, requireAdmin, complaintsController.getComplaintsByDepartment);

router.get('/all-by-department', authenticateToken, requireAdmin, complaintsController.getAllComplaintsByDepartment);
// Submit complaint (any authenticated user)
router.post(
  '/',
  authenticateToken, // Only requires authentication, not admin role
  upload.single('photo'),
  [
    body('description').trim().optional(),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('email').isEmail().withMessage('Valid email address is required')
  ],
  (req, res, next) => {
    // Add user's email if not provided
    if (!req.body.email && req.user && req.user.email) {
      req.body.email = req.user.email;
    }
    next();
  },
  complaintsController.submitComplaint
);

// My complaints
router.get('/my-complaints', authenticateToken, complaintsController.getMyComplaints);

// Get complaint by id
router.get('/:id', authenticateToken, complaintsController.getComplaintById);

// Update complaint status
router.patch('/:id/status', authenticateToken, complaintsController.updateComplaintStatus);

// Delete complaint
router.delete('/:id', authenticateToken, complaintsController.deleteComplaint);

// Mark complaint as noted (admin/staff only)
router.patch('/:id/mark-noted', 
  authenticateToken, 
  (req, res, next) => {
    // Additional validation middleware
    if (!req.params.id) {
      return res.status(400).json({ error: 'Complaint ID is required' });
    }
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  },
  complaintsController.markComplaintAsNoted
);

// Get complaint details (admin/staff only)
router.get('/:id/details', authenticateToken, complaintsController.getComplaintDetails);

// TEST PREDICTION - Diagnostic endpoint
router.post(
  '/test-prediction',
  upload.single('photo'),
  complaintsController.testPrediction
);

// TEST EMAIL - Test email validation and sending
router.post('/test-email', authenticateToken, complaintsController.testEmail);

// Clear all complaints (admin only)
router.delete('/admin/clear-all', 
  authenticateToken, 
  requireAdmin, 
  complaintsController.clearAllComplaints
);

module.exports = router;