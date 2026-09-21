import { NextResponse } from 'next/server';
import { SFNClient, DescribeStateMachineCommand } from '@aws-sdk/client-sfn';
import { BatchClient, DescribeJobQueuesCommand } from '@aws-sdk/client-batch';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

interface ComponentStatus {
    name: string;
    status: 'healthy' | 'unhealthy' | 'disabled' | 'unavailable' | 'error' | 'not_found' | 'no_access' | 'unknown';
    environment?: string;
    execution_mode?: string;
    details?: Record<string, unknown>;
}

interface DeploymentStatus {
    overall_status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    environment: string;
    components: Record<string, ComponentStatus>;
}

// Configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const ENVIRONMENT = process.env.PAVI_ENVIRONMENT || 'local';
const STATE_MACHINE_ARN = process.env.PAVI_STATE_MACHINE_ARN || '';
const JOB_QUEUE_ARN = process.env.PAVI_JOB_QUEUE_ARN || '';
const JOBS_TABLE_NAME = process.env.PAVI_JOBS_TABLE_NAME || 'pavi-jobs';
const RESULTS_BUCKET = process.env.PAVI_RESULTS_BUCKET || 'agr-pavi-pipeline-results';
const WORK_BUCKET = process.env.PAVI_WORK_BUCKET || 'agr-pavi-pipeline-nextflow';

// Check if AWS credentials are available
async function checkAWSCredentials(): Promise<boolean> {
    try {
        // Simple check - try to create a client
        // If credentials aren't configured, this will fail when making a request
        const hasCredentials = !!(
            process.env.AWS_ACCESS_KEY_ID ||
            process.env.AWS_SECRET_ACCESS_KEY ||
            process.env.AWS_PROFILE ||
            process.env.AWS_ROLE_ARN
        );
        return hasCredentials;
    } catch {
        return false;
    }
}

