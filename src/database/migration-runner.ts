import type { QueryInterface, Transaction } from 'sequelize';
import { QueryTypes, type Sequelize } from 'sequelize';
import { migration001 } from './migrations/001-create-rti-applications.js';

type Migration = {
  name: string;
  up(queryInterface: QueryInterface, transaction: Transaction): Promise<void>;
};

const migrations: Migration[] = [migration001];

export async function runMigrations(database: Sequelize): Promise<string[]> {
  await database.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  const appliedRows = await database.query<{ name: string }>(
    'SELECT name FROM schema_migrations',
    { type: QueryTypes.SELECT }
  );
  const applied = new Set(appliedRows.map(({ name }) => name));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    await database.transaction(async (transaction) => {
      await migration.up(database.getQueryInterface(), transaction);
      await database.query('INSERT INTO schema_migrations (name) VALUES (?)', {
        replacements: [migration.name],
        transaction
      });
    });
    newlyApplied.push(migration.name);
  }

  return newlyApplied;
}
