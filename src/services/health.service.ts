import { env } from '../config/env.js';
import { getPersistenceMode } from '../database/application-persistence.js';
import { sequelize } from '../database/sequelize.js';

export type HealthSnapshot = {
  status: 'ok';
  service: 'rti-saathi-backend';
  database: 'connected' | 'unavailable';
  applicationStore: 'mysql' | 'memory';
  ai: 'configured' | 'degraded';
};

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const applicationStore = getPersistenceMode();
  let database: HealthSnapshot['database'] = 'unavailable';
  if (applicationStore === 'mysql') {
    try {
      await sequelize.authenticate();
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }

  return {
    status: 'ok',
    service: 'rti-saathi-backend',
    database,
    applicationStore,
    ai:
      env.OPENAI_API_KEY && env.OPENAI_MODEL && env.OPENAI_RTI_VECTOR_STORE_ID
        ? 'configured'
        : 'degraded'
  };
}
