import { NextRequest, NextResponse } from 'next/server';
import { runIngestionPipeline } from '@/lib/ingestion/pipeline';
import { authorizePrivilegedRequest } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Scheduled Ingestion Worker Endpoint (`/api/cron/ingest`)
 * Configured via `vercel.json` Cron Jobs to run independently of any browser session.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = authorizePrivilegedRequest(req, '/api/cron/ingest', true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    const result = await runIngestionPipeline({
      triggerType: 'scheduled',
      force: false,
      maxAiCallsPerRun: 6,
    });

    return NextResponse.json({
      cron: 'completed',
      ...result,
    });
  } catch {
    return NextResponse.json(
      { error: 'Scheduled cron ingestion failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
