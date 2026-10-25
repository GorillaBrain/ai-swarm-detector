import { NextRequest, NextResponse } from 'next/server';
import { resetDemoStore } from '@/lib/db';
import { runIngestionPipeline } from '@/lib/ingestion/pipeline';
import {
  authorizePrivilegedRequest,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = authorizePrivilegedRequest(req, '/api/ingest', false);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`ingest:${ip}`, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Ingestion rate limit exceeded. Retry in ${rate.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    if (body?.action === 'reseed_demo') {
      const demo = resetDemoStore();
      return NextResponse.json({
        status: 'demo_reseeded',
        incidents: demo.incidents.length,
        sources: demo.sources.length,
        serverTimeUtc: new Date().toISOString(),
      });
    }

    const sourceSlug =
      typeof body?.sourceSlug === 'string' ? body.sourceSlug : undefined;

    const result = await runIngestionPipeline({
      sourceSlug,
      triggerType: 'manual',
      force: Boolean(body?.force),
      maxAiCallsPerRun: 4,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Ingestion pipeline execution failed' },
      { status: 500 }
    );
  }
}
