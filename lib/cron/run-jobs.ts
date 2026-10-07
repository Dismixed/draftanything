export type JobReport = Record<
  string,
  { ok: true; result: unknown } | { ok: false; error: string }
>;

/**
 * Runs every job and reports each outcome by name. One game's job failing
 * must not stop the others from scheduling their day.
 */
export async function runJobs(jobs: Record<string, () => Promise<unknown>>): Promise<JobReport> {
  const report: JobReport = {};
  await Promise.all(
    Object.entries(jobs).map(async ([name, job]) => {
      try {
        report[name] = { ok: true, result: await job() };
      } catch (err) {
        report[name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
  return report;
}
