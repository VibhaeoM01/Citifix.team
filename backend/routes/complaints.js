const express = require('express');
const { body } = require('express-validator');
const upload = require('../utils/multerUpload');
const { authenticateToken } = require('../middleware/auth');
const complaintsController = require('../controller/complaints.controller');

const router = express.Router();



// Department complaints (admin/staff)
router.get('/department/:dept', authenticateToken, complaintsController.getComplaintsByDepartment);

router.get('/all-by-department', authenticateToken, complaintsController.getAllComplaintsByDepartment);
// Submit complaint
router.post(
  '/',
  authenticateToken,
  upload.single('photo'),
  [
    body('description').trim().optional(),
    body('location').trim().notEmpty().withMessage('Location is required')
  ],
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

module.exports = router;