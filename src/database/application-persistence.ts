import { sequelize } from './sequelize.js';
import { runMigrations } from './migration-runner.js';
import {
  InMemoryDemoApplicationStore,
  useApplicationStore
} from '../stores/application.store.js';
import { MySqlApplicationStore } from '../stores/mysql-application.store.js';

export type PersistenceMode = 'mysql' | 'memory';

let mode: PersistenceMode = 'memory';
let mysqlStore: MySqlApplicationStore | null = null;

export async function initializeApplicationPersistence(): Promise<PersistenceMode> {
  try {
    await sequelize.authenticate();
    const migrations = await runMigrations(sequelize);
    const store = new MySqlApplicationStore(sequelize);
    const applications = await store.hydrate();
    useApplicationStore(store);
    mysqlStore = store;
    mode = 'mysql';
    console.log(
      `MySQL application persistence ready with ${applications} applications` +
        (migrations.length > 0 ? `; applied ${migrations.length} migration(s).` : '.')
    );
  } catch (error) {
    useApplicationStore(new InMemoryDemoApplicationStore());
    mysqlStore = null;
    mode = 'memory';
    console.warn('MySQL unavailable. Using the existing in-memory application store fallback.');
    console.warn(error instanceof Error ? error.message : String(error));
  }
  return mode;
}

export function getPersistenceMode(): PersistenceMode {
  return mode;
}

export async function flushApplicationPersistence(): Promise<void> {
  await mysqlStore?.flush();
}
