# Setup Windows Scheduled Task: Supplement book recommendations nightly
# Run this script with Administrator privileges
#
# Schedule: Daily at 21:30, 10 files per batch
# ETA: ~14 nights to clear 134 backlog files
# Log: recommendations/supplement.log

$taskName = "BookSupplement"
$repoDir = "d:\code\AISkills\CFP-Study"
$scriptPath = "$repoDir\scripts\nightly-supplement.sh"

# Check if claude CLI is available
$claudePath = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudePath) {
    Write-Host "[Error] claude CLI not found. Please install Claude Code first." -ForegroundColor Red
    exit 1
}

# Remove existing task if present
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task: $taskName" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create trigger: daily at 21:30
$trigger = New-ScheduledTaskTrigger -Daily -At "21:30"

# Find bash.exe (Git Bash)
$bashPath = "C:\Program Files\Git\usr\bin\bash.exe"
if (-not (Test-Path $bashPath)) {
    $bashPath = (Get-Command bash -ErrorAction SilentlyContinue).Source
}
if (-not $bashPath) {
    Write-Host "[Error] bash not found. Please install Git for Windows." -ForegroundColor Red
    exit 1
}

$action = New-ScheduledTaskAction `
    -Execute $bashPath `
    -Argument $scriptPath `
    -WorkingDirectory $repoDir

# 执行时限 10 小时（21:30 ~ 07:30 足够 10 个文件）
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 10)

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Supplement book recommendations nightly at 21:30 (10 files/batch, ~14 nights total)"

Write-Host ""
Write-Host "Task created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Task name : $taskName" -ForegroundColor Cyan
Write-Host "  Schedule  : Daily at 21:30"
Write-Host "  Batch size: 10 files per night"
Write-Host "  Backlog   : 134 files"
Write-Host "  ETA       : ~14 nights (complete by $(Get-Date (Get-Date).AddDays(14) -Format 'yyyy-MM-dd'))"
Write-Host "  Log       : $repoDir\recommendations\supplement.log"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "  View status : Get-ScheduledTask -TaskName $taskName"
Write-Host "  Run now     : Start-ScheduledTask -TaskName $taskName"
Write-Host "  Stop        : Stop-ScheduledTask -TaskName $taskName"
Write-Host "  Remove      : Unregister-ScheduledTask -TaskName $taskName"
Write-Host "  View log    : Get-Content $repoDir\recommendations\supplement.log -Tail 50"
