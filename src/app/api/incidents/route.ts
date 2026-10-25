import { NextRequest, NextResponse } from 'next/server';
import { queryIncidents } from '@/lib/db';
import { IncidentFilterSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = IncidentFilterSchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid filter parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = queryIncidents(parsed.data);
    return NextResponse.json({
      ...result,
      mode: parsed.data.mode,
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to query incidents' },
      { status: 500 }
    );
  }
}
