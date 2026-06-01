/**
 * Extract a human-readable message from an Angular HttpErrorResponse or plain Error.
 * FastAPI surfaces the useful text in `error.error.detail`; for 422 responses that
 * field is an array of Pydantic validation objects — this helper handles both cases.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error"
): string {
  if (error == null) return fallback;
  const e = error as Record<string, unknown>;
  if (typeof e["status"] === "number" && e["status"] === 0) {
    return "Cannot reach the server — check your connection or try again.";
  }
  const body = e["error"] as Record<string, unknown> | undefined;
  const detail = body?.["detail"];
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d: unknown) => {
        const item = d as Record<string, unknown>;
        return typeof item?.["msg"] === "string"
          ? item["msg"]
          : JSON.stringify(d);
      })
      .join("; ");
  }
  return (
    (body?.["message"] as string | undefined) ||
    (e["message"] as string | undefined) ||
    fallback
  );
}
