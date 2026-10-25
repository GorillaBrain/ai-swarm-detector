import { NextRequest } from 'next/server';
import { recordAuditLog } from './db';

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetInSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Verifies authorization for ingestion triggers or privileged operations.
 * - Scheduled cron requests (`/api/cron/ingest`) must carry `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.
 * - Manual UI ingestion triggers (`/api/ingest`) must either carry `x-ingest-token` matching `INGESTION_API_TOKEN` (if configured) or pass same-origin/UI header check (`x-soc-client: ai-swarm-detector-ui`) and strict rate limiting.
 */
export function authorizePrivilegedRequest(
  req: NextRequest,
  endpointName: string,
  requireCronSecret = false
): { authorized: boolean; reason?: string } {
  const ip = getClientIp(req);
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const ingestToken = process.env.INGESTION_API_TOKEN;
  const socClientHeader = req.headers.get('x-soc-client');

  if (requireCronSecret && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      recordAuditLog({
        action: endpointName,
        actor: `ip:${ip}`,
        target_type: 'api_route',
        target_id: endpointName,
        status: 'denied',
        metadata: { reason: 'Invalid or missing CRON_SECRET bearer token' },
      });
      return {
        authorized: false,
        reason: 'Unauthorized: valid CRON_SECRET Bearer token required.',
      };
    }
    return { authorized: true };
  }

  // If explicit x-ingest-token header is provided, validate against INGESTION_API_TOKEN
  const providedToken = req.headers.get('x-ingest-token');
  if (ingestToken && providedToken) {
    if (providedToken !== ingestToken) {
      recordAuditLog({
        action: endpointName,
        actor: `ip:${ip}`,
        target_type: 'api_route',
        target_id: endpointName,
        status: 'denied',
        metadata: { reason: 'Invalid x-ingest-token' },
      });
      return { authorized: false, reason: 'Unauthorized: invalid ingestion token.' };
    }
    return { authorized: true };
  }

  // Check if unauthorized external POST without x-soc-client or valid Bearer token
  if (
    !requireCronSecret &&
    socClientHeader !== 'ai-swarm-detector-ui' &&
    (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
  ) {
    recordAuditLog({
      action: endpointName,
      actor: `ip:${ip}`,
      target_type: 'api_route',
      target_id: endpointName,
      status: 'denied',
      metadata: { reason: 'Missing required x-soc-client or Bearer token header' },
    });
    return {
      authorized: false,
      reason:
        'Unauthorized trigger: privileged endpoints require authenticated SOC client header or Bearer token.',
    };
  }

  return { authorized: true };
}
