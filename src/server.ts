import { env } from './config/env.js';
import { sequelize } from './database/sequelize.js';
import { app } from './app.js';
import { initializeDemoState } from './services/demo-state.service.js';
import {
  flushApplicationPersistence,
  initializeApplicationPersistence
} from './database/application-persistence.js';

async function bootstrap(): Promise<void> {
  await initializeApplicationPersistence();
  if (env.DEMO_MODE) {
    const demoState = initializeDemoState();
    await flushApplicationPersistence();
    console.log(`Demo state ready with ${demoState.applications} applications.`);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`RTI Saathi backend listening on port ${env.PORT}`);
  });

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down`);

    const timeout = setTimeout(() => {
      server.closeAllConnections();
      console.error('Shutdown deadline exceeded.');
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    timeout.unref();

    const serverClosed = new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });

    try {
      await Promise.all([serverClosed, flushApplicationPersistence()]);
      await sequelize.close();
      clearTimeout(timeout);
      process.exit(0);
    } catch (error) {
      clearTimeout(timeout);
      const message = error instanceof Error ? error.message : 'unknown shutdown error';
      console.error(`Shutdown failed: ${message}`);
      process.exit(1);
    }
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown startup error';
  console.error(`Backend startup failed: ${message}`);
  process.exitCode = 1;
});
