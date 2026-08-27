import { sequelize } from './sequelize.js';
import { runMigrations } from './migration-runner.js';

async function migrate(): Promise<void> {
  try {
    await sequelize.authenticate();
    const applied = await runMigrations(sequelize);
    console.log(applied.length > 0 ? `Applied migrations: ${applied.join(', ')}` : 'Database is up to date.');
  } finally {
    await sequelize.close();
  }
}

void migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
