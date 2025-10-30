# PowerShell script to help configure Gmail authentication for CitiFix
# Run this script to get step-by-step guidance for email setup

param(
    [string]$Method = "menu",
    [switch]$TestEmail,
    [string]$EmailToTest = ""
)

Write-Host "🔐 CitiFix Email Authentication Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

function Show-Menu {
    Write-Host "Choose your email authentication method:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. OAuth2 Authentication (Recommended - Most Secure)" -ForegroundColor Green
    Write-Host "   ✅ No password storage needed"
    Write-Host "   ✅ Automatic token refresh"
    Write-Host "   ✅ Revocable access"
    Write-Host "   ⚠️  Requires Google Cloud setup"
    Write-Host ""
    Write-Host "2. App Password (Simple - Good for Development)" -ForegroundColor Yellow
    Write-Host "   ✅ Easy to set up"
    Write-Host "   ✅ Works immediately"
    Write-Host "   ⚠️  Less secure"
    Write-Host "   ⚠️  Requires 2FA enabled"
    Write-Host ""
    Write-Host "3. Test Email Validation" -ForegroundColor Cyan
    Write-Host "4. Exit" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-4)"
    return $choice
}

function Setup-OAuth2 {
    Write-Host ""
    Write-Host "🛠️ OAuth2 Setup Instructions" -ForegroundColor Green
    Write-Host "==============================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 1: Google Cloud Console Setup" -ForegroundColor Yellow
    Write-Host "1. Go to https://console.cloud.google.com/"
    Write-Host "2. Create a new project or select existing one"
    Write-Host "3. Enable Gmail API:"
    Write-Host "   - Go to 'APIs & Services' > 'Library'"
    Write-Host "   - Search for 'Gmail API'"
    Write-Host "   - Click 'Enable'"
    Write-Host ""
    
    Write-Host "Step 2: Create OAuth2 Credentials" -ForegroundColor Yellow
    Write-Host "1. Go to 'APIs & Services' > 'Credentials'"
    Write-Host "2. Click 'Create Credentials' > 'OAuth 2.0 Client IDs'"
    Write-Host "3. If prompted, configure OAuth consent screen first"
    Write-Host "4. Choose 'Desktop application' as application type"
    Write-Host "5. Give it a name (e.g., 'CitiFix Email Service')"
    Write-Host "6. Copy the Client ID and Client Secret"
    Write-Host ""
    
    $clientId = Read-Host "Enter your Client ID"
    $clientSecret = Read-Host "Enter your Client Secret" -AsSecureString
    $clientSecretText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret))
    
    Write-Host ""
    Write-Host "Step 3: Generate Refresh Token" -ForegroundColor Yellow
    Write-Host "Now we'll run the OAuth2 setup script..."
    
    # Run the Node.js OAuth2 setup script
    $scriptPath = Join-Path $PSScriptRoot "setup-gmail-oauth.js"
    if (Test-Path $scriptPath) {
        node $scriptPath $clientId $clientSecretText
    } else {
        Write-Host "❌ OAuth2 setup script not found. Please run: node setup-gmail-oauth.js" -ForegroundColor Red
    }
}

function Setup-AppPassword {
    Write-Host ""
    Write-Host "🔑 App Password Setup Instructions" -ForegroundColor Yellow
    Write-Host "===================================" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Step 1: Enable 2-Factor Authentication" -ForegroundColor Green
    Write-Host "1. Go to your Google Account settings"
    Write-Host "2. Navigate to Security > 2-Step Verification"
    Write-Host "3. Follow the prompts to enable 2FA"
    Write-Host ""
    
    Write-Host "Step 2: Generate App Password" -ForegroundColor Green
    Write-Host "1. In Google Account settings, go to Security"
    Write-Host "2. Find 'App passwords' (you may need to search)"
    Write-Host "3. Select 'Mail' from the app dropdown"
    Write-Host "4. Select 'Other' for device and enter 'CitiFix'"
    Write-Host "5. Copy the 16-digit password"
    Write-Host ""
    
    $email = Read-Host "Enter your Gmail address"
    $appPassword = Read-Host "Enter your 16-digit app password" -AsSecureString
    $appPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword))
    
    Write-Host ""
    Write-Host "✅ Add these to your .env file:" -ForegroundColor Green
    Write-Host "EMAIL_USER=$email"
    Write-Host "EMAIL_PASS=$appPasswordText"
    Write-Host ""
    Write-Host "⚠️  Keep your .env file secure and never commit it to version control!" -ForegroundColor Red
}

function Test-EmailValidation {
    Write-Host ""
    Write-Host "🧪 Email Validation Test" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not $EmailToTest) {
        $EmailToTest = Read-Host "Enter email address to test"
    }
    
    Write-Host "Testing email: $EmailToTest" -ForegroundColor Yellow
    
    # Run the email validation test script
    $testScript = Join-Path $PSScriptRoot "test-email-validation.js"
    if (Test-Path $testScript) {
        node $testScript $EmailToTest
    } else {
        Write-Host "❌ Email validation test script not found" -ForegroundColor Red
    }
}

function Show-EnvExample {
    Write-Host ""
    Write-Host "📄 Example .env Configuration" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    
    $envExample = Join-Path $PSScriptRoot ".env.example"
    if (Test-Path $envExample) {
        Write-Host "Here's your .env.example file:" -ForegroundColor Green
        Get-Content $envExample | Write-Host
    } else {
        Write-Host "❌ .env.example file not found" -ForegroundColor Red
    }
}

# Main script logic
if ($TestEmail) {
    Test-EmailValidation
    exit
}

if ($Method -ne "menu") {
    switch ($Method.ToLower()) {
        "oauth2" { Setup-OAuth2 }
        "apppassword" { Setup-AppPassword }
        "test" { Test-EmailValidation }
        default { 
            Write-Host "❌ Invalid method. Use: oauth2, apppassword, or test" -ForegroundColor Red
            exit 1
        }
    }
    exit
}

# Interactive menu
do {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" { Setup-OAuth2 }
        "2" { Setup-AppPassword }
        "3" { Test-EmailValidation }
        "4" { 
            Write-Host "👋 Goodbye!" -ForegroundColor Green
            exit 
        }
        default { 
            Write-Host "❌ Invalid choice. Please enter 1-4." -ForegroundColor Red 
        }
    }
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Clear-Host
    
} while ($true)