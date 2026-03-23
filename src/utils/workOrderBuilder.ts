/**
 * Work Order distribution and planning logic.
 * Responsible for mapping accounts → WOs with dates, priorities, etc.
 */
import type { ServiceAccount, Priority } from '../types/fieldService';
import type { WOGenerationParams, WODistributionPlan } from '../types/generator';
import { distributeDates } from './dateDistributor';

/** Randomly pick from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build a distribution plan:
 *   - Assigns each Work Order an account, a date, and a priority
 *   - Handles "more WOs than accounts" via round-robin
 */
export function buildDistributionPlan(
  accounts: ServiceAccount[],
  params: WOGenerationParams,
  availablePriorities: Priority[]
): WODistributionPlan[] {
  if (accounts.length === 0 || params.targetCount === 0) return [];

  const count = params.targetCount;
  const dates = distributeDates(count, params.fromDate, params.toDate, params.distributionMode);

  // Build account pool: if targetCount > accounts, repeat round-robin
  const accountPool: ServiceAccount[] = [];
  for (let i = 0; i < count; i++) {
    accountPool.push(accounts[i % accounts.length]);
  }

  // Shuffle account pool so same account doesn't always get consecutive WOs
  const shuffled = [...accountPool].sort(() => Math.random() - 0.5);

  return shuffled.map((account, index) => {
    let priority: Priority | null = null;

    if (params.priorityMode === 'fixed' && params.priorityId) {
      priority = availablePriorities.find((p) => p.msdyn_priorityid === params.priorityId) ?? null;
    } else if (params.priorityMode === 'random' && availablePriorities.length > 0) {
      priority = pickRandom(availablePriorities);
    }

    return {
      account,
      scheduledDate: dates[index],
      priority,
      index,
    };
  });
}

/** Format duration in minutes to human-readable string */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format date for display */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Summary stats for a distribution plan */
export function summarizePlan(plan: WODistributionPlan[]): {
  uniqueAccounts: number;
  dateRange: { min: Date; max: Date } | null;
  priorityCounts: Record<string, number>;
} {
  if (plan.length === 0) {
    return { uniqueAccounts: 0, dateRange: null, priorityCounts: {} };
  }

  const accountIds = new Set(plan.map((p) => p.account.accountid));
  const dates = plan.map((p) => p.scheduledDate);
  const priorityCounts: Record<string, number> = {};

  for (const p of plan) {
    const key = p.priority?.msdyn_name ?? 'No Priority';
    priorityCounts[key] = (priorityCounts[key] ?? 0) + 1;
  }

  return {
    uniqueAccounts: accountIds.size,
    dateRange: {
      min: new Date(Math.min(...dates.map((d) => d.getTime()))),
      max: new Date(Math.max(...dates.map((d) => d.getTime()))),
    },
    priorityCounts,
  };
}
