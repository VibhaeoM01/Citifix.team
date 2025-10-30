const emailValidator = require('email-validator');
const dns = require('dns-lookup-promise');
const axios = require('axios');

/**
 * Comprehensive Email Validation Service
 * Validates emails through multiple layers:
 * 1. Format validation
 * 2. Domain validation
 * 3. MX record verification
 * 4. Disposable email detection
 * 5. Real-time verification (optional)
 */

// List of common disposable email domains to block
const disposableEmailDomains = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 
  'tempmail.org', 'throwaway.email', 'temp-mail.org',
  'fakemailgenerator.com', 'dispostable.com', 'yopmail.com',
  'getairmail.com', 'sharklasers.com', 'trash-mail.com'
];

// Trusted email providers (whitelist)
const trustedEmailProviders = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
  'live.com', 'icloud.com', 'protonmail.com', 'aol.com',
  'zoho.com', 'yandex.com', 'mail.com'
];

/**
 * Basic email format validation
 */
const isValidEmailFormat = (email) => {
  if (!email || typeof email !== 'string') return false;
  return emailValidator.validate(email);
};

/**
 * Check if email domain is in disposable email list
 */
const isDisposableEmail = (email) => {
  const domain = email.toLowerCase().split('@')[1];
  return disposableEmailDomains.includes(domain);
};

/**
 * Check if email is from a trusted provider
 */
const isTrustedProvider = (email) => {
  const domain = email.toLowerCase().split('@')[1];
  return trustedEmailProviders.includes(domain);
};

/**
 * Verify domain has valid MX records
 */
const verifyDomainMX = async (email) => {
  try {
    const domain = email.split('@')[1];
    const mxRecords = await dns.lookupMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.log(`MX verification failed for domain: ${email.split('@')[1]}`);
    return false;
  }
};

/**
 * Advanced email verification using external service (optional)
 * You can use services like Hunter.io, ZeroBounce, or EmailJS
 */
const verifyEmailWithService = async (email) => {
  try {
    // Example using a hypothetical email verification service
    // Replace with actual service if you have an API key
    
    // For demonstration, we'll simulate verification
    // In production, use a real email verification service
    
    const domain = email.split('@')[1];
    
    // Simulate API call to verification service
    // const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
    //   params: {
    //     email: email,
    //     api_key: process.env.HUNTER_API_KEY
    //   }
    // });
    
    // For now, return true for trusted providers
    return isTrustedProvider(email);
  } catch (error) {
    console.error('Email verification service error:', error);
    return null; // Unknown status
  }
};

/**
 * Comprehensive email validation
 */
const validateEmail = async (email, options = {}) => {
  const {
    checkMX = true,
    checkDisposable = true,
    requireTrusted = false,
    useVerificationService = false
  } = options;

  const result = {
    email: email,
    isValid: false,
    reasons: [],
    confidence: 0,
    details: {}
  };

  // 1. Basic format validation
  if (!isValidEmailFormat(email)) {
    result.reasons.push('Invalid email format');
    return result;
  }

  result.details.formatValid = true;
  result.confidence += 20;

  // 2. Check for disposable email
  if (checkDisposable && isDisposableEmail(email)) {
    result.reasons.push('Disposable email address not allowed');
    result.details.isDisposable = true;
    return result;
  }

  result.details.isDisposable = false;
  result.confidence += 20;

  // 3. Check if from trusted provider
  const fromTrustedProvider = isTrustedProvider(email);
  result.details.isTrustedProvider = fromTrustedProvider;
  
  if (fromTrustedProvider) {
    result.confidence += 30;
  } else if (requireTrusted) {
    result.reasons.push('Email must be from a trusted provider (Gmail, Yahoo, Outlook, etc.)');
    return result;
  }

  // 4. MX record verification
  if (checkMX) {
    try {
      const hasMXRecord = await verifyDomainMX(email);
      result.details.hasMXRecord = hasMXRecord;
      
      if (hasMXRecord) {
        result.confidence += 20;
      } else {
        // For trusted providers, don't fail validation due to MX lookup issues
        if (fromTrustedProvider) {
          result.confidence += 10; // Still add some confidence for trusted providers
          result.details.mxSkippedForTrustedProvider = true;
        } else {
          result.reasons.push('Domain has no valid MX records');
          result.confidence -= 10;
        }
      }
    } catch (error) {
      result.details.mxCheckError = error.message;
      // Don't fail validation for MX lookup errors on trusted providers
      if (fromTrustedProvider) {
        result.confidence += 10;
        result.details.mxSkippedForTrustedProvider = true;
      }
    }
  }

  // 5. External verification service (optional)
  if (useVerificationService) {
    try {
      const serviceVerification = await verifyEmailWithService(email);
      result.details.serviceVerification = serviceVerification;
      
      if (serviceVerification === true) {
        result.confidence += 10;
      } else if (serviceVerification === false) {
        result.reasons.push('Email verification service reports invalid email');
        result.confidence -= 20;
      }
    } catch (error) {
      result.details.serviceError = error.message;
    }
  }

  // Final validation decision
  if (result.confidence >= 40 && result.reasons.length === 0) {
    result.isValid = true;
  } else if (result.reasons.length === 0 && result.confidence >= 20) {
    result.isValid = true;
    result.reasons.push('Email passed basic validation but with lower confidence');
  }

  return result;
};

/**
 * Quick validation for real-time form validation
 */
const quickValidateEmail = async (email) => {
  // Fast validation for UI feedback
  if (!isValidEmailFormat(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }

  if (isDisposableEmail(email)) {
    return { isValid: false, message: 'Temporary email addresses are not allowed' };
  }

  return { isValid: true, message: 'Email format is valid' };
};

/**
 * Validate email specifically for Gmail
 */
const validateGmailAddress = async (email) => {
  const validation = await validateEmail(email, {
    checkMX: true,
    checkDisposable: true,
    requireTrusted: false
  });

  // Additional Gmail-specific checks
  const domain = email.toLowerCase().split('@')[1];
  
  if (domain === 'gmail.com') {
    validation.details.isGmail = true;
    validation.confidence += 10;
    
    // Gmail allows dots in username, check for valid gmail format
    const username = email.split('@')[0];
    if (username.length < 6 || username.length > 64) {
      validation.reasons.push('Gmail username should be 6-64 characters');
      validation.isValid = false;
    }
  } else {
    validation.details.isGmail = false;
  }

  return validation;
};

/**
 * Batch email validation
 */
const validateEmails = async (emails, options = {}) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await validateEmail(email, options);
      results.push(result);
    } catch (error) {
      results.push({
        email,
        isValid: false,
        reasons: [`Validation error: ${error.message}`],
        confidence: 0
      });
    }
  }
  
  return results;
};

module.exports = {
  validateEmail,
  quickValidateEmail,
  validateGmailAddress,
  validateEmails,
  isValidEmailFormat,
  isDisposableEmail,
  isTrustedProvider,
  verifyDomainMX
};