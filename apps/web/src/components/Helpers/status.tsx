// status.ts
export type Status = "waiting" | "in_progress" | "served";

export const STATUS_LABEL: Record<Status, string> = {
  waiting: "waiting",
  in_progress: "In progress",
  served: "served",
};

export const RANK: Record<Status, number> = {
  in_progress: 0,
  waiting: 1,
  served:3
};
