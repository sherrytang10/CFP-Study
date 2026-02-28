# Setup Windows Scheduled Task: Daily book recommendation at 8:30 AM
# Run this script with Administrator privileges

$taskName = "DailyBookRecommend"
$repoDir = "d:\code\AISkills\CFP-Study"
$scriptPath = "$repoDir\scripts\daily-recommend.sh"

# Check if claude CLI is available
$claudePath = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudePath) {
    Write-Host "[Error] claude CLI not found. Please install Claude Code first." -ForegroundColor Red
    exit 1
}

# Remove existing task if present
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Task already exists, updating..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create scheduled task
$trigger = New-ScheduledTaskTrigger -Daily -At 8:30AM
$action = New-ScheduledTaskAction `
    -Execute "bash" `
    -Argument $scriptPath `
    -WorkingDirectory $repoDir

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Daily book recommendation via Claude at 8:30 AM"

Write-Host ""
Write-Host "Done! Scheduled task created successfully." -ForegroundColor Green
Write-Host "  Task name : $taskName"
Write-Host "  Schedule  : Daily at 8:30 AM"
Write-Host "  Output    : $repoDir\recommendations\today.md"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "  View   : Get-ScheduledTask -TaskName $taskName"
Write-Host "  Run now: Start-ScheduledTask -TaskName $taskName"
Write-Host "  Remove : Unregister-ScheduledTask -TaskName $taskName"
