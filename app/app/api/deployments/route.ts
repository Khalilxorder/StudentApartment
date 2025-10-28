import { cicdPipelineService, DeploymentMetrics } from '@/services/cicd-pipeline-svc';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/deployments
 * Trigger a deployment to staging or production
 * Requires: DEPLOYMENT_TOKEN in Authorization header
 */
export async function POST(req: NextRequest) {
  try {
    // Verify deployment token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const validToken = process.env.DEPLOYMENT_TOKEN;
    if (token !== validToken) {
      return NextResponse.json({ error: 'Invalid deployment token' }, { status: 403 });
    }

    const body = await req.json();
    const { environment } = body;

    if (!environment || !['staging', 'production'].includes(environment)) {
      return NextResponse.json(
        { error: 'Invalid environment. Must be staging or production' },
        { status: 400 }
      );
    }

    // Execute deployment pipeline
    const metrics = await cicdPipelineService.executeDeploymentPipeline(environment);

    return NextResponse.json(metrics, {
      status: metrics.status === 'success' ? 200 : 500,
    });
  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: 'Deployment failed', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deployments/:deploymentId
 * Get deployment status and metrics
 */
export async function GET(req: NextRequest) {
  try {
    const deploymentId = req.nextUrl.searchParams.get('id');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    // In production: retrieve deployment metrics from database
    // SELECT * FROM deployments WHERE id = deploymentId
    // For now, return placeholder
    const metrics: DeploymentMetrics = {
      deploymentId,
      startTime: new Date(),
      status: 'success',
      environment: 'staging',
      version: '1.0.0',
      testsRun: 45,
      testsPassed: 45,
      testsFailed: 0,
      testCoverage: 87,
      issues: [],
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching deployment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deployments/:deploymentId
 * Rollback a deployment
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify deployment token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const validToken = process.env.DEPLOYMENT_TOKEN;
    if (token !== validToken) {
      return NextResponse.json({ error: 'Invalid deployment token' }, { status: 403 });
    }

    const deploymentId = req.nextUrl.searchParams.get('id');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    // Execute rollback
    const result = await cicdPipelineService.rollbackDeployment(deploymentId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: 'Rollback failed', message: String(error) },
      { status: 500 }
    );
  }
}
