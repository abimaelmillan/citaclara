// Opciones de serialización compartidas por todos los modelos:
// expone `id` en lugar de `_id` y nunca devuelve campos sensibles.
export const jsonOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_document: unknown, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.passwordHash;
    delete ret.manageTokenHash;
    return ret;
  }
};
