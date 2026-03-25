# ACT App — .env.local 自動生成スクリプト (PowerShell)
# 使い方: このファイルがあるフォルダで右クリック → PowerShell で実行

$envContent = @"
# ── Firebase ──────────────────────────────────────────────────
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB58bzZzB9W93Cu_8Z3JMOONJAS8JKePhI
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=act-e4a47.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=act-e4a47
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=act-e4a47.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=147479199552
EXPO_PUBLIC_FIREBASE_APP_ID=1:147479199552:web:2b32552e457f376c2c04a5

# ── Google Sign-In ────────────────────────────────────────────
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=147479199552-71bkn4nd7tsm7ugsfo4qekjv3mnfh1in.apps.googleusercontent.com

# ── Anthropic Claude API ──────────────────────────────────────
# 以下の sk-ant-... の部分をあなたの API キーに書き換えてください
# 取得先: https://console.anthropic.com/settings/keys
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-ここにAPIキーを入力
"@

$envContent | Out-File -FilePath ".env.local" -Encoding utf8 -NoNewline
Write-Host ".env.local を作成しました。" -ForegroundColor Green
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "1. .env.local をメモ帳で開く"
Write-Host "2. 'ここにAPIキーを入力' の部分を Anthropic API キーに書き換える"
Write-Host "   取得先: https://console.anthropic.com/settings/keys"
Write-Host "3. npm start でアプリを起動"
Write-Host ""
Read-Host "Enterキーを押して終了"
