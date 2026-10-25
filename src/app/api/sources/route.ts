import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    const store = getStore(mode);

    const sourcesWithMetrics = store.sources.map((src) => {
      const recordsCount = store.source_records.filter(
        (r) => r.source_id === src.id
      ).length;
      const linkedIncidentsCount = new Set(
        store.incident_sources
          .filter((is) => is.source_id === src.id)
          .map((is) => is.incident_id)
      ).size;
      const recentRuns = store.source_runs
        .filter((r) => r.source_id === src.id)
        .slice(0, 5);

      return {
        ...src,
        records_in_db: recordsCount,
        incidents_linked: linkedIncidentsCount,
        recent_runs: recentRuns,
      };
    });

    return NextResponse.json({
      mode,
      sources: sourcesWithMetrics,
      recent_runs: store.source_runs.slice(0, 30),
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve sources' },
      { status: 500 }
    );
  }
}
