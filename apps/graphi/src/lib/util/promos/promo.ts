import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import type { Component } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import { localStorage, persist } from '../persist';
import April2025 from './April2025.svelte';
import NewYear2026 from './NewYear2026.svelte';

dayjs.extend(duration);

interface Promotion {
  startDate: Date;
  endDate: Date;
  component: Component;
  hideDurationMs: number;
}

const promotions: Record<string, Promotion> = {
  'promo-newyear-2026': {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-14'),
    component: NewYear2026,
    hideDurationMs: dayjs.duration(1, 'week').asMilliseconds()
  },
  'promo-april-2025': {
    startDate: new Date('2025-04-01'),
    endDate: new Date('2028-12-31'),
    component: April2025,
    hideDurationMs: dayjs.duration(1, 'week').asMilliseconds()
  }
};

export const dismissPromotion = (id?: string): void => {
  if (!id || !promotions[id]) {
    return;
  }
  hiddenPromotionsStore.update((dismissedIDs) => {
    dismissedIDs[id] = dayjs().add(promotions[id].hideDurationMs).valueOf();
    return dismissedIDs;
  });
};

const hiddenPromotionsStore: Writable<Record<string, number>> = persist(
  writable({}),
  localStorage(),
  'hiddenPromotions'
);

export const getActivePromotion = (): (Promotion & { id: string }) | undefined => {
  return undefined;
};
