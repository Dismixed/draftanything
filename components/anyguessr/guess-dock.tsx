"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, rankCountries, type CountryItem } from "@/lib/anyguessr/country-list";
import { getIso2ForCca3, getLatLngForIso2, resolveGuessToCca3 } from "@/lib/anyguessr/country-geo";
import { normalizeAnswer } from "@/lib/anyguessr/normalize";
import type { MapSelection } from "./world-map";

const MAX_SUGGESTIONS = 5;

/** A typed country as a map selection. Countries the map data lacks still count as guesses. */
function selectionFor(name: string, iso2?: string): MapSelection {
  const at = iso2 ? getLatLngForIso2(iso2) : null;
  return { cca3: resolveGuessToCca3(name), name, lat: at?.[0] ?? 0, lng: at?.[1] ?? 0 };
}

/**
 * Suggestions for the typed text, best first. Another spelling of a country ("USA", "Holland",
 * "Burma") puts that country first, unless the text also starts a listed name ("Ni" stays
 * Niger, Nigeria, Nicaragua).
 */
function suggestionsFor(query: string): readonly CountryItem[] {
  const q = normalizeAnswer(query);
  if (!q) return [];
  const ranked = rankCountries(query);
  if (ranked[0] && normalizeAnswer(ranked[0].name).startsWith(q)) return ranked.slice(0, MAX_SUGGESTIONS);
  const cca3 = resolveGuessToCca3(query);
  const iso2 = cca3 ? getIso2ForCca3(cca3) : null;
  const named = iso2 ? COUNTRIES.find((c) => c.iso2 === iso2) : undefined;
  return (named ? [named, ...ranked.filter((c) => c !== named)] : ranked).slice(0, MAX_SUGGESTIONS);
}

/**
 * The guess bar: type a country or pick one on the map, then confirm. The map and this bar
 * share one selection, so picking in either place shows up in both.
 */
export function GuessDock({
  selection,
  onSelect,
  onConfirm,
  onEngage,
  busy,
}: {
  selection: MapSelection | null;
  onSelect: (next: MapSelection | null) => void;
  onConfirm: (name: string) => void;
  /** The player has clicked into the box or started typing. */
  onEngage?: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // While a country is picked (here or on the map) the box shows its name.
  const value = selection ? selection.name : query;
  const matches = useMemo(() => suggestionsFor(query), [query]);
  const showList = open && !selection && matches.length > 0;
  // Confirm guesses the picked country, or else the highlighted suggestion for the typed text,
  // so "Serb" then Confirm guesses Serbia. This holds after the list closes too: tapping
  // Confirm on a phone blurs the box and closes the list before the click lands.
  const guess = selection?.name ?? matches[active]?.name;

  const choose = (index: number) => {
    const country = matches[index];
    if (!country) return;
    onSelect(selectionFor(country.name, country.iso2));
    setOpen(false);
  };

  const confirmGuess = () => {
    if (!guess || busy) return;
    if (!selection) choose(active);
    onConfirm(guess);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!showList) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList) choose(active);
      else confirmGuess();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="ag-dock">
      {showList && (
        <ul className="ag-suggest" role="listbox" id="ag-suggest">
          {matches.map((country, i) => (
            <li key={country.iso2} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? "is-active" : undefined}
                // Keep focus in the input so typing can continue.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="ag-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <input
          type="text"
          value={value}
          placeholder="Type a country or pick it on the map"
          aria-label="Country"
          role="combobox"
          aria-expanded={showList}
          aria-controls="ag-suggest"
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            if (selection) onSelect(null);
            onEngage?.();
          }}
          onFocus={() => {
            setOpen(true);
            onEngage?.();
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </label>

      <button
        type="button"
        className="ag-cta"
        disabled={!guess || busy}
        onClick={confirmGuess}
      >
        {guess ? `Confirm ${guess}` : "Confirm"}
      </button>
    </div>
  );
}
