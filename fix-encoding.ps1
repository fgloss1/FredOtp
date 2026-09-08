# ============================================================
#  fix-encoding.ps1  -  PURE ASCII, encoding-proof
#
#  Fixes UTF-8-read-as-Windows-1252 mojibake in every source
#  file under the current directory.
#
#  Usage (from project root):
#    powershell -ExecutionPolicy Bypass -File .\fix-encoding.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# 1.  Target characters (each entry = array of code points).
#     The script builds the broken string automatically, so
#     no special characters need to appear in this file.
# ------------------------------------------------------------
$targets = @(
    # Currency
    ,@(0x20A6)          # Naira sign
    ,@(0x20AC)          # Euro
    ,@(0x00A3)          # Pound
    ,@(0x00A5)          # Yen

    # Punctuation
    ,@(0x00B7)          # middle dot
    ,@(0x2014)          # em dash
    ,@(0x2013)          # en dash
    ,@(0x2019)          # right single quote
    ,@(0x2018)          # left single quote
    ,@(0x201C)          # left double quote
    ,@(0x201D)          # right double quote
    ,@(0x2026)          # ellipsis
    ,@(0x2122)          # TM
    ,@(0x00A9)          # (C)
    ,@(0x00AE)          # (R)

    # Arrows / symbols
    ,@(0x2192)          # right arrow
    ,@(0x2190)          # left arrow
    ,@(0x2705)          # check mark button
    ,@(0x2728)          # sparkles
    ,@(0x26A1)          # high voltage
    ,@(0x2B50)          # star

    # Emoji with variation selector U+FE0F
    ,@(0x21A9, 0xFE0F)  # leftwards arrow with hook
    ,@(0x2709, 0xFE0F)  # envelope
    ,@(0x2716, 0xFE0F)  # heavy multiplication x
    ,@(0x2708, 0xFE0F)  # airplane
    ,@(0x26A0, 0xFE0F)  # warning
    ,@(0x2139, 0xFE0F)  # information
    ,@(0x1F6E1, 0xFE0F) # shield
    ,@(0x1F17F, 0xFE0F) # parking

    # Money
    ,@(0x1F4B3) ,@(0x1F4B5) ,@(0x1F4B8) ,@(0x1F4B0) ,@(0x1F4B2) ,@(0x1FA99)

    # Activities
    ,@(0x1F3AF) ,@(0x1F3AE) ,@(0x1F3AC) ,@(0x1F3B5) ,@(0x1F3B6) ,@(0x1F389) ,@(0x1F38A)

    # Communication / people
    ,@(0x1F4AC) ,@(0x1F4BC) ,@(0x1F44B) ,@(0x1F464) ,@(0x1F465) ,@(0x1F47B)

    # Hearts / sparkle
    ,@(0x1F49C) ,@(0x1F499) ,@(0x1F49A) ,@(0x1F49B) ,@(0x1F498) ,@(0x1F496) ,@(0x1F497) ,@(0x1F4AB)

    # Tech / security
    ,@(0x1F4F2) ,@(0x1F4F1) ,@(0x1F510) ,@(0x1F511) ,@(0x1F50E) ,@(0x1F525) ,@(0x1F534)

    # Boxes / mail / charts
    ,@(0x1F4E6) ,@(0x1F4EE) ,@(0x1F4EC) ,@(0x1F4F8) ,@(0x1F4D8) ,@(0x1F4CA) ,@(0x1F4C8)

    # Places / nature
    ,@(0x1F30D) ,@(0x1F33F) ,@(0x1F3E6) ,@(0x1F3E0)

    # Transport / misc
    ,@(0x1F697) ,@(0x1F6F5) ,@(0x1F680) ,@(0x1FA84) ,@(0x1F916) ,@(0x1F41D) ,@(0x1F7E1)

    # Country flags (regional-indicator pairs)
    ,@(0x1F1F3, 0x1F1EC) # NG
    ,@(0x1F1FA, 0x1F1F8) # US
    ,@(0x1F1EC, 0x1F1E7) # GB
    ,@(0x1F1E8, 0x1F1E6) # CA
    ,@(0x1F1EE, 0x1F1F3) # IN
    ,@(0x1F1E9, 0x1F1EA) # DE
    ,@(0x1F1EB, 0x1F1F7) # FR
    ,@(0x1F1E7, 0x1F1F7) # BR
    ,@(0x1F1F7, 0x1F1FA) # RU
    ,@(0x1F1EA, 0x1F1EC) # EG
    ,@(0x1F1FA, 0x1F1E6) # UA
    ,@(0x1F1F0, 0x1F1EA) # KE
    ,@(0x1F1FF, 0x1F1E6) # ZA
    ,@(0x1F1F5, 0x1F1ED) # PH
    ,@(0x1F1EE, 0x1F1E9) # ID
    ,@(0x1F1F2, 0x1F1FD) # MX
    ,@(0x1F1F9, 0x1F1F7) # TR
    ,@(0x1F1F5, 0x1F1F0) # PK
    ,@(0x1F1E8, 0x1F1F3) # CN
    ,@(0x1F1EF, 0x1F1F5) # JP
    ,@(0x1F1F0, 0x1F1F7) # KR
    ,@(0x1F1E6, 0x1F1FA) # AU
    ,@(0x1F1EA, 0x1F1F8) # ES
    ,@(0x1F1EE, 0x1F1F9) # IT
    ,@(0x1F1F3, 0x1F1F1) # NL
    ,@(0x1F1F5, 0x1F1F1) # PL
    ,@(0x1F1F8, 0x1F1EA) # SE
    ,@(0x1F1E8, 0x1F1ED) # CH
    ,@(0x1F1E6, 0x1F1EA) # AE
    ,@(0x1F1F8, 0x1F1EC) # SG
    ,@(0x1F1F2, 0x1F1FE) # MY
    ,@(0x1F1F9, 0x1F1ED) # TH
    ,@(0x1F1FB, 0x1F1F3) # VN
    ,@(0x1F1EC, 0x1F1ED) # GH

    # Accented Latin
    ,@(0x00E9) ,@(0x00E8) ,@(0x00E0) ,@(0x00FC) ,@(0x00F6) ,@(0x00E4) ,@(0x00F1)
)

