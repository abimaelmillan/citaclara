import { createHash, randomBytes } from 'node:crypto';

// El paciente gestiona su cita con un token que solo se entrega una vez.
// En la base de datos se guarda únicamente su hash.
export function createManageToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
