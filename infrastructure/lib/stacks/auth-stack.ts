/**
 * Auth Stack — send-otp + verify-otp Lambda functions + API Gateway
 * 
 * Task: 0.4.2 | Requirements: 1.2, 1.3
 */
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { DatabaseStack } from './database-stack';
import { AppConfigStack } from './appconfig-stack';

interface AuthStackProps extends cdk.StackProps {
  envName: string;
  config: Record<string, unknown>;
  databaseStack: DatabaseStack;
  appConfigStack: AppConfigStack;
}

export class AuthStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { databaseStack, appConfigStack, envName } = props;

    // JWT_SECRET stored in SSM (SecureString) — NOT in code (task 0.9.1)
    const jwtSecretParam = ssm.StringParameter.fromSecureStringParameterAttributes(
      this, 'JwtSecret',
      { parameterName: `/bharattaxmitra/${envName}/jwt-secret` }
    );

    // Common Lambda environment
    const commonEnv: Record<string, string> = {
      OTP_TABLE_NAME: databaseStack.otpsTable.tableName,
      USERS_TABLE_NAME: databaseStack.usersTable.tableName,
      AUDIT_TABLE_NAME: databaseStack.auditEventsTable.tableName,
      ENV: envName,
      SMS_MODE: envName === 'prod' ? 'production' : 'mock',
    };

    // send-otp Lambda
    const sendOtpFn = new lambda.Function(this, 'SendOtpFunction', {
      functionName: `btm-send-otp-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'send_otp.handler',
      code: lambda.Code.fromAsset('../backend/src/lambdas/auth'),
      environment: {
        ...commonEnv,
        // DLT credentials fetched from SSM at runtime (task 0.6.2)
        DLT_ENTITY_ID_PARAM: `/bharattaxmitra/${envName}/dlt-entity-id`,
        DLT_TEMPLATE_ID_PARAM: `/bharattaxmitra/${envName}/dlt-template-id`,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // verify-otp Lambda
    const verifyOtpFn = new lambda.Function(this, 'VerifyOtpFunction', {
      functionName: `btm-verify-otp-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'verify_otp.handler',
      code: lambda.Code.fromAsset('../backend/src/lambdas/auth'),
      environment: {
        ...commonEnv,
        JWT_SECRET_PARAM: `/bharattaxmitra/${envName}/jwt-secret`,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant least-privilege DynamoDB access
    databaseStack.otpsTable.grantReadWriteData(sendOtpFn);
    databaseStack.otpsTable.grantReadWriteData(verifyOtpFn);
    databaseStack.usersTable.grantReadWriteData(verifyOtpFn);
    databaseStack.auditEventsTable.grantWriteData(sendOtpFn);
    databaseStack.auditEventsTable.grantWriteData(verifyOtpFn);

    // Grant SSM read for secrets
    jwtSecretParam.grantRead(verifyOtpFn);
    sendOtpFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/bharattaxmitra/${envName}/*`,
      ],
    }));

    // Grant SNS publish for OTP SMS
    sendOtpFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'], // SNS topic-less SMS; restrict by condition in prod
    }));

    // API Gateway
    this.api = new apigateway.RestApi(this, 'AuthApi', {
      restApiName: `btm-auth-api-${envName}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const auth = this.api.root.addResource('auth');
    const sendOtpRoute = auth.addResource('send-otp');
    const verifyOtpRoute = auth.addResource('verify-otp');

    sendOtpRoute.addMethod('POST', new apigateway.LambdaIntegration(sendOtpFn));
    verifyOtpRoute.addMethod('POST', new apigateway.LambdaIntegration(verifyOtpFn));

    // ── Tax rules hot-reload route (OPT-A1 | Req 11.1–11.3) ─────────────────
    // GET /tax-rules/{financialYear} — Lambda reads the AppConfig data plane so
    // rule updates deploy via AppConfig (validators + rollout), not code.
    const getTaxRulesFn = new lambda.Function(this, 'GetTaxRulesFunction', {
      functionName: `btm-get-tax-rules-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'get_rules.handler',
      code: lambda.Code.fromAsset('../backend/src/lambdas/tax_rules'),
      environment: {
        APPCONFIG_APP_ID: appConfigStack.applicationId,
        APPCONFIG_ENV_ID: appConfigStack.environmentId,
        APPCONFIG_PROFILE_ID: appConfigStack.configProfileId,
        ENV: envName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    // Least-privilege AppConfig data-plane access
    getTaxRulesFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'appconfig:StartConfigurationSession',
        'appconfig:GetLatestConfiguration',
      ],
      resources: [
        `arn:aws:appconfig:${this.region}:${this.account}:application/${appConfigStack.applicationId}/environment/${appConfigStack.environmentId}/configuration/${appConfigStack.configProfileId}`,
      ],
    }));

    const taxRules = this.api.root.addResource('tax-rules');
    const taxRulesByYear = taxRules.addResource('{financialYear}');
    taxRulesByYear.addMethod('GET', new apigateway.LambdaIntegration(getTaxRulesFn));

    // CfnOutputs for cross-stack reference (task 0.4.6)
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: `${id}-ApiUrl`,
    });
    new cdk.CfnOutput(this, 'SendOtpFunctionArn', {
      value: sendOtpFn.functionArn,
      exportName: `${id}-SendOtpFunctionArn`,
    });
    new cdk.CfnOutput(this, 'VerifyOtpFunctionArn', {
      value: verifyOtpFn.functionArn,
      exportName: `${id}-VerifyOtpFunctionArn`,
    });
  }
}
