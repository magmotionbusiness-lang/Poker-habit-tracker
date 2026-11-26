import { ZodError } from "zod";

/** A short, human message from anything thrown (Zod issues, Errors, strings). */
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof ZodError) return e.issues[0]?.message ?? fallback;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}
