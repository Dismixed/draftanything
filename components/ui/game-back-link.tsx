import Link from "next/link";

interface GameBackLinkProps {
  href?: string;
  color?: string;
}

export function GameBackLink({ href = "/", color = "#787c7e" }: GameBackLinkProps) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0 }}>
      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
          fontWeight: 500,
          color,
          textDecoration: "none",
          padding: "4px 0",
        }}
      >
        &larr; Back
      </Link>
    </div>
  );
}
