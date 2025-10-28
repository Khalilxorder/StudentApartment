// Health Check API - Monitor service availability
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV,
    services: {
      database: 'unknown',
      stripe: 'unknown',
    },
  };

  // Check Supabase connection
  try {
    const supabase = createClient();
    const { error } = await supabase.from('apartments').select('id').limit(1);
    healthCheck.services.database = error ? 'error' : 'connected';
  } catch (error) {
    healthCheck.services.database = 'error';
  }

  // Check Stripe configuration
  try {
    healthCheck.services.stripe = process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured';
  } catch (error) {
    healthCheck.services.stripe = 'error';
  }

  // Determine overall status
  const allServicesOk = Object.values(healthCheck.services).every(
    (status) => status === 'connected' || status === 'configured'
  );

  if (!allServicesOk) {
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;

  return NextResponse.json(healthCheck, { status: statusCode });
}
