/**
 * Gmail OAuth2 Setup Helper Script
 * Run this script to generate OAuth2 credentials for Gmail integration
 * 
 * Usage: node setup-gmail-oauth.js
 */

const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setupGmailOAuth() {
  console.log('🔐 Gmail OAuth2 Setup Helper');
  console.log('===============================\n');

  // Get credentials from user
  const clientId = await askQuestion('Enter your Gmail Client ID: ');
  const clientSecret = await askQuestion('Enter your Gmail Client Secret: ');
  
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  // Generate auth URL
  const scopes = ['https://www.googleapis.com/auth/gmail.send'];
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  console.log('\n📋 Follow these steps:');
  console.log('1. Open this URL in your browser:');
  console.log('\n' + authUrl + '\n');
  console.log('2. Complete the authorization');
  console.log('3. Copy the authorization code from the redirect URL');
  
  const authCode = await askQuestion('\n4. Enter the authorization code here: ');

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    
    console.log('\n✅ Success! Here are your OAuth2 credentials:\n');
    console.log('Add these to your .env file:');
    console.log('================================');
    console.log(`EMAIL_USER=your-gmail@gmail.com`);
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('================================\n');
    
    console.log('🎉 OAuth2 setup complete!');
    console.log('Your application can now send emails securely using OAuth2.');
    
  } catch (error) {
    console.error('❌ Error setting up OAuth2:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Make sure your Client ID and Secret are correct');
    console.log('- Ensure you copied the full authorization code');
    console.log('- Check that Gmail API is enabled in Google Cloud Console');
  }

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Instructions for getting Client ID and Secret
function showInstructions() {
  console.log('📖 Prerequisites:');
  console.log('Before running this script, you need:');
  console.log('');
  console.log('1. Gmail Client ID and Client Secret');
  console.log('   - Go to Google Cloud Console (https://console.cloud.google.com/)');
  console.log('   - Create a new project or select existing one');
  console.log('   - Enable Gmail API');
  console.log('   - Go to Credentials > Create Credentials > OAuth 2.0 Client IDs');
  console.log('   - Choose "Desktop application"');
  console.log('   - Copy the Client ID and Client Secret');
  console.log('');
  console.log('2. This script will help you get the Refresh Token');
  console.log('');
}

// Check if OAuth2 credentials are provided as arguments
if (process.argv.length > 2) {
  const [clientId, clientSecret] = process.argv.slice(2);
  if (clientId && clientSecret) {
    console.log('Using provided credentials...');
    setupGmailOAuth();
  } else {
    console.log('Usage: node setup-gmail-oauth.js [CLIENT_ID] [CLIENT_SECRET]');
    showInstructions();
  }
} else {
  showInstructions();
  setupGmailOAuth();
}