/**
 * AppConfig Stack — tax rules hot-reload without redeployment
 * 
 * Task: 0.4.5 | Requirements: 11.1, 11.2, 11.3
 * 
 * Strategy:
 *  - AllAtOnce for dev/staging (fast iteration)
 *  - Linear20PercentEvery1Minute for prod (safe rollout)
 */
import * as cdk from 'aws-cdk-lib';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

interface AppConfigStackProps extends cdk.StackProps {
  envName: string;
  config: Record<string, unknown>;
}

export class AppConfigStack extends cdk.Stack {
  public readonly applicationId: string;
  public readonly environmentId: string;
  public readonly configProfileId: string;

  constructor(scope: Construct, id: string, props: AppConfigStackProps) {
    super(scope, id, props);

    const application = new appconfig.CfnApplication(this, 'App', {
      name: 'BharatTaxMitra',
      description: 'Bharat Tax Mitra — dynamic configuration',
    });

    const environment = new appconfig.CfnEnvironment(this, 'Env', {
      applicationId: application.ref,
      name: props.envName,
      description: `${props.envName} environment`,
    });

    const configProfile = new appconfig.CfnConfigurationProfile(this, 'TaxRulesProfile', {
      applicationId: application.ref,
      name: 'TaxRules',
      locationUri: 'hosted',
      type: 'AWS.Freeform',
      description: 'FY 2025-26 tax rules JSON (Finance Bill 2025)',
    });

    // Initial tax rules content from shared/
    const taxRulesPath = path.join(__dirname, '../../../../shared/tax-rules-fy2025-26.json');
    const taxRulesContent = fs.existsSync(taxRulesPath)
      ? fs.readFileSync(taxRulesPath, 'utf-8')
      : '{}';

    const hostedConfigVersion = new appconfig.CfnHostedConfigurationVersion(
      this, 'TaxRulesV1', {
        applicationId: application.ref,
        configurationProfileId: configProfile.ref,
        content: taxRulesContent,
        contentType: 'application/json',
        description: 'FY 2025-26 tax rules — initial version',
      }
    );

    // Deployment strategy: AllAtOnce for dev, Linear for prod
    const deploymentStrategyName = props.envName === 'prod'
      ? 'AppConfig.Linear20PercentEvery1Minute'
      : 'AppConfig.AllAtOnce';

    const deployment = new appconfig.CfnDeployment(this, 'InitialDeployment', {
      applicationId: application.ref,
      environmentId: environment.ref,
      configurationProfileId: configProfile.ref,
      configurationVersion: hostedConfigVersion.ref,
      deploymentStrategyId: deploymentStrategyName,
      description: 'Initial tax rules deployment',
    });

    this.applicationId = application.ref;
    this.environmentId = environment.ref;
    this.configProfileId = configProfile.ref;

    new cdk.CfnOutput(this, 'AppConfigApplicationId', {
      value: application.ref,
      exportName: `${id}-AppConfigApplicationId`,
    });
    new cdk.CfnOutput(this, 'AppConfigEnvironmentId', {
      value: environment.ref,
      exportName: `${id}-AppConfigEnvironmentId`,
    });
    new cdk.CfnOutput(this, 'AppConfigConfigProfileId', {
      value: configProfile.ref,
      exportName: `${id}-AppConfigConfigProfileId`,
    });
  }
}
