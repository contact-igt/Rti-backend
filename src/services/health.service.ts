import { sequelize } from '../database/sequelize.js';

export async function checkDatabase(): Promise<'connected'> {
  await sequelize.authenticate();
  return 'connected';
}
