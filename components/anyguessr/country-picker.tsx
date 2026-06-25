"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Country list — single global copy (zero deps, ~4KB)                */
/* ------------------------------------------------------------------ */

export interface CountryItem {
  name: string;
  iso2: string;
  flag: string; // emoji
}

/**
 * Curated, hand-verified list (name, ISO2, emoji flag) — used for the picker
 * UI. This is the player-facing display list only — the puzzle's authoritative
 * accepted spellings come from `alt_answers` (REST Countries' official +
 * altSpellings), matched via the server `looseEqual` normalizer. So adding a
 * country to the puzzles via the generator does not require updating this list
 * as long as its flag/name are already present here.
 */
export const COUNTRIES: readonly CountryItem[] = [
  { name: "Japan", iso2: "JP", flag: "🇯🇵" },
  { name: "France", iso2: "FR", flag: "🇫🇷" },
  { name: "Italy", iso2: "IT", flag: "🇮🇹" },
  { name: "Egypt", iso2: "EG", flag: "🇪🇬" },
  { name: "Brazil", iso2: "BR", flag: "🇧🇷" },
  { name: "India", iso2: "IN", flag: "🇮🇳" },
  { name: "China", iso2: "CN", flag: "🇨🇳" },
  { name: "Mexico", iso2: "MX", flag: "🇲🇽" },
  { name: "Spain", iso2: "ES", flag: "🇪🇸" },
  { name: "United Kingdom", iso2: "GB", flag: "🇬🇧" },
  { name: "United States", iso2: "US", flag: "🇺🇸" },
  { name: "Russia", iso2: "RU", flag: "🇷🇺" },
  { name: "Germany", iso2: "DE", flag: "🇩🇪" },
  { name: "South Korea", iso2: "KR", flag: "🇰🇷" },
  { name: "Thailand", iso2: "TH", flag: "🇹🇭" },
  { name: "Greece", iso2: "GR", flag: "🇬🇷" },
  { name: "Turkey", iso2: "TR", flag: "🇹🇷" },
  { name: "Portugal", iso2: "PT", flag: "🇵🇹" },
  { name: "Netherlands", iso2: "NL", flag: "🇳🇱" },
  { name: "Sweden", iso2: "SE", flag: "🇸🇪" },
  { name: "Norway", iso2: "NO", flag: "🇳🇴" },
  { name: "Morocco", iso2: "MA", flag: "🇲🇦" },
  { name: "Kenya", iso2: "KE", flag: "🇰🇪" },
  { name: "Australia", iso2: "AU", flag: "🇦🇺" },
  { name: "New Zealand", iso2: "NZ", flag: "🇳🇿" },
  { name: "Indonesia", iso2: "ID", flag: "🇮🇩" },
  { name: "Vietnam", iso2: "VN", flag: "🇻🇳" },
  { name: "Ireland", iso2: "IE", flag: "🇮🇪" },
  { name: "Switzerland", iso2: "CH", flag: "🇨🇭" },
  { name: "Argentina", iso2: "AR", flag: "🇦🇷" },
  { name: "South Africa", iso2: "ZA", flag: "🇿🇦" },
  { name: "Canada", iso2: "CA", flag: "🇨🇦" },
  { name: "Saudi Arabia", iso2: "SA", flag: "🇸🇦" },
  { name: "Peru", iso2: "PE", flag: "🇵🇪" },
  { name: "Jordan", iso2: "JO", flag: "🇯🇴" },
  { name: "Iceland", iso2: "IS", flag: "🇮🇸" },
  { name: "Poland", iso2: "PL", flag: "🇵🇱" },
  { name: "Austria", iso2: "AT", flag: "🇦🇹" },
  { name: "Belgium", iso2: "BE", flag: "🇧🇪" },
  { name: "Czech Republic", iso2: "CZ", flag: "🇨🇿" },
  { name: "Hungary", iso2: "HU", flag: "🇭🇺" },
  { name: "Denmark", iso2: "DK", flag: "🇩🇰" },
  { name: "Finland", iso2: "FI", flag: "🇫🇮" },
  { name: "Romania", iso2: "RO", flag: "🇷🇴" },
  { name: "Bulgaria", iso2: "BG", flag: "🇧🇬" },
  { name: "Croatia", iso2: "HR", flag: "🇭🇷" },
  { name: "Serbia", iso2: "RS", flag: "🇷🇸" },
  { name: "Ukraine", iso2: "UA", flag: "🇺🇦" },
  { name: "Iceland", iso2: "IS", flag: "🇮🇸" },
  { name: "Albania", iso2: "AL", flag: "🇦🇱" },
  { name: "Estonia", iso2: "EE", flag: "🇪🇪" },
  { name: "Latvia", iso2: "LV", flag: "🇱🇻" },
  { name: "Lithuania", iso2: "LT", flag: "🇱🇹" },
  { name: "Slovakia", iso2: "SK", flag: "🇸🇰" },
  { name: "Slovenia", iso2: "SI", flag: "🇸🇮" },
  { name: "Bosnia and Herzegovina", iso2: "BA", flag: "🇧🇦" },
  { name: "North Macedonia", iso2: "MK", flag: "🇲🇰" },
  { name: "Montenegro", iso2: "ME", flag: "🇲🇪" },
  { name: "Greece", iso2: "GR", flag: "🇬🇷" },
  { name: "Cyprus", iso2: "CY", flag: "🇨🇾" },
  { name: "Malta", iso2: "MT", flag: "🇲🇹" },
  { name: "Luxembourg", iso2: "LU", flag: "🇱🇺" },
  { name: "Monaco", iso2: "MC", flag: "🇲🇨" },
  { name: "Andorra", iso2: "AD", flag: "🇦🇩" },
  { name: "San Marino", iso2: "SM", flag: "🇸🇲" },
  { name: "Vatican City", iso2: "VA", flag: "🇻🇦" },
  { name: "Liechtenstein", iso2: "LI", flag: "🇱🇮" },
  { name: "Afghanistan", iso2: "AF", flag: "🇦🇫" },
  { name: "Pakistan", iso2: "PK", flag: "🇵🇰" },
  { name: "Bangladesh", iso2: "BD", flag: "🇧🇩" },
  { name: "Sri Lanka", iso2: "LK", flag: "🇱🇰" },
  { name: "Nepal", iso2: "NP", flag: "🇳🇵" },
  { name: "Bhutan", iso2: "BT", flag: "🇧🇹" },
  { name: "Maldives", iso2: "MV", flag: "🇲🇻" },
  { name: "Mongolia", iso2: "MN", flag: "🇲🇳" },
  { name: "Kazakhstan", iso2: "KZ", flag: "🇰🇿" },
  { name: "Uzbekistan", iso2: "UZ", flag: "🇺🇿" },
  { name: "Turkmenistan", iso2: "TM", flag: "🇹🇲" },
  { name: "Kyrgyzstan", iso2: "KG", flag: "🇰🇬" },
  { name: "Tajikistan", iso2: "TJ", flag: "🇹🇯" },
  { name: "Cambodia", iso2: "KH", flag: "🇰🇭" },
  { name: "Laos", iso2: "LA", flag: "🇱🇦" },
  { name: "Myanmar", iso2: "MM", flag: "🇲🇲" },
  { name: "Malaysia", iso2: "MY", flag: "🇲🇾" },
  { name: "Singapore", iso2: "SG", flag: "🇸🇬" },
  { name: "Brunei", iso2: "BN", flag: "🇧🇳" },
  { name: "Philippines", iso2: "PH", flag: "🇵🇭" },
  { name: "Taiwan", iso2: "TW", flag: "🇹🇼" },
  { name: "North Korea", iso2: "KP", flag: "🇰🇵" },
  { name: "Iran", iso2: "IR", flag: "🇮🇷" },
  { name: "Iraq", iso2: "IQ", flag: "🇮🇶" },
  { name: "Syria", iso2: "SY", flag: "🇸🇾" },
  { name: "Lebanon", iso2: "LB", flag: "🇱🇧" },
  { name: "Israel", iso2: "IL", flag: "🇮🇱" },
  { name: "Palestine", iso2: "PS", flag: "🇵🇸" },
  { name: "Jordan", iso2: "JO", flag: "🇯🇴" },
  { name: "Yemen", iso2: "YE", flag: "🇾🇪" },
  { name: "Oman", iso2: "OM", flag: "🇴🇲" },
  { name: "United Arab Emirates", iso2: "AE", flag: "🇦🇪" },
  { name: "Qatar", iso2: "QA", flag: "🇶🇦" },
  { name: "Bahrain", iso2: "BH", flag: "🇧🇭" },
  { name: "Kuwait", iso2: "KW", flag: "🇰🇼" },
  { name: "Algeria", iso2: "DZ", flag: "🇩🇿" },
  { name: "Tunisia", iso2: "TN", flag: "🇹🇳" },
  { name: "Libya", iso2: "LY", flag: "🇱🇾" },
  { name: "Sudan", iso2: "SD", flag: "🇸🇩" },
  { name: "South Sudan", iso2: "SS", flag: "🇸🇸" },
  { name: "Ethiopia", iso2: "ET", flag: "🇪🇹" },
  { name: "Eritrea", iso2: "ER", flag: "🇪🇷" },
  { name: "Djibouti", iso2: "DJ", flag: "🇩🇯" },
  { name: "Somalia", iso2: "SO", flag: "🇸🇴" },
  { name: "Tanzania", iso2: "TZ", flag: "🇹🇿" },
  { name: "Uganda", iso2: "UG", flag: "🇺🇬" },
  { name: "Rwanda", iso2: "RW", flag: "🇷🇼" },
  { name: "Burundi", iso2: "BI", flag: "🇧🇮" },
  { name: "Democratic Republic of the Congo", iso2: "CD", flag: "🇨🇩" },
  { name: "Republic of the Congo", iso2: "CG", flag: "🇨🇬" },
  { name: "Gabon", iso2: "GA", flag: "🇬🇦" },
  { name: "Equatorial Guinea", iso2: "GQ", flag: "🇬🇶" },
  { name: "Cameroon", iso2: "CM", flag: "🇨🇲" },
  { name: "Central African Republic", iso2: "CF", flag: "🇨🇫" },
  { name: "Chad", iso2: "TD", flag: "🇹🇩" },
  { name: "Niger", iso2: "NE", flag: "🇳🇪" },
  { name: "Nigeria", iso2: "NG", flag: "🇳🇬" },
  { name: "Benin", iso2: "BJ", flag: "🇧🇯" },
  { name: "Togo", iso2: "TG", flag: "🇹🇬" },
  { name: "Ghana", iso2: "GH", flag: "🇬🇭" },
  { name: "Ivory Coast", iso2: "CI", flag: "🇨🇮" },
  { name: "Liberia", iso2: "LR", flag: "🇱🇷" },
  { name: "Sierra Leone", iso2: "SL", flag: "🇸🇱" },
  { name: "Guinea", iso2: "GN", flag: "🇬🇳" },
  { name: "Guinea-Bissau", iso2: "GW", flag: "🇬🇼" },
  { name: "Senegal", iso2: "SN", flag: "🇸🇳" },
  { name: "Gambia", iso2: "GM", flag: "🇬🇲" },
  { name: "Mauritania", iso2: "MR", flag: "🇲🇷" },
  { name: "Mali", iso2: "ML", flag: "🇲🇱" },
  { name: "Burkina Faso", iso2: "BF", flag: "🇧🇫" },
  { name: "Cape Verde", iso2: "CV", flag: "🇨🇻" },
  { name: "Madagascar", iso2: "MG", flag: "🇲🇬" },
  { name: "Mauritius", iso2: "MU", flag: "🇲🇺" },
  { name: "Seychelles", iso2: "SC", flag: "🇸🇨" },
  { name: "Comoros", iso2: "KM", flag: "🇰🇲" },
  { name: "Mozambique", iso2: "MZ", flag: "🇲🇿" },
  { name: "Malawi", iso2: "MW", flag: "🇲🇼" },
  { name: "Zambia", iso2: "ZM", flag: "🇿🇲" },
  { name: "Zimbabwe", iso2: "ZW", flag: "🇿🇼" },
  { name: "Botswana", iso2: "BW", flag: "🇧🇼" },
  { name: "Namibia", iso2: "NA", flag: "🇳🇦" },
  { name: "Lesotho", iso2: "LS", flag: "🇱🇸" },
  { name: "Eswatini", iso2: "SZ", flag: "🇸🇿" },
  { name: "Angola", iso2: "AO", flag: "🇦🇴" },
  { name: "Colombia", iso2: "CO", flag: "🇨🇴" },
  { name: "Venezuela", iso2: "VE", flag: "🇻🇪" },
  { name: "Guyana", iso2: "GY", flag: "🇬🇾" },
  { name: "Suriname", iso2: "SR", flag: "🇸🇷" },
  { name: "Ecuador", iso2: "EC", flag: "🇪🇨" },
  { name: "Bolivia", iso2: "BO", flag: "🇧🇴" },
  { name: "Paraguay", iso2: "PY", flag: "🇵🇾" },
  { name: "Uruguay", iso2: "UY", flag: "🇺🇾" },
  { name: "Chile", iso2: "CL", flag: "🇨🇱" },
  { name: "Cuba", iso2: "CU", flag: "🇨🇺" },
  { name: "Dominican Republic", iso2: "DO", flag: "🇩🇴" },
  { name: "Haiti", iso2: "HT", flag: "🇭🇹" },
  { name: "Jamaica", iso2: "JM", flag: "🇯🇲" },
  { name: "Bahamas", iso2: "BS", flag: "🇧🇸" },
  { name: "Barbados", iso2: "BB", flag: "🇧🇧" },
  { name: "Trinidad and Tobago", iso2: "TT", flag: "🇹🇹" },
  { name: "Guatemala", iso2: "GT", flag: "🇬🇹" },
  { name: "Belize", iso2: "BZ", flag: "🇧🇿" },
  { name: "Honduras", iso2: "HN", flag: "🇭🇳" },
  { name: "El Salvador", iso2: "SV", flag: "🇸🇻" },
  { name: "Nicaragua", iso2: "NI", flag: "🇳🇮" },
  { name: "Costa Rica", iso2: "CR", flag: "🇨🇷" },
  { name: "Panama", iso2: "PA", flag: "🇵🇦" },
  { name: "Fiji", iso2: "FJ", flag: "🇫🇯" },
  { name: "Solomon Islands", iso2: "SB", flag: "🇸🇧" },
  { name: "Vanuatu", iso2: "VU", flag: "🇻🇺" },
  { name: "Samoa", iso2: "WS", flag: "🇼🇸" },
  { name: "Tonga", iso2: "TO", flag: "🇹🇴" },
  { name: "Papua New Guinea", iso2: "PG", flag: "🇵🇬" },
];

