// Leave balance ledger rules. Unused days carry forward one year only, if the leave type allows it, up to the type's
// cap, and they expire on 31 March of the new year. Pure: no database, no framework.

/** Days carried from last year into `year`. Zero when carry-forward is off, nothing is left, or the 31 March expiry has passed. */
export function carryForwardDays(input: {
  prevRemaining: number;
  limit: number | null;
  today: string;
  year: number;
  carries: boolean;
}): number {
  if (!input.carries || input.prevRemaining <= 0) return 0;
  if (input.today > `${input.year}-03-31`) return 0;
  return Math.min(input.prevRemaining, input.limit ?? Number.POSITIVE_INFINITY);
}
