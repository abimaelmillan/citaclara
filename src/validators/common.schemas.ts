import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido');
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM (24 h)');
export const idParams = z.object({ id: objectId });
