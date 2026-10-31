import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIncidentByIdOrSlug } from '@/lib/db';
import { OperatingMode } from '@/lib/types';
import { IncidentInvestigationView } from '@/components/IncidentInvestigationView';

export const dynamic = 'force-dynamic';

export default async function StandaloneIncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const mode: OperatingMode =
    resolvedSearch?.mode === 'demo' ? 'demo' : 'live';

  const incident = getIncidentByIdOrSlug(slug, mode);
  if (!incident) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#080a0f] text-[#f3f5f8]">
      <header className="h-14 border-b border-white/[0.08] bg-[#080a0f]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-[#f5b82e]" />
          <span className="font-display text-xs font-semibold tracking-[0.22em] text-[#f3f5f8] uppercase">
            AI SWARM DETECTOR // INTELLIGENCE DOSSIER
          </span>
        </Link>
        <span className="text-xs font-mono uppercase px-2.5 py-1 bg-[#0c1018] border border-white/10 text-[#f5b82e]">
          {incident.operating_mode.toUpperCase()} MODE
        </span>
      </header>

      {incident.operating_mode === 'demo' && (
        <div className="bg-[#f5b82e]/12 border-b border-[#f5b82e]/35 px-6 py-2 text-xs text-[#fde68a]">
          <strong>Synthetic Demo Mode Active:</strong> This dossier is an
          isolated synthetic test fixture.
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        <IncidentInvestigationView
          incident={incident}
          mode={incident.operating_mode}
        />
      </main>
    </div>
  );
}
