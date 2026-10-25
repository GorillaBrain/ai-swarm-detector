import React from 'react';
import { notFound } from 'next/navigation';
import { getIncidentByIdOrSlug } from '@/lib/db';
import { OperatingMode } from '@/lib/types';
import { IncidentInvestigationView } from '@/components/IncidentInvestigationView';
import { Shield } from 'lucide-react';

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
    <div className="min-h-screen bg-[#07090e] text-slate-100">
      <header className="border-b border-slate-800/90 bg-[#090d14] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider text-sm text-slate-100">
            AI SWARM DETECTOR // INCIDENT INVESTIGATION DOSSIER
          </span>
        </div>
        <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
          MODE: {incident.operating_mode.toUpperCase()}
        </span>
      </header>

      {incident.operating_mode === 'demo' && (
        <div className="bg-amber-950/90 border-b border-amber-600/80 px-6 py-2 text-xs font-mono text-amber-200">
          SYNTHETIC DEMO MODE ACTIVE: This dossier is a synthetic test fixture and does not represent a real-world incident.
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <IncidentInvestigationView
          incident={incident}
          mode={incident.operating_mode}
        />
      </main>
    </div>
  );
}
