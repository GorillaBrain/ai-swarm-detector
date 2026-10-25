import { NextRequest, NextResponse } from 'next/server';
import { getDashboardAnalytics, loadDatabase } from '@/lib/db';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    const db = loadDatabase();
    const analytics = getDashboardAnalytics(mode, 0);

    return NextResponse.json({
      status: analytics.systemStatus.operational ? 'operational' : 'degraded',
      systemStatus: analytics.systemStatus,
      counts: {
        liveIncidents: db.live.incidents.length,
        liveSourceRecords: db.live.source_records.length,
        liveSources: db.live.sources.length,
        demoIncidents: db.demo.incidents.length,
      },
      recentRuns: analytics.recentRuns,
      auditLogs: db.audit_logs.slice(0, 40),
      lastSavedAt: db.last_saved_at,
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 500 }
    );
  }
}
