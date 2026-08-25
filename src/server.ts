import { env } from './config/env.js';
import { sequelize } from './database/sequelize.js';
import { app } from './app.js';

async function bootstrap(): Promise<void> {
  try {
    await sequelize.authenticate();
  } catch {
    console.error(
      'MySQL authentication failed. Check DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD.'
    );
    process.exitCode = 1;
    return;
  }

  const server = app.listen(env.PORT, () => {
    console.log(`RTI Saathi backend listening on port ${env.PORT}`);
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