# ------------------------------------------------------------
# 2.  Build broken -> correct map at runtime
# ------------------------------------------------------------
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8    = [System.Text.Encoding]::UTF8

$map = @{}
foreach ($codes in $targets) {
    # Forcefully open up and stream multi-value arrays to flat integer streams
    $flatCodes = @($codes) | ForEach-Object { $_ }
    $correct   = -join ($flatCodes | ForEach-Object { [char]::ConvertFromUtf32([int]$_) })
    
    $bytes   = $utf8.GetBytes($correct)
    $broken  = $win1252.GetString($bytes)
    if ($broken -ne $correct -and -not $map.ContainsKey($broken)) {
        $map[$broken] = $correct
    }
}

# Longest broken keys first so multi-char flags replace before their parts
$keys = @($map.Keys) | Sort-Object -Property Length -Descending

# ------------------------------------------------------------
# 3.  Find source files
# ------------------------------------------------------------
$allowedExt = @(".ts",".tsx",".js",".jsx",".mjs",".cjs",
                ".json",".md",".mdx",".html",".css",".svg",
                ".prisma",".sql")

$excludeDirs = @("node_modules",".next",".git","dist",".vercel",
                 ".turbo","coverage","__snapshots__","build","out")

Write-Host ""
Write-Host "====================================================="
Write-Host "  FredOTP Encoding Repair"
Write-Host "  Root:     $((Get-Location).Path)"
Write-Host "  Patterns: $($keys.Count)"
Write-Host "====================================================="
Write-Host ""

$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    ($allowedExt -contains $_.Extension.ToLower()) -and
    (-not ($excludeDirs | Where-Object { $_full = $args[0]; $false }))
}

# Second-pass filter to exclude directories (more reliable)
$files = $files | Where-Object {
    $p = $_.FullName
    $skip = $false
    foreach ($d in $excludeDirs) {
        if ($p -like "*\$d\*") { $skip = $true; break }
    }
    -not $skip
}

$utf8NoBom  = New-Object System.Text.UTF8Encoding($false)
$totalFiles = 0
$totalFixes = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, $utf8NoBom)
    } catch {
        Write-Host "  WARN could not read $($file.FullName)" -ForegroundColor Yellow
        continue
    }

    $original  = $content
    $fileFixes = 0

    foreach ($broken in $keys) {
        if ($content.Contains($broken)) {
            $count    = ([regex]::Matches($content, [regex]::Escape($broken))).Count
            $content  = $content.Replace($broken, $map[$broken])
            $fileFixes += $count
        }
    }

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $totalFiles++
        $totalFixes += $fileFixes
        $rel    = Resolve-Path -Relative $file.FullName
        $suffix = if ($fileFixes -gt 1) { "es" } else { "" }
        Write-Host ("  OK   {0}   ({1} fix{2})" -f $rel, $fileFixes, $suffix) -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "-----------------------------------------------------"
Write-Host ("  Done. {0} replacements across {1} files." -f $totalFixes, $totalFiles)
Write-Host "  Review with:  git diff"
Write-Host "  Verify with:  npm run build"
Write-Host "-----------------------------------------------------"
Write-Host ""
