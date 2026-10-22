<#
  Life OS dev launcher - runs the Flask backend and the Vite frontend together
  in the CURRENT terminal (no extra windows). Press Ctrl+C once to stop both.

  Normally started through dev.bat in the project root.
  First run on a new computer also creates backend\venv and installs the
  Python and npm dependencies for you.
#>

$Root     = Split-Path -Parent $PSScriptRoot
$Backend  = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$VenvDir  = Join-Path $Backend 'venv'
$VenvPy   = Join-Path $VenvDir 'Scripts\python.exe'
$ViteJs   = Join-Path $Frontend 'node_modules\vite\bin\vite.js'
$ApiPort  = 5000
$WebPort  = 5173
$SharedBranch = 'production'   # the Neon branch that holds the team's shared accounts and data
$FailCode = 10   # dev.bat pauses on this code so the message stays readable

$Api = $null
$Web = $null

function Write-Step([string]$Text) { Write-Host "[life-os] $Text" -ForegroundColor Cyan }
function Write-Warn([string]$Text) { Write-Host "[life-os] $Text" -ForegroundColor Yellow }
function Fail([string]$Text) {
    Write-Host "[life-os] ERROR: $Text" -ForegroundColor Red
    exit $FailCode
}

function Get-PortListener([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction SilentlyContinue
    return [pscustomobject]@{ Pid = $conn.OwningProcess; Command = $proc.CommandLine }
}

function Test-VenvRuns {
    if (-not (Test-Path $VenvPy)) { return $false }
    & $VenvPy -c "pass" 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Find-SystemPython {
    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($launcher) { return @{ File = $launcher.Source; Args = @('-3') } }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.Source -notlike '*\WindowsApps\*' } | Select-Object -First 1
    if ($python) { return @{ File = $python.Source; Args = @() } }
    return $null
}

# Which database will the backend use? Returns Kind (sqlite|postgres), Branch (Neon
# branch name from .env.local, if any) and a password-free description.
function Get-DatabaseInfo {
    Push-Location $Backend
    try {
        $out = & $VenvPy -c "import os; from config import database_url, describe_database; u = database_url(); print(('sqlite' if u.startswith('sqlite') else 'postgres') + '|' + os.environ.get('NEON_BRANCH', '') + '|' + describe_database(u))" 2>$null
        $code = $LASTEXITCODE
    } finally { Pop-Location }
    if ($code -ne 0 -or -not $out) { return $null }
    $parts = (@($out)[0]) -split '\|', 3
    if ($parts.Count -lt 3) { return $null }
    return [pscustomobject]@{ Kind = $parts[0]; Branch = $parts[1]; Text = $parts[2] }
}

function Write-DatabaseBanner($Db) {
    if (-not $Db) { return }
    if ($Db.Kind -eq 'sqlite') {
        Write-Host '    DB    LOCAL SQLite file - this is NOT the shared Neon database' -ForegroundColor Yellow
        Write-Host '          Accounts and data you create here stay on THIS computer only.' -ForegroundColor Yellow
        Write-Host '          To use the shared database, see README > Database (needs a Neon invite).' -ForegroundColor Yellow
    } elseif ($Db.Branch -and $Db.Branch -ne $SharedBranch) {
        Write-Host "    DB    Neon branch '$($Db.Branch)' - a private copy, NOT the shared '$SharedBranch' data" -ForegroundColor Yellow
        Write-Host "          Accounts created here will not appear for the rest of the team." -ForegroundColor Yellow
        Write-Host "          To use the shared data run:  neon checkout $SharedBranch" -ForegroundColor Yellow
    } else {
        Write-Host "    DB    $($Db.Text)" -ForegroundColor Green
        Write-Host '          Shared database: accounts and data are stored in Neon for the whole team.' -ForegroundColor Green
    }
}

function Stop-Servers {
    # Kill each server's whole process tree (Flask's reloader spawns a child)
    foreach ($proc in @($Web, $Api)) {
        if ($proc -and -not $proc.HasExited) { & taskkill.exe /PID $proc.Id /T /F *> $null }
    }
    # Safety net: anything still bound to our ports. They were free when we
    # started, so whatever listens now belongs to this run.
    foreach ($port in @($WebPort, $ApiPort)) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { & taskkill.exe /PID $_.OwningProcess /T /F *> $null }
    }
}

# --- 1. Backend: virtual environment + Python packages -----------------------
if (-not (Test-VenvRuns)) {
    $sys = Find-SystemPython
    if (-not $sys) {
        Fail 'Python 3 was not found. Install it from https://www.python.org/downloads/ (tick "Add python.exe to PATH") and run dev.bat again.'
    }
    Write-Step 'Creating the backend virtual environment (first run only)...'
    & $sys.File @($sys.Args) -m venv --clear $VenvDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-VenvRuns)) { Fail 'Could not create backend\venv.' }
}
# Install again whenever requirements.txt changed since the last successful install, for
# example after a `git pull` that brought in a new library. A fingerprint of the file is
# remembered inside the venv.
$ReqFile = Join-Path $Backend 'requirements.txt'
$ReqMark = Join-Path $VenvDir '.requirements.sha256'
$ReqHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ReqFile).Hash
$ReqChanged = (-not (Test-Path $ReqMark)) -or ((Get-Content -LiteralPath $ReqMark -Raw).Trim() -ne $ReqHash)
& $VenvPy -c "import flask, flask_sqlalchemy, flask_cors, psycopg, dotenv" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0 -or $ReqChanged) {
    Write-Step 'Installing backend dependencies (first run, or requirements.txt changed)...'
    & $VenvPy -m pip install --disable-pip-version-check -r $ReqFile
    if ($LASTEXITCODE -ne 0) { Fail 'pip install failed. See the messages above.' }
    Set-Content -LiteralPath $ReqMark -Value $ReqHash
}

