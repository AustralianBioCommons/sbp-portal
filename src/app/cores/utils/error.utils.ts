/**
 * Extract a human-readable message from an Angular HttpErrorResponse or plain Error.
 * FastAPI surfaces the useful text in `error.error.detail`; this helper checks that
 * first before falling back to the generic Angular message.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error"
): string {
  if (error == null) return fallback;
  const e = error as Record<string, unknown>;
  const body = e["error"] as Record<string, unknown> | undefined;
  return (
    (body?.["detail"] as string | undefined) ||
    (body?.["message"] as string | undefined) ||
    (e["message"] as string | undefined) ||
    fallback
  );
}
