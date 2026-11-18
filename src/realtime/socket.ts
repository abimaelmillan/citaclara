import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { User } from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Dos namespaces:
//  /panel  → requiere JWT; cada profesional entra a su propio room y recibe sus citas.
//  /agenda → público; la agenda del paciente solo recibe las fechas cuyos horarios cambiaron.
let io: Server | null = null;

export const panelRoom = (professionalId: string) => `professional:${professionalId}`;
export const agendaRoom = (professionalId: string) => `agenda:${professionalId}`;

export function initRealtime(server: HttpServer): Server {
  io = new Server(server);

  const panel = io.of('/panel');
  panel.use((socket, next) => {
    try {
      const payload = verifyAccessToken(String(socket.handshake.auth?.token ?? ''));
      socket.data.professionalId = payload.sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });
  panel.on('connection', (socket) => {
    void socket.join(panelRoom(socket.data.professionalId));
  });

  const agenda = io.of('/agenda');
  agenda.on('connection', (socket) => {
    socket.on('agenda:watch', async (payload: unknown, ack?: (result: unknown) => void) => {
      try {
        const slug = typeof (payload as { slug?: unknown })?.slug === 'string' ? (payload as { slug: string }).slug : '';
        const professional = slug ? await User.findOne({ slug }).select('_id') : null;
        if (!professional) {
          ack?.({ ok: false, error: 'PROFESSIONAL_NOT_FOUND' });
          return;
        }
        await socket.join(agendaRoom(professional.id));
        ack?.({ ok: true });
      } catch (error) {
        console.error(error);
        ack?.({ ok: false, error: 'INTERNAL_ERROR' });
      }
    });
  });

  return io;
}

export function getRealtime(): Server | null {
  return io;
}
