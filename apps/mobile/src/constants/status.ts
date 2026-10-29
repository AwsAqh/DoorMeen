/**
 * Status types — mirrors apps/web/src/components/Helpers/status.tsx exactly.
 * Keep in sync with backend QueueCustomer.State string values.
 */

export type Status =
  | 'waiting'
  | 'in_progress'
  | 'served';

export const RANK: Record<Status, number> = {
  in_progress:          0,
  waiting:              1,
  served:               3,
};

/** Returns the i18n key path for a given status (use with t()) */
export const getStatusI18nKey = (status: Status): string => {
  const key = status === 'in_progress' ? 'inProgress' : status;
  return `queue.status.${key}`;
};
