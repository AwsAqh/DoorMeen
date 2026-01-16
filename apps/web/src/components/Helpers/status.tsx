// status.ts
import i18n from '../../i18n/config';

export type Status = "waiting" | "in_progress" | "served";

export const getStatusLabel = (status: Status): string => {
  const statusKey = status === 'in_progress' ? 'inProgress' : status;
  return i18n.t(`queue.status.${statusKey}`);
};

// Keep for backward compatibility, but use getStatusLabel for new code
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
