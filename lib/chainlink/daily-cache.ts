/**
 * Cache tag for one date's daily puzzle. The daily route caches under it and
 * the admin schedule routes expire it, so both must build it the same way.
 */
export const dailyChainTag = (date: string) => `chainlink-daily-${date}`;
