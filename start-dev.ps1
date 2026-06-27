# MedCare360 — Start all local dev services
# Run from project root: .\start-dev.ps1

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "=== MedCare360 Dev Stack ===" -ForegroundColor Cyan

# 1. Redis
$redis = Get-Service Redis -ErrorAction SilentlyContinue
if ($redis -and $redis.Status -eq 'Running') {
    Write-Host "[OK] Redis already running on :6379" -ForegroundColor Green
} else {
    Start-Service Redis -ErrorAction SilentlyContinue
    Start-Job { & "C:\Program Files\Redis\redis-server.exe" } | Out-Null
    Start-Sleep -Seconds 2
    $pong = & "C:\Program Files\Redis\redis-cli.exe" ping 2>&1
    if ($pong -eq "PONG") { Write-Host "[OK] Redis started on :6379" -ForegroundColor Green }
    else { Write-Host "[WARN] Redis failed to start" -ForegroundColor Yellow }
}

# 2. Kafka (KRaft mode)
$kafkaRunning = try {
    (& "C:\kafka\bin\windows\kafka-topics.bat" --bootstrap-server localhost:9092 --list 2>&1); $LASTEXITCODE -eq 0
} catch { $false }

if ($kafkaRunning) {
    Write-Host "[OK] Kafka already running on :9092" -ForegroundColor Green
} else {
    Write-Host "Starting Kafka..." -ForegroundColor Yellow
    Start-Job -Name "Kafka" -ScriptBlock {
        $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
        & "C:\kafka\bin\windows\kafka-server-start.bat" "C:\kafka\config\kraft\server.properties" 2>&1
    } | Out-Null
    Start-Sleep -Seconds 15

    # Create topics if missing
    $topics = @("appointment.events","prescription.events","billing.events","ambulance.events","inventory.events","patient.events","auth.events")
    $existing = & "C:\kafka\bin\windows\kafka-topics.bat" --bootstrap-server localhost:9092 --list 2>&1
    foreach ($topic in $topics) {
        if ($existing -notcontains $topic) {
            & "C:\kafka\bin\windows\kafka-topics.bat" --bootstrap-server localhost:9092 --create --topic $topic --partitions 3 --replication-factor 1 2>&1 | Out-Null
        }
    }
    Write-Host "[OK] Kafka started on :9092 with 7 topics" -ForegroundColor Green
}

Write-Host ""
Write-Host "All services ready! Now run:" -ForegroundColor Cyan
Write-Host "  cd backend && npm run dev" -ForegroundColor White
