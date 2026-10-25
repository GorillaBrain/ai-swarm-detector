import { NextRequest, NextResponse } from 'next/server';
import { getDashboardAnalytics } from '@/lib/db';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    const daysParam = Number(req.nextUrl.searchParams.get('days') || '0');
    const days = Number.isFinite(daysParam) && daysParam >= 0 ? daysParam : 0;

    const analytics = getDashboardAnalytics(mode, days);
    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json(
      { error: 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}
