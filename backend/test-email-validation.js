/**
 * Email Validation Test Script
 * Test the email validation system with various email addresses
 * 
 * Usage: node test-email-validation.js
 */

const { 
  validateEmail, 
  quickValidateEmail, 
  validateGmailAddress,
  isValidEmailFormat,
  isDisposableEmail,
  isTrustedProvider 
} = require('./utils/emailValidation');

// Test email addresses
const testEmails = [
  // Valid emails
  'user@gmail.com',
  'test.email@yahoo.com',
  'valid@outlook.com',
  'user123@protonmail.com',
  
  // Invalid format
  'invalid-email',
  'missing@domain',
  '@missing-username.com',
  
  // Disposable emails
  'test@10minutemail.com',
  'temp@guerrillamail.com',
  'fake@mailinator.com',
  
  // Edge cases
  'very.long.email.address.that.might.be.valid@gmail.com',
  'a@b.co',
  'user+tag@gmail.com'
];

async function runEmailValidationTests() {
  console.log('🧪 Email Validation Test Suite');
  console.log('===============================\n');

  for (const email of testEmails) {
    console.log(`📧 Testing: ${email}`);
    console.log('─────────────────────────────────');
    
    try {
      // Quick validation
      const quickResult = await quickValidateEmail(email);
      console.log(`Quick Check: ${quickResult.isValid ? '✅' : '❌'} ${quickResult.message}`);
      
      // Comprehensive validation
      const fullResult = await validateEmail(email, {
        checkMX: true,
        checkDisposable: true,
        requireTrusted: false
      });
      
      console.log(`Full Check: ${fullResult.isValid ? '✅' : '❌'} (Confidence: ${fullResult.confidence}%)`);
      
      if (fullResult.reasons.length > 0) {
        console.log(`Reasons: ${fullResult.reasons.join(', ')}`);
      }
      
      // Details
      const details = fullResult.details;
      if (details) {
        console.log('Details:');
        console.log(`  - Format Valid: ${details.formatValid ? '✅' : '❌'}`);
        console.log(`  - Disposable: ${details.isDisposable ? '❌' : '✅'}`);
        console.log(`  - Trusted Provider: ${details.isTrustedProvider ? '✅' : '⚠️'}`);
        console.log(`  - Has MX Record: ${details.hasMXRecord ? '✅' : '❌'}`);
      }
      
      // Gmail-specific test
      if (email.includes('@gmail.com')) {
        const gmailResult = await validateGmailAddress(email);
        console.log(`Gmail Check: ${gmailResult.isValid ? '✅' : '❌'} (Confidence: ${gmailResult.confidence}%)`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary statistics
  console.log('📊 Test Summary');
  console.log('================');
  
  let validCount = 0;
  let invalidCount = 0;
  let disposableCount = 0;
  let trustedCount = 0;
  
  for (const email of testEmails) {
    try {
      const result = await quickValidateEmail(email);
      if (result.isValid) validCount++;
      else invalidCount++;
      
      if (isDisposableEmail(email)) disposableCount++;
      if (isTrustedProvider(email)) trustedCount++;
    } catch (error) {
      invalidCount++;
    }
  }
  
  console.log(`Total Tested: ${testEmails.length}`);
  console.log(`Valid Format: ${validCount}`);
  console.log(`Invalid Format: ${invalidCount}`);
  console.log(`Disposable: ${disposableCount}`);
  console.log(`Trusted Providers: ${trustedCount}`);
}

// Interactive mode
async function interactiveTest() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  console.log('\n🎯 Interactive Email Validation');
  console.log('================================');
  console.log('Enter email addresses to test (type "exit" to quit)\n');

  while (true) {
    const email = await askQuestion('Enter email address: ');
    
    if (email.toLowerCase() === 'exit') {
      break;
    }
    
    if (!email) {
      continue;
    }

    console.log(`\nTesting: ${email}`);
    console.log('─'.repeat(40));
    
    try {
      const result = await validateEmail(email, {
        checkMX: true,
        checkDisposable: true,
        requireTrusted: false
      });
      
      console.log(`Result: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Confidence: ${result.confidence}%`);
      
      if (result.reasons.length > 0) {
        console.log(`Issues: ${result.reasons.join(', ')}`);
      }
      
      console.log('Details:');
      Object.entries(result.details).forEach(([key, value]) => {
        const emoji = typeof value === 'boolean' ? (value ? '✅' : '❌') : '📄';
        console.log(`  ${emoji} ${key}: ${value}`);
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }

  rl.close();
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    runEmailValidationTests().then(interactiveTest);
  } else if (args.length > 0) {
    // Test specific email from command line
    const email = args[0];
    console.log(`Testing email: ${email}\n`);
    
    validateEmail(email, {
      checkMX: true,
      checkDisposable: true,
      requireTrusted: false
    }).then(result => {
      console.log(`Result: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Confidence: ${result.confidence}%`);
      
      if (result.reasons.length > 0) {
        console.log(`Issues: ${result.reasons.join(', ')}`);
      }
      
      console.log('\nDetails:', JSON.stringify(result.details, null, 2));
    }).catch(error => {
      console.error(`Error: ${error.message}`);
    });
  } else {
    runEmailValidationTests();
  }
}