# ChatGPT 공유용 소스 코드 번들링 스크립트
# 사용법: PowerShell에서 .\bundle_source.ps1 실행

# 콘솔 출력 인코딩을 UTF-8로 설정하여 한글 깨짐 방지
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8


$outputPath = "full_project_code.txt"
$includeExtensions = @("*.js", "*.jsx", "*.css", "*.json", "*.html")
$excludeDirs = @("node_modules", "dist", ".git", ".next", "build")

# 기존 파일 삭제
if (Test-Path $outputPath) { Remove-Item $outputPath }

Write-Host "Bundling source code... ($outputPath)" -ForegroundColor Cyan

# 프로젝트 구조 출력
"==============================================`n" +
" PROJECT STRUCTURE`n" +
"==============================================`n" | Out-File -FilePath $outputPath -Append -Encoding UTF8
Get-ChildItem -Recurse -File | Where-Object { 
    $path = $_.FullName
    $match = $false
    foreach ($dir in $excludeDirs) { if ($path -like "*\$dir\*") { $match = $true; break } }
    !$match
} | Select-Object -ExpandProperty FullName | Out-File -FilePath $outputPath -Append -Encoding UTF8

# 각 파일 내용 병합
Get-ChildItem -Recurse -Include $includeExtensions | Where-Object {
    $path = $_.FullName
    $match = $false
    foreach ($dir in $excludeDirs) { if ($path -like "*\$dir\*") { $match = $true; break } }
    !$match
} | ForEach-Object {
    $relative = Resolve-Path $_.FullName -Relative
    "`n`n==============================================`n" +
    " FILE: $relative`n" +
    "==============================================`n" | Out-File -FilePath $outputPath -Append -Encoding UTF8
    Get-Content $_.FullName -Encoding UTF8 | Out-File -FilePath $outputPath -Append -Encoding UTF8
}

Write-Host "Done! Please upload '$outputPath' to ChatGPT." -ForegroundColor Green
