import { NextRequest, NextResponse } from 'next/server';
import { applyAnalystFeedback } from '@/lib/db';
import { AnalystFeedbackInputSchema } from '@/lib/schemas';
import { checkRateLimit, getClientIp } from '@/lib/security';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`feedback:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rate.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const mode: OperatingMode = body?.mode === 'demo' ? 'demo' : 'live';
    const parsed = AnalystFeedbackInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid feedback payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = applyAnalystFeedback(parsed.data, mode);
    if (!result) {
      return NextResponse.json(
        { error: 'Target incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to record analyst feedback' },
      { status: 500 }
    );
  }
}
