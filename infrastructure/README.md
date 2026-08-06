# Bharat Tax Mitra — Infrastructure

AWS CDK stacks for Bharat Tax Mitra.

## Stack Dependency Order

```
database → auth → appconfig → frontend
```
Each stack exports CloudFormation outputs; downstream stacks import via `Fn.importValue`.

## Deployment

```bash
# Install CDK dependencies
npm install

# Bootstrap (first time per account/region)
npx cdk bootstrap --context env=dev

# Deploy all stacks (dev)
npx cdk deploy --all --context env=dev

# Deploy a specific stack
npx cdk deploy BharatTaxMitra-Dev-Database --context env=dev

# Diff before deploy
npx cdk diff --context env=dev
```

## Stack Summary

| Stack | Tasks | Description |
|-------|-------|-------------|
| `database-stack.ts` | 0.4.1 | DynamoDB tables + TTL audit EventBridge cron |
| `auth-stack.ts` | 0.4.2 | send-otp + verify-otp Lambda + API Gateway |
| `appconfig-stack.ts` | 0.4.5 | AppConfig for tax rules hot-reload |
| `frontend-stack.ts` | 0.4.3 | S3 + CloudFront with TLS 1.3 + security headers |

## Cross-Stack Exports (task 0.4.6)

Each stack exports ARNs and names via `CfnOutput` with `exportName`.
Downstream stacks consume them via `cdk.Fn.importValue(exportName)`.

**Exported names follow the pattern:** `{StackId}-{ResourceName}`

Example: `BharatTaxMitra-Dev-Database-OtpsTableArn`
