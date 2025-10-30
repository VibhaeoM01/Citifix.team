// Quick test for email validation debugging
const { validateEmail } = require('./backend/utils/emailValidation');

async function testEmailValidation() {
  const testEmail = 'vibhaeo1105@gmail.com';
  
  console.log('Testing email validation for:', testEmail);
  
  try {
    // Test with MX checking disabled (same as complaint form)
    const result = await validateEmail(testEmail, {
      checkMX: false,
      checkDisposable: true,
      requireTrusted: false,
      useVerificationService: false
    });
    
    console.log('Validation Result:', JSON.stringify(result, null, 2));
    
    if (!result.isValid) {
      console.log('❌ Email failed validation');
      console.log('Reasons:', result.reasons);
    } else {
      console.log('✅ Email passed validation');
    }
    
    // Also test with MX checking enabled to see the difference
    console.log('\n--- Testing WITH MX checking ---');
    const resultWithMX = await validateEmail(testEmail, {
      checkMX: true,
      checkDisposable: true,
      requireTrusted: false,
      useVerificationService: false
    });
    
    console.log('Validation Result (with MX):', JSON.stringify(resultWithMX, null, 2));
    
  } catch (error) {
    console.error('Error during validation:', error);
  }
}

testEmailValidation();