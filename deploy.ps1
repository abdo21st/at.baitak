# PowerShell Deployment Script for HodoorK System (i:\at) -> GitHub -> Coolify (at.ordermt.ly)

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  HodoorK Attendance & Hours Tracker - Coolify & GitHub Deployment Helper" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Initialize Git Repo
git init
git add .
git commit -m "Deploying HodoorK Smart Attendance System to Coolify (at.ordermt.ly)"

Write-Host "`n[+] Git repository initialized and committed locally." -ForegroundColor Green
Write-Host "To link your GitHub repository and automatically trigger Coolify build:" -ForegroundColor Yellow
Write-Host "  1. Create a repository on GitHub (e.g. hodoork-attendance)" -ForegroundColor White
Write-Host "  2. Run: git remote add origin https://github.com/<YOUR_USERNAME>/hodoork-attendance.git" -ForegroundColor White
Write-Host "  3. Run: git branch -M main" -ForegroundColor White
Write-Host "  4. Run: git push -u origin main" -ForegroundColor White
Write-Host "`n[+] Once pushed, Coolify on server 102.203.201.52 will build and launch at https://at.ordermt.ly!" -ForegroundColor Green
