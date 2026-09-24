Param()
Set-StrictMode -Version Latest

$template = "js/config.example.js"
$out = "js/config.js"

if (-not (Test-Path $template)){
  Write-Error "Template $template não encontrado. Execute a partir da raiz do projeto."
  exit 1
}

if (-not $env:SUPABASE_ANON_KEY){
  Write-Host "Variável SUPABASE_ANON_KEY não definida. Gerando arquivo com placeholder."
  Copy-Item $template $out -Force
  exit 0
}

Copy-Item $template $out -Force
# Substituição literal (não regex) para evitar que caracteres especiais na
# anon key (ex.: "$") sejam interpretados por -replace/Regex.
(Get-Content $out) | ForEach-Object { $_.Replace('sua-anon-key', $env:SUPABASE_ANON_KEY) } | Set-Content $out
Write-Host "Gerado $out a partir de $template"
