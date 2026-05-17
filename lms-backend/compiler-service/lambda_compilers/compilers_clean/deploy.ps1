param(
  [string]$StackName = "lms-compiler-runners",
  [string]$Region = "ap-south-1",
  [switch]$NoConfirm,
  [int]$RunnerDefaultTimeoutMs = 3000,
  [int]$RunnerMinTimeoutMs = 1000,
  [int]$RunnerMaxTimeoutMs = 15000,
  [int]$RunnerFunctionTimeoutSeconds = 20,
  [int]$RunnerFunctionMemorySize = 1024
)

$ErrorActionPreference = "Stop"

Write-Host "[deploy] Building SAM application..." -ForegroundColor Cyan
sam build --template-file template.yaml

if ($LASTEXITCODE -ne 0) {
  throw "sam build failed"
}

$deployArgs = @(
  "deploy",
  "--template-file", ".aws-sam/build/template.yaml",
  "--stack-name", $StackName,
  "--region", $Region,
  "--capabilities", "CAPABILITY_IAM",
  "--resolve-s3",
  "--parameter-overrides",
  "RunnerDefaultTimeoutMs=$RunnerDefaultTimeoutMs",
  "RunnerMinTimeoutMs=$RunnerMinTimeoutMs",
  "RunnerMaxTimeoutMs=$RunnerMaxTimeoutMs",
  "RunnerFunctionTimeoutSeconds=$RunnerFunctionTimeoutSeconds",
  "RunnerFunctionMemorySize=$RunnerFunctionMemorySize"
)

if ($NoConfirm) {
  $deployArgs += "--no-confirm-changeset"
}

Write-Host "[deploy] Deploying stack '$StackName' to region '$Region'..." -ForegroundColor Cyan
sam @deployArgs

if ($LASTEXITCODE -ne 0) {
  throw "sam deploy failed"
}

Write-Host "[deploy] Done. Copy output URLs into compiler-service environment variables." -ForegroundColor Green
