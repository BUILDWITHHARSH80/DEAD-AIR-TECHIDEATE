// backend/config/environment.ts
/**
 * Helper for accessing runtime environment variables used by the backend.
 */
/** Returns the admin password stored in the environment.
 * Returns `null` when the variable is not defined – callers treat this as
 * "no admin credentials configured".
 */
export const adminPassword = (): string | null =>
  process.env.ADMIN_PASSWORD?.trim() ?? null;

/** Returns the host name of the deployed front‑end (Netlify site). */
export const deploymentHost = (): string =>
  process.env.DEPLOYMENT_HOST?.trim() ?? '';
