/**
 * useRecentQueues — reactive hook over the MMKV recent-queues list.
 * Returns the sorted list (most-recent first) and helpers to save / remove entries.
 * Uses a simple state-copy pattern: mutating functions call setState so the
 * component re-renders without needing any subscription setup.
 */
import { useState, useCallback } from 'react';
import {
  getRecentQueues,
  saveRecentQueue,
  removeRecentQueue,
  type RecentQueue,
} from '../features/queue/services/api';

export function useRecentQueues() {
  const [queues, setQueues] = useState<RecentQueue[]>(() =>
    getRecentQueues().sort((a, b) => b.visitedAt - a.visitedAt),
  );

  const save = useCallback((id: string, name: string) => {
    saveRecentQueue(id, name);
    setQueues(getRecentQueues().sort((a, b) => b.visitedAt - a.visitedAt));
  }, []);

  const remove = useCallback((id: string) => {
    removeRecentQueue(id);
    setQueues(getRecentQueues().sort((a, b) => b.visitedAt - a.visitedAt));
  }, []);

  const refresh = useCallback(() => {
    setQueues(getRecentQueues().sort((a, b) => b.visitedAt - a.visitedAt));
  }, []);

  return { queues, save, remove, refresh };
}
