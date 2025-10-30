const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { validateEmail } = require('./emailValidation');

// OAuth2 setup for Gmail (more secure than app passwords)
const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
const createOAuth2Client = () => {
  return new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URL
  );
};

// Create Gmail transporter with app password
const createGmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing! Please check EMAIL_USER and EMAIL_PASS in .env');
    return null;
  }

  console.log('Creating Gmail transporter for:', process.env.EMAIL_USER);
  
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true, // Use pooled connections
    maxConnections: 5, // Maximum number of simultaneous connections
    maxMessages: 100, // Maximum number of messages per connection
    rateDelta: 1000, // How many milliseconds between messages
    rateLimit: 5, // Maximum number of messages per rateDelta
    timeout: 10000, // Time to wait for mail submission in ms
    debug: false, // Disable debug logs for better performance
    logger: false  // Disable built-in logger for better performance
  });
};

// Main transporter - tries OAuth2 first, falls back to app password
let transporter = null;

const initializeTransporter = async () => {
  try {
    console.log('Initializing email service...');
    console.log('Email Service:', process.env.EMAIL_SERVICE);
    console.log('Email User:', process.env.EMAIL_USER);
    
    // Create Gmail transporter
    transporter = createGmailTransporter();
    
    if (!transporter) {
      throw new Error('Failed to create email transporter');
    }

    // Verify transporter
    await transporter.verify();
    console.log('✅ Email service successfully initialized');
    return transporter;
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command
    });
    return null;
  }
};

// Initialize on startup
initializeTransporter();

// Test email configuration on startup
const testConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
  } catch (error) {
    console.error('Email service configuration error:', error.message);
    console.log('Please set EMAIL_USER and EMAIL_PASS environment variables');
  }
};

// Call test connection
testConnection();

// Email templates
const emailTemplates = {
  complaintNoted: {
    subject: 'Your Complaint Has Been Acknowledged - CitiFix',
    html: (complaintData) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .complaint-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
          .status-badge { background-color: #4CAF50; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Complaint Has Been Acknowledged</h1>
          </div>
          
          <div class="content">
            <p>Dear Citizen,</p>
            
            <p>Thank you for submitting your complaint through CitiFix. We are pleased to inform you that your complaint has been <span class="status-badge">NOTED</span> and assigned to the appropriate department for action.</p>
            
            <div class="complaint-details">
              <h3>📋 Complaint Details:</h3>
              <p><strong>Complaint ID:</strong> ${complaintData._id}</p>
              <p><strong>Category:</strong> ${complaintData.category}</p>
              <p><strong>Location:</strong> ${complaintData.location}</p>
              <p><strong>Urgency Level:</strong> ${complaintData.urgency.toUpperCase()}</p>
              <p><strong>Description:</strong> ${complaintData.description || 'Image-based complaint'}</p>
              <p><strong>Submitted On:</strong> ${new Date(complaintData.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span class="status-badge">NOTED & ASSIGNED</span></p>
            </div>
            
            <h3>🔄 What Happens Next:</h3>
            <ul>
              <li>Your complaint has been forwarded to the <strong>${complaintData.category}</strong> department</li>
              <li>Department staff will review and prioritize your complaint</li>
              <li>You will receive updates as progress is made</li>
              <li>Expected response time: 2-7 working days depending on urgency</li>
            </ul>
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need to provide additional information, please contact us:</p>
            <ul>
              <li>Email: support@citifix.com</li>
              <li>Phone: +1-800-CITIFIX</li>
              <li>Website: www.citifix.com</li>
            </ul>
            
            <p>Thank you for helping make our city better! 🏙️</p>
            
            <p>Best regards,<br>
            <strong>The CitiFix Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from CitiFix complaint management system.</p>
            <p>Please do not reply to this email. For support, contact us at support@citifix.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (complaintData) => `
      Your Complaint Has Been Acknowledged - CitiFix
      
      Dear Citizen,
      
      Thank you for submitting your complaint through CitiFix. We are pleased to inform you that your complaint has been NOTED and assigned to the appropriate department for action.
      
      Complaint Details:
      - Complaint ID: ${complaintData._id}
      - Category: ${complaintData.category}
      - Location: ${complaintData.location}
      - Urgency Level: ${complaintData.urgency.toUpperCase()}
      - Description: ${complaintData.description || 'Image-based complaint'}
      - Submitted On: ${new Date(complaintData.createdAt).toLocaleDateString()}
      - Status: NOTED & ASSIGNED
      
      What Happens Next:
      - Your complaint has been forwarded to the ${complaintData.category} department
      - Department staff will review and prioritize your complaint
      - You will receive updates as progress is made
      - Expected response time: 2-7 working days depending on urgency
      
      Need Help?
      If you have any questions or need to provide additional information, please contact us:
      - Email: support@citifix.com
      - Phone: +1-800-CITIFIX
      - Website: www.citifix.com
      
      Thank you for helping make our city better!
      
      Best regards,
      The CitiFix Team
      
      ---
      This is an automated message from CitiFix complaint management system.
      Please do not reply to this email. For support, contact us at support@citifix.com
    `
  }
};

// Send complaint acknowledgment email
const sendComplaintNotedEmail = async (complaintData) => {
  try {
    // Initialize transporter if needed (with caching)
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        throw new Error('Email service not properly configured');
      }
    }

    const template = emailTemplates.complaintNoted;
    
    // Validate email before sending
    if (!complaintData.email) {
      throw new Error('Recipient email is missing');
    }

    const mailOptions = {
      from: {
        name: 'CitiFix Support',
        address: process.env.EMAIL_USER || 'noreply@citifix.com'
      },
      to: complaintData.email,
      subject: template.subject,
      html: template.html(complaintData),
      text: template.text(complaintData)
    };
    
    console.log('Attempting to send complaint noted email to:', complaintData.email);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error occurred';
    console.error('Failed to send complaint noted email:', {
      error: errorMessage,
      stack: error.stack,
      email: complaintData?.email,
      complaintId: complaintData?._id
    });
    return {
      success: false,
      error: errorMessage,
      message: 'Failed to send email notification: ' + errorMessage
    };
  }
};

// Send general notification email
const sendNotificationEmail = async (to, subject, message, isHtml = false) => {
  try {
    const mailOptions = {
      from: {
        name: 'CitiFix Support',
        address: process.env.EMAIL_USER || 'noreply@citifix.com'
      },
      to: to,
      subject: subject,
      [isHtml ? 'html' : 'text']: message
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Notification email sent:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendComplaintNotedEmail,
  sendNotificationEmail,
  transporter
};