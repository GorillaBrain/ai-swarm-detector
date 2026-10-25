import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getStore,
  loadDatabase,
  recordAuditLog,
  saveDatabase,
} from '@/lib/db';
import { WatchlistCreateSchema } from '@/lib/schemas';
import {
  OperatingMode,
  SEVERITY_META,
  Watchlist,
  WatchlistItem,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    const store = getStore(mode);

    const watchlists = store.watchlists.map((wl) => {
      const items = store.watchlist_items.filter(
        (i) => i.watchlist_id === wl.id
      );
      const minRank = SEVERITY_META[wl.min_severity]?.rank || 1;

      const matchingIncidents = store.incidents.filter((inc) => {
        if (SEVERITY_META[inc.severity].rank < minRank) return false;
        return items.some((item) => {
          if (item.item_type === 'category') {
            return (
              inc.primary_category === item.item_value ||
              inc.categories.includes(item.item_value as typeof inc.primary_category)
            );
          }
          if (item.item_type === 'severity') {
            return inc.severity === item.item_value;
          }
          if (item.item_type === 'country') {
            return (
              inc.country_code?.toUpperCase() === item.item_value.toUpperCase()
            );
          }
          if (item.item_type === 'keyword') {
            const kw = item.item_value.toLowerCase();
            return (
              inc.title.toLowerCase().includes(kw) ||
              inc.summary.toLowerCase().includes(kw)
            );
          }
          if (item.item_type === 'entity') {
            const ent = store.entities.find(
              (e) =>
                e.slug === item.item_value ||
                e.name.toLowerCase() === item.item_value.toLowerCase()
            );
            if (!ent) return false;
            return store.incident_entities.some(
              (ie) => ie.incident_id === inc.id && ie.entity_id === ent.id
            );
          }
          return false;
        });
      });

      return {
        ...wl,
        items,
        matching_count: matchingIncidents.length,
        matching_incidents: matchingIncidents.slice(0, 10).map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          primary_category: m.primary_category,
          severity: m.severity,
          verification_status: m.verification_status,
          first_published_at: m.first_published_at,
        })),
      };
    });

    return NextResponse.json({
      mode,
      watchlists,
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve watchlists' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = WatchlistCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid watchlist payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, notify_in_app, min_severity, mode, items } =
      parsed.data;

    const db = loadDatabase();
    const store = mode === 'demo' ? db.demo : db.live;
    const now = new Date().toISOString();

    const newWatchlist: Watchlist = {
      id: crypto.randomUUID(),
      name,
      description,
      notify_in_app,
      min_severity,
      created_at: now,
      updated_at: now,
      operating_mode: mode,
    };
    store.watchlists.unshift(newWatchlist);

    const createdItems: WatchlistItem[] = items.map((it) => ({
      id: crypto.randomUUID(),
      watchlist_id: newWatchlist.id,
      item_type: it.item_type,
      item_value: it.item_value,
      label: it.label,
      created_at: now,
    }));
    store.watchlist_items.push(...createdItems);

    recordAuditLog({
      action: 'create_watchlist',
      actor: 'soc-user',
      target_type: 'watchlist',
      target_id: newWatchlist.id,
      status: 'allowed',
      metadata: { name, itemCount: createdItems.length, mode },
    });

    saveDatabase(db);
    return NextResponse.json(
      { watchlist: newWatchlist, items: createdItems },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to create watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    if (!id) {
      return NextResponse.json(
        { error: 'Missing watchlist id' },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    const store = mode === 'demo' ? db.demo : db.live;
    store.watchlists = store.watchlists.filter((w) => w.id !== id);
    store.watchlist_items = store.watchlist_items.filter(
      (i) => i.watchlist_id !== id
    );
    saveDatabase(db);

    return NextResponse.json({ deleted: true, id });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete watchlist' },
      { status: 500 }
    );
  }
}
