import "server-only";

import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { getReviewGrid, summarize, type ReviewContext } from "./service";
import type { ReviewSummary } from "./types";

const DAY_MS = 86_400_000;
const DEFAULT_EVERY_DAYS = 7;

export function isEmailDue(lastSentAt: string | null, now: Date, everyDays: number): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - new Date(lastSentAt).getTime() >= everyDays * DAY_MS;
}

const fmt = (date: string, withWeekday = false) =>
  new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      ...(withWeekday ? { weekday: "short" } : {}),
    })
    .replace(",", "");

export function buildReviewEmail(summary: ReviewSummary, dates: string[], siteUrl: string) {
  const link = `${siteUrl.replace(/\/$/, "")}/admin/review`;
  const range = `${fmt(dates[0]!)}–${fmt(dates[dates.length - 1]!)}`;
  const lines = summary.byGame
    .filter((g) => g.count > 0)
    .map((g) => `${g.name} — ${g.count} unreviewed, first: ${fmt(g.first!, true)}`);

  const subject = `${summary.total} dailies need review (${range})`;
  const text = [...lines, "", `Review: ${link}`].join("\n");
  const html = `<p>${lines.map(escapeHtml).join("<br>")}</p>
<p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#ff6b1a;color:#121213;border-radius:8px;text-decoration:none;font-weight:600">Review dailies</a></p>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Emails the admins when the last email is at least REVIEW_EMAIL_EVERY_DAYS
 * old and something in the window is unreviewed. A failed send throws and
 * records nothing, so the next cron run tries again.
 */
export async function sendReviewEmailIfDue(
  ctx: ReviewContext,
  options: { now?: Date; send?: typeof sendEmail; configured?: () => boolean } = {},
): Promise<{ sent: boolean; reason: string; unreviewed?: number }> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendEmail;
  const configured = options.configured ?? isEmailConfigured;

  if (!configured()) return { sent: false, reason: "SMTP not configured" };

  const everyDays = Number(process.env.REVIEW_EMAIL_EVERY_DAYS) || DEFAULT_EVERY_DAYS;
  if (!isEmailDue(await ctx.store.lastEmailSentAt(), now, everyDays)) {
    return { sent: false, reason: "not due" };
  }

  const grid = await getReviewGrid(ctx, now.toISOString().slice(0, 10));
  const summary = summarize(grid);
  if (summary.total === 0) return { sent: false, reason: "nothing to review" };

  const to = adminEmails();
  if (to.length === 0) return { sent: false, reason: "ADMIN_EMAILS is empty" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await send({ to, ...buildReviewEmail(summary, grid.dates, siteUrl) });
  await ctx.store.recordEmail(summary.total);
  return { sent: true, reason: "sent", unreviewed: summary.total };
}
