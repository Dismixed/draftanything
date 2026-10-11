import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BallKnowledgeFinishResult } from "@/components/ball-knowledge/finish-result";
import type { AnswerEntry, LeaderboardEntry } from "@/lib/ball-knowledge/types";

const entries: AnswerEntry[] = [
  { id: "e0", text: "pepperoni", displayText: "Pepperoni", status: "ok", reason: "" },
  { id: "e1", text: "mushroom", displayText: "Mushrooms", status: "ok", reason: "" },
  { id: "e2", text: "gravel", displayText: "gravel", status: "bad", reason: "not valid" },
];
const board = [
  { id: "a", name: "Sam", score: 31 },
  { id: "b", name: "Josh", score: 2 },
] as LeaderboardEntry[];
const join = (over = {}) => ({ name: "", onNameChange: vi.fn(), onJoin: vi.fn(), joining: false, ...over });

function renderResult(over: Partial<ComponentProps<typeof BallKnowledgeFinishResult>> = {}) {
  return render(
    <BallKnowledgeFinishResult
      score={2}
      category="Pizza Toppings"
      entries={entries}
      join={join()}
      leaderboard={board}
      leaderboardLoading={false}
      myEntryId={null}
      {...over}
    />,
  );
}

describe("BallKnowledgeFinishResult", () => {
  afterEach(cleanup);

  it("shows the score, the category and today's top ten", () => {
    renderResult({ myEntryId: "b" });

    expect(screen.getByTestId("bk-fin-score")).toHaveTextContent("2");
    expect(screen.getByText("Pizza Toppings")).toBeInTheDocument();
    const rows = within(screen.getByTestId("bk-fin-board")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("1Sam31");
    expect(rows[1]).toHaveClass("me");
  });

  it("switches between accepted and missed answers", async () => {
    renderResult();

    expect(screen.getByText("Pepperoni")).toBeInTheDocument();
    expect(screen.queryByText("gravel")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Missed" }));
    expect(screen.getByText("gravel")).toBeInTheDocument();
    expect(screen.queryByText("Pepperoni")).toBeNull();
  });

  it("leaves out the answers and the name box on a return visit", () => {
    renderResult({ entries: null, join: null });

    expect(screen.queryByRole("button", { name: "Accepted" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByTestId("bk-fin-board")).toBeInTheDocument();
  });

  it("joins the leaderboard", async () => {
    const onJoin = vi.fn();
    renderResult({ join: join({ name: "Josh", onJoin }) });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it("says so when nobody has posted a score yet, and while loading", () => {
    const { rerender } = renderResult({ leaderboard: [] });
    expect(screen.getByText("No scores yet today.")).toBeInTheDocument();

    rerender(
      <BallKnowledgeFinishResult
        score={2}
        category="Pizza Toppings"
        entries={null}
        join={null}
        leaderboard={[]}
        leaderboardLoading
        myEntryId={null}
      />,
    );
    expect(screen.getByText("Loading leaderboard…")).toBeInTheDocument();
  });
});