/* ------------------------------------------------------------------ */
/*  Normalization that mirrors the server's loose match                */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Substring/prefix fuzzy ranking. Returns matches sorted by score desc. */
function rank(query: string): readonly CountryItem[] {
  const q = normalize(query);
  if (!q) return COUNTRIES.slice(0, 50);

  const tokens = q.split(" ");
  const scored: Array<{ c: CountryItem; s: number }> = [];
  for (const c of COUNTRIES) {
    const n = normalize(c.name);
    let score = 0;
    if (n === q) score += 100;
    else if (n.startsWith(q)) score += 60;
    else if (n.includes(q)) score += 40;
    // Each query token contributes additive weight to handle multi-word queries.
    let allTokens = tokens.length > 0;
    for (const t of tokens) {
      if (!t) continue;
      if (n.includes(t)) score += 5;
      else allTokens = false;
    }
    if (score > 0 || allTokens) scored.push({ c, s: score });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 50).map((x) => x.c);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (countryName: string) => void;
}

export default function CountryPicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => rank(query), [query]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 16);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const picked = matches[hovered] ?? matches[0];
    if (picked) {
      onPick(picked.name);
      setQuery("");
    } else if (query.trim()) {
      // Allow the player to submit raw text — server normalizes and compares.
      onPick(query.trim());
      setQuery("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guess the country"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16vh 20px 20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "var(--ag-surface)",
          border: "1px solid var(--ag-border)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--ag-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setHovered((h) => Math.min(h + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHovered((h) => Math.max(h - 1, 0));
              }
            }}
            placeholder="Search countries…"
            aria-label="Search countries"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--ag-text)",
              fontSize: "15px",
              padding: "8px 4px",
            }}
          />
          <button
            onClick={onClose}
            aria-label="Close country picker"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ag-muted)",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          ref={listRef}
          style={{
            maxHeight: "52vh",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--ag-border) transparent",
          }}
        >
          {matches.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--ag-muted)",
                fontSize: "13px",
              }}
            >
              No country matches — submit your guess anyway and we&apos;ll
              normalize it for spelling.
            </div>
          ) : (
            matches.map((c, i) => (
              <button
                key={`${c.iso2}-${i}`}
                onClick={() => onPick(c.name)}
                onMouseEnter={() => setHovered(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background:
                    i === hovered ? "var(--ag-surface-hi)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--ag-border-faint)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ag-text)",
                  fontSize: "14px",
                  transition: "background 0.12s ease",
                }}
              >
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}