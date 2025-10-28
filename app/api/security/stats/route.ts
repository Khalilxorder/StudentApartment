import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from '@/lib/security-logger';

export async function GET(req: NextRequest) {
  try {
    // Get recent events (last 24 hours)
    const recentEvents = securityLogger.getRecentEvents(1440); // 24 hours

    // Calculate stats
    const stats = {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highEvents: recentEvents.filter(e => e.severity === 'high').length,
      mediumEvents: recentEvents.filter(e => e.severity === 'medium').length,
      lowEvents: recentEvents.filter(e => e.severity === 'low').length,
      recentEvents: recentEvents.slice(0, 10), // Last 10 events
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch security stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security statistics' },
      { status: 500 }
    );
  }
}