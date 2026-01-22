/**
 * Migration CLI
 * Run migrations from command line
 */

import { runMigrations, getMigrationStatus } from './index';

async function main() {
  const command = process.argv[2] || 'run';

  try {
    switch (command) {
      case 'run':
        await runMigrations();
        break;
      case 'status':
        const status = await getMigrationStatus();
        console.log('\n=== Migration Status ===');
        console.log(`Applied: ${status.applied.length}`);
        status.applied.forEach((m) => {
          console.log(`  ✓ ${m.version}: ${m.name} (${m.applied_at})`);
        });
        console.log(`\nPending: ${status.pending.length}`);
        status.pending.forEach((m) => {
          console.log(`  ○ ${m.version}: ${m.name}`);
        });
        break;
      default:
        console.log('Usage:');
        console.log('  npm run db:migrate        - Run pending migrations');
        console.log('  npm run db:migrate status - Show migration status');
        process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

main();
