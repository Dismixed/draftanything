import type { PublicAward, PublicDraftResult } from "./build-public-result";

export const RESULT_CARD_COLORS = {
  bg: "#07090f",
  panel: "#0b0e1c",
  border: "#181d33",
  borderHi: "#222744",
  gold: "#c9a84c",
  goldHi: "#f0c860",
  cyan: "#00e5ff",
  text: "#ddd8cc",
  textDim: "#6a7090",
} as const;

const AWARD_LABELS: Record<PublicAward["type"], string> = {
  bestPick: "Best Pick",
  worstPick: "Worst Pick",
  biggestSteal: "Biggest Steal",
};

function getAwardSymbol(type: PublicAward["type"]): { symbol: string; color: string } {
  if (type === "bestPick") return { symbol: "◆", color: RESULT_CARD_COLORS.gold };
  if (type === "worstPick") return { symbol: "◈", color: "#ff4d4d" };
  return { symbol: "◉", color: RESULT_CARD_COLORS.cyan };
}

function getRankBadgeStyle(rank: number | null | undefined) {
  if (rank === 1) {
    return {
      background: "rgba(201,168,76,0.15)",
      color: RESULT_CARD_COLORS.goldHi,
      border: "1px solid rgba(201,168,76,0.35)",
    };
  }
  if (rank === 2) {
    return {
      background: "rgba(180,180,200,0.1)",
      color: "#a0a8c0",
      border: "1px solid rgba(180,180,200,0.25)",
    };
  }
  if (rank === 3) {
    return {
      background: "rgba(200,120,50,0.1)",
      color: "#c87832",
      border: "1px solid rgba(200,120,50,0.25)",
    };
  }
  return {
    background: RESULT_CARD_COLORS.border,
    color: RESULT_CARD_COLORS.textDim,
    border: `1px solid ${RESULT_CARD_COLORS.borderHi}`,
  };
}

interface ResultCardImageProps {
  result: PublicDraftResult;
}

export function ResultCardImage({ result }: ResultCardImageProps) {
  const sortedRanking = [...result.ranking].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity),
  );
  const winner = result.winner;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: RESULT_CARD_COLORS.bg,
        fontFamily: "Outfit, sans-serif",
        color: RESULT_CARD_COLORS.text,
        padding: "32px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.07), transparent)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: RESULT_CARD_COLORS.panel,
          border: `1px solid ${RESULT_CARD_COLORS.borderHi}`,
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 24,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              width: "42%",
              minWidth: 0,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: RESULT_CARD_COLORS.gold,
                  margin: "0 0 8px 0",
                }}
              >
                Draft Complete
              </p>
              <h1
                style={{
                  fontFamily: "Playfair Display",
                  fontStyle: "italic",
                  fontSize: 30,
                  fontWeight: 700,
                  color: RESULT_CARD_COLORS.text,
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {result.topic}
              </h1>
            </div>

            {winner && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  background:
                    "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  padding: "28px 24px",
                  textAlign: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.1), transparent)",
                  }}
                />
                <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.35em",
                      textTransform: "uppercase",
                      color: RESULT_CARD_COLORS.gold,
                      margin: "0 0 10px 0",
                    }}
                  >
                    Winner
                  </p>
                  <h2
                    style={{
                      fontFamily: "Playfair Display",
                      fontSize: 42,
                      fontWeight: 900,
                      fontStyle: "italic",
                      color: RESULT_CARD_COLORS.goldHi,
                      margin: "0 0 12px 0",
                      lineHeight: 1,
                    }}
                  >
                    {winner.displayName}
                  </h2>
                  {winner.score !== null && (
                    <p
                      style={{
                        fontSize: 48,
                        fontWeight: 900,
                        fontFamily: "Playfair Display",
                        color: RESULT_CARD_COLORS.gold,
                        lineHeight: 1,
                        margin: "0 0 8px 0",
                      }}
                    >
                      {winner.score.toFixed(1)}
                      <span
                        style={{
                          fontSize: 18,
                          color: RESULT_CARD_COLORS.textDim,
                          fontWeight: 400,
                        }}
                      >
                        /10
                      </span>
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: RESULT_CARD_COLORS.textDim, margin: 0 }}>
                    Best draft of{" "}
                    <span style={{ color: RESULT_CARD_COLORS.text, fontStyle: "italic" }}>
                      {result.topic}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                background: RESULT_CARD_COLORS.panel,
                border: `1px solid ${RESULT_CARD_COLORS.borderHi}`,
                position: "relative",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)",
                }}
              />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: RESULT_CARD_COLORS.textDim,
                  padding: "14px 16px 0",
                  margin: 0,
                }}
              >
                Final Rankings
              </p>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {sortedRanking.map((player, index) => {
                  const badgeStyle = getRankBadgeStyle(player.rank);
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom:
                          index < sortedRanking.length - 1
                            ? `1px solid ${RESULT_CARD_COLORS.border}`
                            : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            ...badgeStyle,
                          }}
                        >
                          {player.rank ?? "-"}
                        </div>
                        <span
                          style={{
                            fontFamily: "Playfair Display",
                            fontStyle: "italic",
                            fontSize: 16,
                            color: RESULT_CARD_COLORS.text,
                          }}
                        >
                          {player.displayName}
                        </span>
                      </div>
                      {player.score !== null && (
                        <span
                          style={{
                            color: RESULT_CARD_COLORS.gold,
                            fontFamily: "Playfair Display",
                            fontWeight: 700,
                            fontSize: 18,
                          }}
                        >
                          {player.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {(result.awards.length > 0 || result.topUndraftedPick) && (
              <div style={{ display: "flex", gap: 10 }}>
                {result.awards.map((award) => {
                  const { symbol, color } = getAwardSymbol(award.type);
                  return (
                    <div
                      key={award.type}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        background: RESULT_CARD_COLORS.panel,
                        border: `1px solid ${RESULT_CARD_COLORS.borderHi}`,
                        padding: "12px 10px",
                        textAlign: "center",
                        position: "relative",
                      }}
                    >
                      <span style={{ fontSize: 18, color, lineHeight: 1 }}>{symbol}</span>
                      <p
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: RESULT_CARD_COLORS.textDim,
                          margin: "6px 0 0",
                        }}
                      >
                        {AWARD_LABELS[award.type]}
                      </p>
                      <p
                        style={{
                          fontFamily: "Playfair Display",
                          fontStyle: "italic",
                          fontSize: 14,
                          color: RESULT_CARD_COLORS.goldHi,
                          margin: "4px 0 0",
                        }}
                      >
                        {award.itemName}
                      </p>
                    </div>
                  );
                })}
                {result.topUndraftedPick && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: RESULT_CARD_COLORS.panel,
                      border: `1px solid ${RESULT_CARD_COLORS.borderHi}`,
                      padding: "12px 10px",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 18, color: "#a78bfa", lineHeight: 1 }}>◇</span>
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: RESULT_CARD_COLORS.textDim,
                        margin: "6px 0 0",
                      }}
                    >
                      Top Undrafted
                    </p>
                    <p
                      style={{
                        fontFamily: "Playfair Display",
                        fontStyle: "italic",
                        fontSize: 14,
                        color: RESULT_CARD_COLORS.goldHi,
                        margin: "4px 0 0",
                      }}
                    >
                      {result.topUndraftedPick}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: RESULT_CARD_COLORS.textDim,
            opacity: 0.5,
            margin: "14px 0 0",
          }}
        >
          Draft Anything — stim-labs.app
        </p>
      </div>
    </div>
  );
}
