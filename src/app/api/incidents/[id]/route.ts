import { NextRequest, NextResponse } from 'next/server';
import { getIncidentByIdOrSlug } from '@/lib/db';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';

    const incident = getIncidentByIdOrSlug(id, mode);
    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      incident,
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve incident details' },
      { status: 500 }
    );
  }
}
