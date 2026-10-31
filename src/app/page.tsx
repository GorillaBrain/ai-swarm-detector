import React from 'react';
import { getDashboardAnalytics, getStore, queryIncidents } from '@/lib/db';
import { SwarmDetectorApp } from '@/components/SwarmDetectorApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initialAnalytics = getDashboardAnalytics('live', 0);
  const initialIncidentsResult = queryIncidents({
    mode: 'live',
    page: 1,
    pageSize: 200,
    sortBy: 'newest',
  });
  const liveStore = getStore('live');

  return (
    <SwarmDetectorApp
      initialAnalytics={initialAnalytics}
      initialIncidents={initialIncidentsResult.items}
      initialSources={liveStore.sources}
    />
  );
}
