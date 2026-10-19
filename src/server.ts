import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(env.port, () => console.log(`CitaClara escuchando en http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('No se pudo iniciar CitaClara:', error);
  process.exit(1);
});
