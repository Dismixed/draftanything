import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DailyIntroScope, IntroOnly, useReportIntroPhase } from "@/lib/daily-intro/intro-scope";
import type { IntroPhase } from "@/lib/daily-intro/use-daily-intro";

afterEach(cleanup);
function Report({ phase }: { phase: IntroPhase }) {
  useReportIntroPhase(phase);
  return null;
}
it("keeps About in HTML but hides it until saved progress has been checked", () => {
  const { rerender } = render(<DailyIntroScope><Report phase="checking" /><IntroOnly><p>About this game</p></IntroOnly></DailyIntroScope>);
  expect(screen.getByText("About this game")).not.toBeVisible();
  rerender(<DailyIntroScope><Report phase="intro" /><IntroOnly><p>About this game</p></IntroOnly></DailyIntroScope>);
  expect(screen.getByText("About this game")).toBeVisible();
  rerender(<DailyIntroScope><Report phase="game" /><IntroOnly><p>About this game</p></IntroOnly></DailyIntroScope>);
  expect(screen.queryByText("About this game")).not.toBeInTheDocument();
});
