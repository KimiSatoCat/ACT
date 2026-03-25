# ACT App - .env.local generator
# Usage: powershell -ExecutionPolicy Bypass -File setup-env.ps1

$lines = @(
    "# Firebase",
    "EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB58bzZzB9W93Cu_8Z3JMOONJAS8JKePhI",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=act-e4a47.firebaseapp.com",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID=act-e4a47",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=act-e4a47.firebasestorage.app",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=147479199552",
    "EXPO_PUBLIC_FIREBASE_APP_ID=1:147479199552:web:2b32552e457f376c2c04a5",
    "",
    "# Google Sign-In",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=147479199552-71bkn4nd7tsm7ugsfo4qekjv3mnfh1in.apps.googleusercontent.com",
    "",
    "# Anthropic Claude API - replace the value below with your key",
    "# Get your key at: https://console.anthropic.com/settings/keys",
    "EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-ENTER_YOUR_KEY_HERE"
)

$envContent = $lines -join "`n"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env.local"), $envContent, [System.Text.Encoding]::UTF8)

Write-Host ".env.local created successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open .env.local in Notepad"
Write-Host "  2. Replace 'sk-ant-ENTER_YOUR_KEY_HERE' with your Anthropic API key"
Write-Host "     Get it at: https://console.anthropic.com/settings/keys"
Write-Host "  3. Run: npm start"
Write-Host ""
Read-Host "Press Enter to exit"
