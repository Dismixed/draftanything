interface TopUndraftedPickProps {
  itemName: string;
}

export function TopUndraftedPick({ itemName }: TopUndraftedPickProps) {
  return (
    <div>
      <p
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: "10px",
        }}
      >
        Left on the Board
      </p>
      <div className="panel-card" style={{ padding: "16px", textAlign: "center" }}>
        <span
          style={{
            fontSize: "20px",
            color: "#a78bfa",
            lineHeight: 1,
            display: "block",
          }}
        >
          ◇
        </span>
        <p
          style={{
            fontSize: "8px",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "8px 0 0",
          }}
        >
          Top Undrafted Pick
        </p>
        <p
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: "italic",
            fontSize: "16px",
            color: "var(--gold-hi)",
            marginTop: "6px",
            marginBottom: 0,
          }}
        >
          {itemName}
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: "4px 0 0" }}>
          Best item nobody drafted
        </p>
      </div>
    </div>
  );
}
