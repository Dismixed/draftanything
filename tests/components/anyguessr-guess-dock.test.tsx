import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GuessDock } from "@/components/anyguessr/guess-dock";
import type { MapSelection } from "@/components/anyguessr/world-map";

afterEach(cleanup);

function renderDock(selection: MapSelection | null = null, busy = false) {
  const onSelect = vi.fn();
  const onConfirm = vi.fn();
  render(<GuessDock selection={selection} onSelect={onSelect} onConfirm={onConfirm} busy={busy} />);
  const input = screen.getByRole("combobox", { name: "Country" });
  const type = (text: string) => {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
  };
  return { input, type, onSelect, onConfirm };
}

it("confirms a typed country without picking it from the list first", () => {
  const { type, onSelect, onConfirm } = renderDock();
  type("Serb");
  expect(onConfirm).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Confirm Serbia" }));
  expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Serbia", cca3: "SRB" }));
  expect(onConfirm).toHaveBeenCalledWith("Serbia");
});

it("still confirms when the box loses focus before the tap lands, as on a phone", () => {
  const { input, type, onConfirm } = renderDock();
  type("serbia");
  fireEvent.blur(input);
  expect(screen.queryByRole("listbox")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Confirm Serbia" }));
  expect(onConfirm).toHaveBeenCalledWith("Serbia");
});

it("only highlights the first suggestion for an ambiguous prefix", () => {
  const { type, onSelect, onConfirm } = renderDock();
  type("Ni");
  expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Niger");
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(expect.arrayContaining(["Nigeria", "Nicaragua"]));
  expect(onSelect).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Confirm Niger" })).toBeEnabled();
});

it("puts the country first for another spelling of its name", () => {
  const { type } = renderDock();
  type("USA");
  expect(screen.getByRole("button", { name: "Confirm United States" })).toBeEnabled();
  type("us");
  expect(screen.getByRole("option", { selected: true })).toHaveTextContent("United States");
  type("Holland");
  expect(screen.getByRole("button", { name: "Confirm Netherlands" })).toBeEnabled();
  // Text that starts a listed name keeps the list's order.
  type("uk");
  expect(screen.getByRole("button", { name: "Confirm Ukraine" })).toBeEnabled();
});

it("stays disabled with nothing to guess or while a guess is being checked", () => {
  const { type } = renderDock();
  expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  type("Qzx");
  expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  cleanup();

  renderDock(null, true).type("Serbia");
  expect(screen.getByRole("button", { name: "Confirm Serbia" })).toBeDisabled();
});

it("confirms a country picked on the map", () => {
  const { onConfirm } = renderDock({ cca3: "JPN", name: "Japan", lat: 36, lng: 138 });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Japan" }));
  expect(onConfirm).toHaveBeenCalledWith("Japan");
});
