/**
 * Database Stack — DynamoDB tables + TTL + EventBridge cron for TTL audit
 * 
 * Tables:
 *  - BharatTaxMitra-OTPs         (PK: mobileNumber, SK: timestamp, TTL: expiresAt)
 *  - BharatTaxMitra-Users
 *  - BharatTaxMitra-TaxSessions  (TTL: 24h)
 *  - BharatTaxMitra-Documents    (TTL: 24h)
 *  - BharatTaxMitra-CalculationResults
 *  - BharatTaxMitra-AuditEvents  (TTL: 90d)
 * 
 * Task: 0.4.1 | Requirements: 4.3, 4.4
 */
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  envName: string;
  config: Record<string, unknown>;
}

export class DatabaseStack extends cdk.Stack {
  // Exported for use by AuthStack and other stacks
  public readonly otpsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly taxSessionsTable: dynamodb.Table;
  public readonly documentsTable: dynamodb.Table;
  public readonly calculationResultsTable: dynamodb.Table;
  public readonly auditEventsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // OTPs table — composite PK required for query pattern (task 0.8.1)
    this.otpsTable = new dynamodb.Table(this, 'OtpsTable', {
      tableName: `BharatTaxMitra-OTPs-${props.envName}`,
      partitionKey: { name: 'mobileNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: props.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `BharatTaxMitra-Users-${props.envName}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    this.taxSessionsTable = new dynamodb.Table(this, 'TaxSessionsTable', {
      tableName: `BharatTaxMitra-TaxSessions-${props.envName}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt', // 24h TTL
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI: query sessions by userId
    this.taxSessionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-status-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });

    this.documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      tableName: `BharatTaxMitra-Documents-${props.envName}`,
      partitionKey: { name: 'documentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt', // 24h TTL
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.calculationResultsTable = new dynamodb.Table(this, 'CalculationResultsTable', {
      tableName: `BharatTaxMitra-CalculationResults-${props.envName}`,
      partitionKey: { name: 'resultId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.auditEventsTable = new dynamodb.Table(this, 'AuditEventsTable', {
      tableName: `BharatTaxMitra-AuditEvents-${props.envName}`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt', // 90-day retention
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // EventBridge daily cron for TTL audit Lambda (task 4.2.3)
    // Placeholder rule — wire to actual Lambda when 4.2.3 is built
    const ttlAuditRule = new events.Rule(this, 'TtlAuditCron', {
      ruleName: `btm-ttl-audit-${props.envName}`,
      description: 'Daily TTL policy verification (task 4.2.3)',
      schedule: events.Schedule.cron({ minute: '0', hour: '2' }), // 2am daily
      enabled: false, // enable when 4.2.3 Lambda is created
    });

    // CloudFormation outputs for cross-stack imports (task 0.4.6)
    new cdk.CfnOutput(this, 'OtpsTableArn', {
      value: this.otpsTable.tableArn,
      exportName: `${id}-OtpsTableArn`,
    });
    new cdk.CfnOutput(this, 'UsersTableArn', {
      value: this.usersTable.tableArn,
      exportName: `${id}-UsersTableArn`,
    });
    new cdk.CfnOutput(this, 'TaxSessionsTableArn', {
      value: this.taxSessionsTable.tableArn,
      exportName: `${id}-TaxSessionsTableArn`,
    });
    new cdk.CfnOutput(this, 'DocumentsTableArn', {
      value: this.documentsTable.tableArn,
      exportName: `${id}-DocumentsTableArn`,
    });
    new cdk.CfnOutput(this, 'AuditEventsTableArn', {
      value: this.auditEventsTable.tableArn,
      exportName: `${id}-AuditEventsTableArn`,
    });
    new cdk.CfnOutput(this, 'OtpsTableName', {
      value: this.otpsTable.tableName,
      exportName: `${id}-OtpsTableName`,
    });
  }
}
