import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { OperatingMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: OperatingMode = modeParam === 'demo' ? 'demo' : 'live';
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    const typeFilter = (req.nextUrl.searchParams.get('type') || '').trim();

    const store = getStore(mode);

    let entities = store.entities.map((entity) => {
      const links = store.incident_entities.filter(
        (ie) => ie.entity_id === entity.id
      );
      const relatedIncidents = links
        .map((link) => {
          const inc = store.incidents.find((i) => i.id === link.incident_id);
          if (!inc) return null;
          return {
            id: inc.id,
            slug: inc.slug,
            title: inc.title,
            primary_category: inc.primary_category,
            severity: inc.severity,
            verification_status: inc.verification_status,
            first_published_at: inc.first_published_at,
            role: link.role,
            relationship_certainty: link.relationship_certainty,
            evidence_note: link.evidence_note,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const sourceIds = new Set<string>();
      for (const rel of relatedIncidents) {
        const incSources = store.incident_sources.filter(
          (is) => is.incident_id === rel.id
        );
        for (const is of incSources) {
          sourceIds.add(is.source_id);
        }
      }
      const supportingSources = store.sources
        .filter((s) => sourceIds.has(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          reliability_score: s.reliability_score,
        }));

      return {
        ...entity,
        incident_count: relatedIncidents.length,
        confirmed_links_count: links.filter(
          (l) => l.relationship_certainty === 'confirmed'
        ).length,
        observed_links_count: links.filter(
          (l) => l.relationship_certainty !== 'confirmed'
        ).length,
        related_incidents: relatedIncidents,
        supporting_sources: supportingSources,
      };
    });

    if (q) {
      entities = entities.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (typeFilter) {
      entities = entities.filter((e) => e.entity_type === typeFilter);
    }

    entities.sort((a, b) => b.incident_count - a.incident_count);

    return NextResponse.json({
      mode,
      entities,
      serverTimeUtc: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve entities' },
      { status: 500 }
    );
  }
}
