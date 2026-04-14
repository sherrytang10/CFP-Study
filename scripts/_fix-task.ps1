$taskName = "BookRecommend"
$scriptPath = "d:\code\AISkills\CFP-Study\scripts\daily-recommend.sh"
$repoDir = "d:\code\AISkills\CFP-Study"
$bashPath = "C:\Program Files\Git\usr\bin\bash.exe"

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$trigger = New-ScheduledTaskTrigger -Daily -At "21:30"
$trigger.Repetition = New-CimInstance -ClassName MSFT_TaskRepetitionPattern `
    -Namespace Root/Microsoft/Windows/TaskScheduler -ClientOnly `
    -Property @{ Interval = "PT1H"; Duration = "PT12H30M" }

$action = New-ScheduledTaskAction `
    -Execute $bashPath `
    -Argument "--login $scriptPath" `
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
    -Description "Book recommendation hourly from 21:30 to 05:00 via Claude CLI"

Write-Host "Task registered. Starting now..."
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 5
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object LastRunTime, LastTaskResult, NextRunTime | Format-List
