import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreezeFramesFinishResult } from "@/components/freezeframes/finish-result";

const rounds = [
  { answer: "Jaws", score: 820, correct: true },
  { answer: "Hey Ya!", score: 0, correct: false },
  { answer: "Lost", score: 640, correct: true },
  { answer: "Adele", score: 1000, correct: true },
];

const entry = (over = {}) => ({ name: "", onNameChange: vi.fn(), onSave: vi.fn(), saving: false, saved: false, ...over });

describe("FreezeFramesFinishResult", () => {
  afterEach(cleanup);

  it("shows the score out of the maximum and a row for each round", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry()} />);

    expect(screen.getByTestId("ff-fin-score")).toHaveTextContent("2,460/ 4,000");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("Jaws");
    expect(rows[0]).toHaveTextContent("+820");
    expect(rows[1]).toHaveTextContent("Hey Ya!");
    expect(rows[1]).not.toHaveTextContent("+");
  });

  it("shows only the total on a return visit", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={null} entry={null} />);

    expect(screen.getByTestId("ff-fin-score")).toHaveTextContent("2,460/ 4,000");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("saves a name to the leaderboard and then says so", async () => {
    const save = vi.fn();
    const { rerender } = render(
      <FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ name: "Josh", onSave: save })} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save score" }));
    expect(save).toHaveBeenCalledTimes(1);

    rerender(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ saved: true })} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Saved to the leaderboard.")).toBeInTheDocument();
  });

  it("disables the button while saving", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ saving: true })} />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
