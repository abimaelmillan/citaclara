import { createServer } from 'node:http';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { isGoogleConfigured } from './config/google.js';
import { initRealtime } from './realtime/socket.js';

async function start(): Promise<void> {
  await connectDatabase();
  const server = createServer(app);
  initRealtime(server);
  server.listen(env.port, () => {
    console.log(`CitaClara escuchando en http://localhost:${env.port}`);
    if (!isGoogleConfigured()) console.log('Google no está configurado: el login con Google y Calendar están deshabilitados.');
  });
}

start().catch((error: unknown) => {
  console.error('No se pudo iniciar CitaClara:', error);
  process.exit(1);
});
