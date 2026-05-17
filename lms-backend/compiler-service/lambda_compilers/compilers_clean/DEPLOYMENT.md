# Lambda Compiler Runners Deployment

This folder ships 4 language-specific Lambda handlers:

- `python-runner.handler`
- `java-runner.handler`
- `cpp-runner.handler`
- `c-runner.handler`

Each handler delegates to `handler.js` and forces its language.

## Event shape

```json
{
  "code": "print('hello')",
  "stdin": "",
  "timeoutMs": 3000,
  "memoryMb": 128
}
```

## Response shape

```json
{
  "stdout": "hello\n",
  "stderr": "",
  "error": null
}
```

For errors:

```json
{
  "stdout": "",
  "stderr": "",
  "error": {
    "type": "COMPILE_ERROR | RUNTIME_ERROR",
    "message": "..."
  }
}
```

## AWS deployment (SAM)

This folder now includes a SAM template (`template.yaml`) and deployment script (`deploy.ps1`).

### Prerequisites

- AWS CLI configured (`aws configure`)
- SAM CLI installed
- IAM permissions for Lambda, CloudFormation, API Gateway, and S3 deployment artifacts

### Deployment parameters

The runner stack is parameterized so the timeout policy is explicit and easy to tune:

- `RunnerDefaultTimeoutMs` — default request timeout when the caller omits `timeoutMs`
- `RunnerMinTimeoutMs` — lower clamp for `timeoutMs`
- `RunnerMaxTimeoutMs` — upper clamp for `timeoutMs`
- `RunnerFunctionTimeoutSeconds` — Lambda function timeout
- `RunnerFunctionMemorySize` — Lambda memory size

### Deploy

From this folder:

1. Build and deploy with PowerShell script:

  - `./deploy.ps1`

2. Optional custom stack/region:

  - `./deploy.ps1 -StackName lms-compiler-runners-prod -Region ap-south-1 -NoConfirm`

3. Optional timeout/memory tuning:

  - `./deploy.ps1 -RunnerDefaultTimeoutMs 3000 -RunnerMinTimeoutMs 1000 -RunnerMaxTimeoutMs 15000 -RunnerFunctionTimeoutSeconds 20 -RunnerFunctionMemorySize 1024`

4. Equivalent npm scripts:

  - From the `compiler-service` package root: `npm run sam:build`
  - From the `compiler-service` package root: `npm run sam:deploy`

### Created functions

- `lms-compiler-python-runner`
- `lms-compiler-java-runner`
- `lms-compiler-cpp-runner`
- `lms-compiler-c-runner`

The stack outputs four Function URLs.

Set these in compiler-service runtime:

- `COMPILER_RUNNER_PYTHON_URL`
- `COMPILER_RUNNER_JAVA_URL`
- `COMPILER_RUNNER_CPP_URL`
- `COMPILER_RUNNER_C_URL`

### Timeout behavior

- Each runner accepts `timeoutMs` from request body.
- Runtime timeout is clamped between the configured `RunnerMinTimeoutMs` and `RunnerMaxTimeoutMs` values.
- Timeout errors return `error.type = "TIME_LIMIT_EXCEEDED"`.

When these are configured, `compiler-service /execute` uses Lambda runners.
If they are empty, compiler-service falls back to local sandbox execution.