export async function GET() {
    const components: Record<string, ComponentStatus> = {};

    // Check if AWS credentials are available
    const hasCredentials = await checkAWSCredentials();

    if (!hasCredentials) {
        // No AWS credentials - return status showing AWS components as unavailable
        components['step_functions'] = {
            name: 'Step Functions',
            status: 'unavailable',
            details: {
                error: 'AWS credentials not configured in WebUI environment'
            }
        };

        components['batch'] = {
            name: 'AWS Batch',
            status: 'unavailable',
            details: {
                error: 'AWS credentials not configured in WebUI environment'
            }
        };

        components['dynamodb'] = {
            name: 'DynamoDB Jobs Table',
            status: 'unavailable',
            details: {
                error: 'AWS credentials not configured in WebUI environment'
            }
        };

        components['s3_results'] = {
            name: 'S3 Results Bucket',
            status: 'unavailable',
            details: {
                error: 'AWS credentials not configured in WebUI environment'
            }
        };

        return NextResponse.json({
            overall_status: 'unavailable',
            environment: ENVIRONMENT,
            components,
            note: 'AWS credentials not configured. For full status, start the PAVI API server or configure AWS credentials in the WebUI environment.'
        } as DeploymentStatus & { note: string });
    }

    // AWS credentials are available - check each service

    // Step Functions Status
    const sfStatus: ComponentStatus = {
        name: 'Step Functions',
        status: 'unknown',
        details: {}
    };

    if (STATE_MACHINE_ARN) {
        try {
            const sfnClient = new SFNClient({ region: AWS_REGION });
            const response = await sfnClient.send(new DescribeStateMachineCommand({
                stateMachineArn: STATE_MACHINE_ARN
            }));
            sfStatus.status = response.status === 'ACTIVE' ? 'healthy' : 'unhealthy';
            sfStatus.details = {
                arn: STATE_MACHINE_ARN,
                name: response.name || 'Unknown',
                state: response.status || 'Unknown',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('credentials')) {
                sfStatus.status = 'unavailable';
                sfStatus.details = { error: 'AWS credentials not configured' };
            } else {
                sfStatus.status = 'error';
                sfStatus.details = { error: errorMessage };
            }
        }
    } else {
        sfStatus.status = 'disabled';
        sfStatus.details = { message: 'Step Functions ARN not configured' };
    }
    components['step_functions'] = sfStatus;

    // AWS Batch Status
    const batchStatus: ComponentStatus = {
        name: 'AWS Batch',
        status: 'unknown',
        details: {}
    };

    if (JOB_QUEUE_ARN) {
        try {
            const batchClient = new BatchClient({ region: AWS_REGION });
            const response = await batchClient.send(new DescribeJobQueuesCommand({
                jobQueues: [JOB_QUEUE_ARN]
            }));
            if (response.jobQueues && response.jobQueues.length > 0) {
                const queue = response.jobQueues[0];
                batchStatus.status = queue.status === 'VALID' ? 'healthy' : 'unhealthy';
                batchStatus.details = {
                    arn: JOB_QUEUE_ARN,
                    name: queue.jobQueueName || 'Unknown',
                    state: queue.state || 'Unknown',
                    status: queue.status || 'Unknown',
                };
            } else {
                batchStatus.status = 'error';
                batchStatus.details = { error: 'Job queue not found' };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('credentials')) {
                batchStatus.status = 'unavailable';
                batchStatus.details = { error: 'AWS credentials not configured' };
            } else {
                batchStatus.status = 'error';
                batchStatus.details = { error: errorMessage };
            }
        }
    } else {
        batchStatus.status = 'disabled';
        batchStatus.details = { message: 'AWS Batch not configured' };
    }
    components['batch'] = batchStatus;

    // DynamoDB Status
    const dynamoStatus: ComponentStatus = {
        name: 'DynamoDB Jobs Table',
        status: 'unknown',
        details: {}
    };

    try {
        const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
        const response = await dynamoClient.send(new DescribeTableCommand({
            TableName: JOBS_TABLE_NAME
        }));
        const table = response.Table;
        dynamoStatus.status = table?.TableStatus === 'ACTIVE' ? 'healthy' : 'unhealthy';
        dynamoStatus.details = {
            table_name: JOBS_TABLE_NAME,
            status: table?.TableStatus || 'Unknown',
            item_count: table?.ItemCount || 0,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('credentials')) {
            dynamoStatus.status = 'unavailable';
            dynamoStatus.details = { error: 'AWS credentials not configured' };
        } else if (errorMessage.includes('ResourceNotFoundException')) {
            dynamoStatus.status = 'not_found';
            dynamoStatus.details = { error: `Table ${JOBS_TABLE_NAME} not found` };
        } else {
            dynamoStatus.status = 'error';
            dynamoStatus.details = { error: errorMessage };
        }
    }
    components['dynamodb'] = dynamoStatus;

    // S3 Results Bucket Status
    const s3ResultsStatus: ComponentStatus = {
        name: 'S3 Results Bucket',
        status: 'unknown',
        details: {}
    };

    try {
        const s3Client = new S3Client({ region: AWS_REGION });
        await s3Client.send(new HeadBucketCommand({
            Bucket: RESULTS_BUCKET
        }));
        s3ResultsStatus.status = 'healthy';
        s3ResultsStatus.details = {
            bucket_name: RESULTS_BUCKET,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('credentials')) {
            s3ResultsStatus.status = 'unavailable';
            s3ResultsStatus.details = { error: 'AWS credentials not configured' };
        } else if (errorMessage.includes('404') || errorMessage.includes('NotFound')) {
            s3ResultsStatus.status = 'not_found';
            s3ResultsStatus.details = { error: `Bucket ${RESULTS_BUCKET} not found` };
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            s3ResultsStatus.status = 'no_access';
            s3ResultsStatus.details = { error: 'Access denied to bucket' };
        } else {
            s3ResultsStatus.status = 'error';
            s3ResultsStatus.details = { error: errorMessage };
        }
    }
    components['s3_results'] = s3ResultsStatus;

    // S3 Work Bucket Status (if different from results)
    if (WORK_BUCKET && WORK_BUCKET !== RESULTS_BUCKET) {
        const s3WorkStatus: ComponentStatus = {
            name: 'S3 Work Bucket',
            status: 'unknown',
            details: {}
        };

        try {
            const s3Client = new S3Client({ region: AWS_REGION });
            await s3Client.send(new HeadBucketCommand({
                Bucket: WORK_BUCKET
            }));
            s3WorkStatus.status = 'healthy';
            s3WorkStatus.details = {
                bucket_name: WORK_BUCKET,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('credentials')) {
                s3WorkStatus.status = 'unavailable';
                s3WorkStatus.details = { error: 'AWS credentials not configured' };
            } else if (errorMessage.includes('404') || errorMessage.includes('NotFound')) {
                s3WorkStatus.status = 'not_found';
                s3WorkStatus.details = { error: `Bucket ${WORK_BUCKET} not found` };
            } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                s3WorkStatus.status = 'no_access';
                s3WorkStatus.details = { error: 'Access denied to bucket' };
            } else {
                s3WorkStatus.status = 'error';
                s3WorkStatus.details = { error: errorMessage };
            }
        }
        components['s3_work'] = s3WorkStatus;
    }

    // Calculate overall status
    const statuses = Object.values(components).map(c => c.status);
    let overall: 'healthy' | 'degraded' | 'unavailable' | 'unknown';

    if (statuses.every(s => s === 'healthy' || s === 'disabled')) {
        overall = 'healthy';
    } else if (statuses.some(s => s === 'error' || s === 'unhealthy')) {
        overall = 'degraded';
    } else if (statuses.some(s => s === 'unavailable')) {
        overall = 'unavailable';
    } else {
        overall = 'unknown';
    }

    return NextResponse.json({
        overall_status: overall,
        environment: ENVIRONMENT,
        components,
    } as DeploymentStatus);
}
