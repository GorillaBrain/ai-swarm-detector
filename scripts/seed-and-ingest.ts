import fs from 'fs';
import path from 'path';
import { runIngestionPipeline } from '../src/lib/ingestion/pipeline';
import { loadDatabase, resetDemoStore, saveDatabase } from '../src/lib/db';

async function main() {
  console.log('=== AI SWARM DETECTOR: Real-World Ingestion & Demo Seed ===');
  const demo = resetDemoStore();
  console.log(
    `[Demo Store] Seeded ${demo.incidents.length} synthetic demo incidents across ${demo.sources.length} synthetic sources.`
  );

  console.log('[Live Store] Executing real-world public source connectors...');
  const result = await runIngestionPipeline({
    triggerType: 'seed',
    force: true,
    maxAiCallsPerRun: 5,
  });

  console.log(
    `[Live Store] Checked ${result.sourcesChecked} sources (${result.sourcesSucceeded} succeeded, ${result.sourcesFailed} degraded/rate-limited).`
  );
  console.log(
    `[Live Store] Retrieved ${result.totalRetrieved} raw records -> Accepted ${result.totalAccepted} relevant AI/agent records (${result.totalIrrelevantFiltered} non-AI filtered, ${result.totalDuplicates} duplicates).`
  );
  console.log(
    `[Live Store] Created ${result.newIncidentsCreated} unique incidents and correlated ${result.existingIncidentsCorroborated} corroborating source reports.`
  );

  const db = loadDatabase();
  saveDatabase(db);

  const snapshotPath = path.join(
    process.cwd(),
    'src',
    'lib',
    'db',
    'initial-live-snapshot.json'
  );
  fs.writeFileSync(snapshotPath, JSON.stringify(db.live, null, 2), 'utf-8');
  console.log(
    `[Snapshot] Wrote verified live snapshot (${db.live.incidents.length} incidents, ${db.live.source_records.length} source records, ${db.live.entities.length} entities) to ${snapshotPath}`
  );
}

main().catch((err) => {
  console.error('Seed and ingest error:', err);
  process.exit(1);
});
