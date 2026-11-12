export function secureCookiesFromEnv(env = process.env) {
  if (env.SECURE_COOKIES === undefined) return env.NODE_ENV === "production";
  if (env.SECURE_COOKIES === "true") return true;
  if (env.SECURE_COOKIES === "false") return false;
  throw new Error("SECURE_COOKIES must be true or false.");
}
