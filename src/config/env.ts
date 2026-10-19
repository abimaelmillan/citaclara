import dotenv from 'dotenv';

// Un clon del repositorio no trae .env porque nunca se versiona. En desarrollo
// se usa .env.example como respaldo para que `npm run dev` funcione de inmediato.
// Un .env real (o las variables de la plataforma) siempre tiene prioridad.
const localEnvironment = dotenv.config({ path: '.env' });

if (localEnvironment.error && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.example' });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGO_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtTtl: process.env.JWT_TTL ?? '8h',
  appUrl: process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? 'America/Mexico_City'
};
