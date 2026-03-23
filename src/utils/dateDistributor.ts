/**
 * Date distribution utilities for Work Order generation.
 * Distributes N dates within a given date range.
 */

/** Generate a random integer between min and max (inclusive) */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Get all business days (Mon-Fri) between two dates */
function getBusinessDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Get all calendar days between two dates (inclusive) */
function getAllDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Randomly distribute `count` dates within the date range */
export function distributeRandom(
  count: number,
  from: Date,
  to: Date,
  businessDaysOnly = false
): Date[] {
  const pool = businessDaysOnly ? getBusinessDays(from, to) : getAllDays(from, to);
  if (pool.length === 0) return Array(count).fill(new Date(from));

  return Array.from({ length: count }, () => {
    const day = pool[randomInt(0, pool.length - 1)];
    return new Date(day);
  });
}

/** Evenly distribute `count` dates within the date range */
export function distributeEven(
  count: number,
  from: Date,
  to: Date,
  businessDaysOnly = false
): Date[] {
  const pool = businessDaysOnly ? getBusinessDays(from, to) : getAllDays(from, to);
  if (pool.length === 0) return Array(count).fill(new Date(from));
  if (count === 1) return [pool[0]];

  const result: Date[] = [];
  if (pool.length >= count) {
    // Spread evenly across pool
    const step = (pool.length - 1) / (count - 1);
    for (let i = 0; i < count; i++) {
      result.push(new Date(pool[Math.round(i * step)]));
    }
  } else {
    // More WOs than days — round-robin
    for (let i = 0; i < count; i++) {
      result.push(new Date(pool[i % pool.length]));
    }
  }
  return result;
}

/** Distribute dates based on mode */
export function distributeDates(
  count: number,
  from: Date,
  to: Date,
  mode: 'random' | 'even'
): Date[] {
  return mode === 'random'
    ? distributeRandom(count, from, to)
    : distributeEven(count, from, to);
}
