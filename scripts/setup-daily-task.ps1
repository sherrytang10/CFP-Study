# Setup Windows Scheduled Task: Book recommendation hourly (21:00 ~ 09:30)
# Run this script with Administrator privileges

$taskName = "BookRecommend"
$repoDir = "d:\code\AISkills\CFP-Study"
$scriptPath = "$repoDir\scripts\daily-recommend.sh"

# Check if claude CLI is available
$claudePath = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudePath) {
    Write-Host "[Error] claude CLI not found. Please install Claude Code first." -ForegroundColor Red
    exit 1
}

# Remove existing tasks if present
foreach ($name in @("DailyBookRecommend", $taskName)) {
    $existingTask = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task: $name" -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
}

# Create scheduled task: every hour from 21:00 to 09:30 next day
$trigger = New-ScheduledTaskTrigger -Daily -At "21:00"
$trigger.Repetition = New-CimInstance -ClassName MSFT_TaskRepetitionPattern `
    -Namespace Root/Microsoft/Windows/TaskScheduler -ClientOnly `
    -Property @{ Interval = "PT1H"; Duration = "PT12H30M" }

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

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Book recommendation hourly from 21:00 to 09:30 via Claude CLI"

Write-Host ""
Write-Host "Done! Scheduled task created successfully." -ForegroundColor Green
Write-Host "  Task name : $taskName"
Write-Host "  Schedule  : Every hour, 21:00 ~ 09:30"
Write-Host "  Output    : $repoDir\recommendations\<book-name>.md"
Write-Host "  Log       : $repoDir\recommendations\recommend.log"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "  View    : Get-ScheduledTask -TaskName $taskName"
Write-Host "  Run now : Start-ScheduledTask -TaskName $taskName"
Write-Host "  Stop    : Stop-ScheduledTask -TaskName $taskName"
Write-Host "  Remove  : Unregister-ScheduledTask -TaskName $taskName"
