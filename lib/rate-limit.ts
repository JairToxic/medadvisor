/**
 * Rate limiter en memoria con ventana deslizante.
 * Se reinicia en cada despliegue (App Service Linux).
 * Suficiente para una demo pública por unos días.
 *
 * Para producción seria: Redis, Azure API Management o el rate-limit
 * nativo de Front Door.
 */

import "server-only";

const buckets = new Map<string, number[]>();
const ULTIMA_LIMPIEZA = { en: Date.now() };

function ipDe(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  return "unknown";
}

function limpiarCacheExpirado() {
  const ahora = Date.now();
  if (ahora - ULTIMA_LIMPIEZA.en < 60_000) return;
  ULTIMA_LIMPIEZA.en = ahora;
  for (const [k, arr] of buckets) {
    const recientes = arr.filter((t) => ahora - t < 3_600_000);
    if (recientes.length === 0) buckets.delete(k);
    else buckets.set(k, recientes);
  }
}

interface ResultadoLimite {
  ok: boolean;
  retryAfterSeconds?: number;
  remaining?: number;
}

/**
 * Comprueba si la IP puede hacer otra petición en este bucket.
 * Devuelve `ok: false` con `retryAfterSeconds` cuando está rate-limited.
 */
export function checkRateLimit(
  req: Request,
  key: string,
  max: number,
  windowMs: number,
): ResultadoLimite {
  limpiarCacheExpirado();
  const ip = ipDe(req);
  const ahora = Date.now();
  const k = `${ip}:${key}`;
  const arr = buckets.get(k) ?? [];
  const recientes = arr.filter((t) => ahora - t < windowMs);

  if (recientes.length >= max) {
    const retryMs = windowMs - (ahora - recientes[0]);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
      remaining: 0,
    };
  }

  recientes.push(ahora);
  buckets.set(k, recientes);
  return { ok: true, remaining: max - recientes.length };
}

export function respuesta429(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Demasiadas peticiones. Inténtalo en un momento.",
      retryAfter: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

/**
 * Verifica que el header Authorization traiga el token de admin.
 * Si ADMIN_TOKEN no está configurado en el server, denegamos por seguridad.
 */
export function tieneAdminToken(req: Request): boolean {
  const esperado = process.env.ADMIN_TOKEN;
  if (!esperado || esperado.length < 16) return false;
  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${esperado}`;
}
