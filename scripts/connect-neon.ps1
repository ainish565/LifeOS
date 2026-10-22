<#
  Connect this computer's Life OS to the shared Neon database (the "production" branch).

  For team members who were added to the Neon project. From the project folder run:

      powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\connect-neon.ps1

  It signs you in to Neon if needed, links the project, makes sure the settings file
  (.env.local) exists, and finally checks which database the app will really use.
  Safe to run again. Add -SkipLink to skip `neon link` and write the settings directly.
#>
param([switch]$SkipLink)

$Root      = Split-Path -Parent $PSScriptRoot
$Backend   = Join-Path $Root 'backend'
$VenvPy    = Join-Path $Backend 'venv\Scripts\python.exe'
$OrgId     = 'org-hidden-scene-06944674'
$ProjectId = 'bitter-shape-48502705'
$Branch    = 'production'
$EnvLocal  = Join-Path $Root '.env.local'

function Say([string]$Text)  { Write-Host "[connect-neon] $Text" -ForegroundColor Cyan }
function Good([string]$Text) { Write-Host "[connect-neon] $Text" -ForegroundColor Green }
function Warn([string]$Text) { Write-Host "[connect-neon] $Text" -ForegroundColor Yellow }
function Stop-Here([string]$Text) {
    Write-Host "[connect-neon] ERROR: $Text" -ForegroundColor Red
    exit 1
}

# True when the project folder has a Neon connection string in .env.local or .env
function Test-HasDatabaseUrl {
    foreach ($name in '.env.local', '.env') {
        $file = Join-Path $Root $name
        if ((Test-Path $file) -and (Select-String -Path $file -Pattern '^\s*DATABASE_URL\s*=\s*"?postgres' -Quiet)) { return $true }
    }
    return $false
}

# --- 1. Neon CLI and sign-in ---------------------------------------------------
if (-not (Get-Command neon -ErrorAction SilentlyContinue)) {
    Stop-Here 'The Neon command-line tool is not installed. Run:  npm i -g neon   then close and reopen this terminal and run this script again.'
}
& neon me *> $null
if ($LASTEXITCODE -ne 0) {
    Say 'You are not signed in to Neon. A browser window will open: sign in with the account that was invited.'
    & neon login
    & neon me *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Here 'Sign-in did not finish. Run  neon login  yourself, then run this script again.' }
}
Say 'Signed in to Neon as:'
& neon me

# --- 2. Link the project (writes .neon and .env.local) -------------------------
Push-Location $Root
try {
    # neon.ts (in the project root) imports @neon/config. Until the root packages are installed,
    # `neon link` links the project but silently fails to download the database settings.
    if (-not $SkipLink -and -not (Test-Path (Join-Path $Root 'node_modules\@neon\config'))) {
        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if ($npm) {
            Say 'Installing the Neon config packages (one time)...'
            & $npm.Source install
        }
    }

    if (-not $SkipLink) {
        Say "Linking the project (branch '$Branch')..."
        & neon link --org-id $OrgId --project-id $ProjectId --branch $Branch -y
        if ($LASTEXITCODE -ne 0) {
            Warn 'neon link reported a problem (the message is above). Common causes:'
            Warn '  - you have not accepted the invitation email from Neon yet, or you signed in with a different email than the one invited'
            Warn '  - the project owner has not added you to the project'
            Warn 'Trying a direct method instead...'
        }
    }

    # --- 3. Make sure the settings file really exists --------------------------
    if (-not (Test-HasDatabaseUrl)) {
        Say 'No database settings found yet - fetching the connection strings directly...'
        $pooled = (& neon connection-string $Branch --project-id $ProjectId --pooled 2>$null | Select-Object -First 1)
        $direct = (& neon connection-string $Branch --project-id $ProjectId 2>$null | Select-Object -First 1)
        if (-not ($pooled -like 'postgres*') -or -not ($direct -like 'postgres*')) {
            Stop-Here ("Neon would not give out the connection strings for this account.`n" +
                       "         Ask the project owner to check that you were added to the project (Organization > People),`n" +
                       "         and that you accepted the invitation. Then run this script again.")
        }
        $text = "DATABASE_URL=`"$($pooled.Trim())`"`nDATABASE_URL_UNPOOLED=`"$($direct.Trim())`"`nNEON_BRANCH=$Branch`n"
        # UTF-8 without a byte-order mark, so the first line is read correctly
        [System.IO.File]::WriteAllText($EnvLocal, $text, (New-Object System.Text.UTF8Encoding($false)))
        Say 'Wrote .env.local (it is git-ignored and must never be committed or shared).'
    }
}
finally { Pop-Location }

# --- 4. Check what the app will really use -------------------------------------
if (-not (Test-Path $VenvPy)) {
    Good 'Settings are in place. Run  .\dev.bat  now (the first run also installs everything).'
    Warn 'After it starts, look for the green line "DB  PostgreSQL database ... neon.tech".'
    exit 0
}
Push-Location $Backend
try { $line = & $VenvPy -c "from config import database_url, describe_database; print(describe_database(database_url()))" 2>$null | Select-Object -First 1 }
finally { Pop-Location }

if ($line -like 'PostgreSQL*') {
    Good "The app will use: $line"
    Good 'Next: run  .\dev.bat  , open http://localhost:5173 and click "Create an account" (your old local login does not exist in Neon).'
} else {
    Stop-Here "The app would still use a local file ($line). Send the messages above to the project owner."
}
