/** Shared identity contract. Domain-specific models belong in src/domain. */
export type Id = string;

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
