// status.ts
export type Status = "waiting" | "in_progress" | "served";

export const STATUS_LABEL: Record<Status, string> = {
  waiting: "waiting",
  in_progress: "In progress",
  served: "served",
};
