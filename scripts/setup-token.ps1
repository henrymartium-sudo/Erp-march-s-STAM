#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script d'aide pour configurer le VERCEL_TOKEN sur Windows

.DESCRIPTION
    Ce script guide l'utilisateur pour créer et exporter son token Vercel
    de manière sécurisée.

.EXAMPLE
    .\scripts\setup-token.ps1
#>

# Couleurs
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet('Black','DarkBlue','DarkGreen','DarkCyan','DarkRed','DarkMagenta','DarkYellow','Gray','DarkGray','Blue','Green','Cyan','Red','Magenta','Yellow','White')]
        [string]$ForegroundColor = 'White'
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# En-tête
Write-Host ""
Write-ColorOutput "============================================================" -ForegroundColor Cyan
Write-ColorOutput "🔐 CONFIGURATION VERCEL TOKEN - ERP MARCHÉS STAM" -ForegroundColor Cyan
Write-ColorOutput "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le token existe déjà
if ($env:VERCEL_TOKEN) {
    Write-ColorOutput "✅ Un token Vercel est déjà configuré dans ce terminal" -ForegroundColor Green
    $masked = $env:VERCEL_TOKEN.Substring(0, 4) + "***" + $env:VERCEL_TOKEN.Substring($env:VERCEL_TOKEN.Length - 4)
    Write-ColorOutput "   Token actuel : $masked" -ForegroundColor Gray
    Write-Host ""

    $overwrite = Read-Host "Voulez-vous le remplacer ? (o/N)"
    if ($overwrite -ne "o" -and $overwrite -ne "O") {
        Write-ColorOutput "✋ Conservation du token existant. Vous pouvez maintenant lancer :" -ForegroundColor Yellow
        Write-ColorOutput "   npm run env:sync:dry" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    }
}

# Instructions
Write-ColorOutput "📋 ÉTAPES À SUIVRE :" -ForegroundColor Yellow
Write-Host ""
Write-ColorOutput "1. Ouvrez votre navigateur sur : https://vercel.com/account/tokens" -ForegroundColor White
Write-ColorOutput "2. Cliquez sur 'Create Token'" -ForegroundColor White
Write-ColorOutput "3. Remplissez :" -ForegroundColor White
Write-ColorOutput "   • Name        : ERP-Sync-Env" -ForegroundColor Gray
Write-ColorOutput "   • Scope       : ✅ Full Account (IMPORTANT !)" -ForegroundColor Gray
Write-ColorOutput "   • Expiration  : No Expiration (ou selon vos besoins)" -ForegroundColor Gray
Write-ColorOutput "4. Cliquez sur 'Create Token'" -ForegroundColor White
Write-ColorOutput "5. Copiez le token affiché" -ForegroundColor White
Write-Host ""

# Demander le token
Write-ColorOutput "⌨️  Collez votre token Vercel ci-dessous :" -ForegroundColor Cyan
$token = Read-Host -AsSecureString

# Convertir le SecureString en texte
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
$tokenPlainText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Valider le token
if ([string]::IsNullOrWhiteSpace($tokenPlainText)) {
    Write-ColorOutput "❌ Token vide. Abandon." -ForegroundColor Red
    exit 1
}

if ($tokenPlainText.Length -lt 20) {
    Write-ColorOutput "❌ Token trop court. Vérifiez que vous avez copié le token complet." -ForegroundColor Red
    exit 1
}

# Exporter le token dans la session actuelle
$env:VERCEL_TOKEN = $tokenPlainText

# Confirmation
Write-Host ""
Write-ColorOutput "============================================================" -ForegroundColor Green
Write-ColorOutput "✅ TOKEN CONFIGURÉ AVEC SUCCÈS" -ForegroundColor Green
Write-ColorOutput "============================================================" -ForegroundColor Green
Write-Host ""

$masked = $tokenPlainText.Substring(0, 4) + "***" + $tokenPlainText.Substring($tokenPlainText.Length - 4)
Write-ColorOutput "Token : $masked" -ForegroundColor Gray
Write-Host ""

# Prochaines étapes
Write-ColorOutput "🚀 PROCHAINES ÉTAPES :" -ForegroundColor Cyan
Write-Host ""
Write-ColorOutput "1. Tester en mode simulation (recommandé) :" -ForegroundColor White
Write-ColorOutput "   npm run env:sync:dry" -ForegroundColor Cyan
Write-Host ""
Write-ColorOutput "2. Si tout est OK, appliquer les modifications :" -ForegroundColor White
Write-ColorOutput "   npm run env:sync" -ForegroundColor Cyan
Write-Host ""
Write-ColorOutput "3. Redéployer en production :" -ForegroundColor White
Write-ColorOutput "   vercel --prod" -ForegroundColor Cyan
Write-Host ""
Write-ColorOutput "OU utiliser le script combo (sync + deploy) :" -ForegroundColor White
Write-ColorOutput "   npm run env:deploy" -ForegroundColor Cyan
Write-Host ""

Write-ColorOutput "⚠️  IMPORTANT : Ce token n'est valide que dans ce terminal." -ForegroundColor Yellow
Write-ColorOutput "   Si vous fermez le terminal, vous devrez le reconfigurer." -ForegroundColor Yellow
Write-Host ""

Write-ColorOutput "💡 ASTUCE : Pour rendre le token permanent, ajoutez-le à votre profil :" -ForegroundColor Magenta
Write-ColorOutput "   echo '\$env:VERCEL_TOKEN=\"votre_token\"' >> \$PROFILE" -ForegroundColor Gray
Write-ColorOutput "   (Déconseillé pour des raisons de sécurité sur un poste partagé)" -ForegroundColor Gray
Write-Host ""
