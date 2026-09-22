/** Tag colours for a job status, shared by the jobs list and job details. */
export function statusTagClass(status: string): string {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Staging":
      return "bg-indigo-100 text-indigo-800";
    case "Pending":
      return "bg-sky-100 text-sky-800";
    case "In progress":
      return "bg-blue-100 text-blue-800";
    case "In queue":
      return "bg-gray-100 text-gray-800";
    case "Failed":
      return "bg-red-100 text-red-800";
    case "Stopped":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
