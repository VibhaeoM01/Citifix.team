const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Submit contact form
// NOTE: Backend email sending has been disabled. Contact form is handled via Formspree.
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('subject').trim().isLength({ min: 5, max: 100 }).withMessage('Subject must be between 5 and 100 characters'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    // Backend email sending has been disabled. Form submissions should be handled via Formspree.
    // Return success so previous frontend callers receive a positive response if still used.
    res.json({
      message: 'Backend contact endpoint is disabled. Please use the Formspree contact form for email delivery.',
      success: true
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      message: 'Failed to send message. Please try again later.',
      success: false
    });
  }
});

module.exports = router; 