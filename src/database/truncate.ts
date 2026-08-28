import { QueryTypes } from 'sequelize';
import { sequelize } from './sequelize.js';
import { env } from '../config/env.js';

async function truncate(): Promise<void> {
  try {
    await sequelize.authenticate();

    const rows = await sequelize.query<{ name: string }>(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      { replacements: [env.DB_NAME], type: QueryTypes.SELECT }
    );
    const tables = rows.map(({ name }) => name);

    if (tables.length === 0) {
      console.log('No tables to truncate.');
      return;
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const table of tables) {
        await sequelize.query(`TRUNCATE TABLE \`${table}\``);
      }
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    console.log(`Truncated ${tables.length} table(s): ${tables.join(', ')}`);
  } finally {
    await sequelize.close();
  }
}

void truncate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
