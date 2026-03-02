import { format } from "date-fns";

export function formatDateTimeForJobs(dateString: string): string {
  return format(new Date(dateString), "dd-MM-yyyy hh:mmaaa");
}
