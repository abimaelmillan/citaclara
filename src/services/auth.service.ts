import { env } from '../config/env.js';
import { User, type UserDocument } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { signAccessToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { slugify } from '../utils/slug.js';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  specialty?: string;
  timezone?: string;
}

interface AuthResult {
  user: UserDocument;
  token: string;
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'profesional';
  let candidate = base;
  for (let suffix = 2; await User.exists({ slug: candidate }); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function registerProfessional(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Ya existe una cuenta con ese correo');
  }

  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    specialty: input.specialty ?? '',
    slug: await generateUniqueSlug(input.name),
    timezone: input.timezone ?? env.defaultTimezone
  });

  return { user, token: signAccessToken(user.id, user.role) };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
  }
  return { user, token: signAccessToken(user.id, user.role) };
}

export async function getProfile(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'El usuario no existe');
  return user;
}