# --- 2. Frontend: Node + npm packages ----------------------------------------
$Node = Get-Command node.exe -ErrorAction SilentlyContinue
$Npm  = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $Node -or -not $Npm) {
    Fail 'Node.js was not found. Install it from https://nodejs.org and run dev.bat again.'
}
# Same idea for npm: install again when package-lock.json changed since the last successful
# install (a teammate added a library, then you ran `git pull`). Without this, Vite fails
# with "Failed to resolve import ..." until someone remembers to run `npm install`.
$LockFile = Join-Path $Frontend 'package-lock.json'
if (-not (Test-Path $LockFile)) { $LockFile = Join-Path $Frontend 'package.json' }
$NpmMark = Join-Path $Frontend 'node_modules\.lifeos-install.sha256'
$NpmChanged = (-not (Test-Path $ViteJs)) -or (-not (Test-Path $NpmMark)) -or
    ((Get-Content -LiteralPath $NpmMark -Raw).Trim() -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $LockFile).Hash)
if ($NpmChanged) {
    Write-Step 'Installing frontend dependencies (first run, or package.json changed)...'
    Push-Location $Frontend
    try { & $Npm.Source install } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ViteJs)) { Fail 'npm install failed. See the messages above.' }
    # Fingerprint taken after the install, in case npm itself touched the lock file
    Set-Content -LiteralPath $NpmMark -Value (Get-FileHash -Algorithm SHA256 -LiteralPath $LockFile).Hash
}

$DbInfo = Get-DatabaseInfo

# --- 3. Make sure the ports are free -----------------------------------------
foreach ($entry in @(@($ApiPort, 'backend'), @($WebPort, 'frontend'))) {
    $busy = Get-PortListener $entry[0]
    if ($busy) {
        Fail ("Port $($entry[0]) ($($entry[1])) is already in use by PID $($busy.Pid): $($busy.Command)`n" +
              "         If that is an earlier Life OS run, stop it with:  taskkill /PID $($busy.Pid) /T /F  and run dev.bat again.")
    }
}

# --- 4. Start both servers and wait until they are up ------------------------
$exitCode = 0
try {
    Write-Step "Starting backend on port $ApiPort..."
    $Api = Start-Process -FilePath $VenvPy -ArgumentList 'app.py' -WorkingDirectory $Backend -NoNewWindow -PassThru
    [void]$Api.Handle   # cache the handle so HasExited / ExitCode work reliably

    # A cloud database can take a few seconds to wake up, so allow plenty of time
    $deadline = (Get-Date).AddSeconds(90)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        if ($Api.HasExited) { break }
        try {
            $health = Invoke-WebRequest -Uri "http://127.0.0.1:$ApiPort/api/health" -UseBasicParsing -TimeoutSec 2
            if ($health.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) {
        if ($Api.HasExited) { Write-Host "[life-os] ERROR: the backend stopped during startup (exit code $($Api.ExitCode)). See the messages above." -ForegroundColor Red }
        else { Write-Host '[life-os] ERROR: the backend did not become ready within 90 seconds.' -ForegroundColor Red }
        $exitCode = $FailCode
    }

    if ($ready) {
        Write-Step "Starting frontend on port $WebPort..."
        $Web = Start-Process -FilePath $Node.Source -ArgumentList @("`"$ViteJs`"", '--strictPort') -WorkingDirectory $Frontend -NoNewWindow -PassThru
        [void]$Web.Handle

        $deadline = (Get-Date).AddSeconds(30)
        while ((Get-Date) -lt $deadline -and -not $Web.HasExited -and -not (Get-PortListener $WebPort)) {
            Start-Sleep -Milliseconds 300
        }

        if ($Web.HasExited) {
            Write-Host "[life-os] ERROR: the frontend stopped during startup (exit code $($Web.ExitCode)). See the messages above." -ForegroundColor Red
            $exitCode = $FailCode
        } else {
            Write-Host ''
            Write-Host '  Life OS is running' -ForegroundColor Green
            Write-Host "    App   http://localhost:$WebPort   <- open this one" -ForegroundColor Green
            Write-Host "    API   http://127.0.0.1:$ApiPort" -ForegroundColor Green
            Write-DatabaseBanner $DbInfo
            Write-Host '    Press Ctrl+C to stop both.' -ForegroundColor Green
            Write-Host ''

            while (-not $Api.HasExited -and -not $Web.HasExited) { Start-Sleep -Milliseconds 500 }

            if ($Api.HasExited) { Write-Warn "The backend stopped (exit code $($Api.ExitCode))." }
            else { Write-Warn "The frontend stopped (exit code $($Web.ExitCode))." }
            $exitCode = $FailCode
        }
    }
}
finally {
    Write-Step 'Stopping backend and frontend...'
    Stop-Servers
    Write-Step 'Stopped.'
}
exit $exitCode
