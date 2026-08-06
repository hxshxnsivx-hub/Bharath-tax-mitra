#!/usr/bin/env node
/**
 * CDK Application Entry Point
 * 
 * Stack deployment order: database → appconfig → auth → frontend
 * (each stack imports outputs from the previous via CfnOutput / Fn.importValue)
 */
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { AppConfigStack } from '../lib/stacks/appconfig-stack';

const app = new cdk.App();

// Read environment from context (-c env=dev|staging|prod)
const env = app.node.tryGetContext('env') ?? 'dev';
const config = require(`../config/${env}.json`);

const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region ?? process.env.CDK_DEFAULT_REGION ?? 'ap-south-1',
};

const prefix = `BharatTaxMitra-${env.charAt(0).toUpperCase() + env.slice(1)}`;

// Wave 1: Database (DynamoDB tables + EventBridge TTL cron)
const dbStack = new DatabaseStack(app, `${prefix}-Database`, {
  env: awsEnv,
  envName: env,
  config,
  description: 'Bharat Tax Mitra — DynamoDB tables + TTL audit cron',
});

// Wave 2: AppConfig (tax rules hot-reload) — before Auth, which consumes its
// application/environment/profile IDs for the GET /tax-rules route (OPT-A1)
const appConfigStack = new AppConfigStack(app, `${prefix}-AppConfig`, {
  env: awsEnv,
  envName: env,
  config,
  description: 'Bharat Tax Mitra — AppConfig for tax rules hot-reload',
});

// Wave 3: Auth (Lambda + API Gateway + IAM + SSM + tax-rules route)
const authStack = new AuthStack(app, `${prefix}-Auth`, {
  env: awsEnv,
  envName: env,
  config,
  databaseStack: dbStack,
  appConfigStack,
  description: 'Bharat Tax Mitra — OTP Lambda functions + API Gateway',
});
authStack.addDependency(dbStack);
authStack.addDependency(appConfigStack);

// Wave 4: Frontend (S3 + CloudFront)
const frontendStack = new FrontendStack(app, `${prefix}-Frontend`, {
  env: awsEnv,
  envName: env,
  config,
  description: 'Bharat Tax Mitra — S3 + CloudFront PWA hosting',
});

app.synth();
