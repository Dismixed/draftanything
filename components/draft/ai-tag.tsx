/** Marks a player as an AI drafter wherever names are shown. */
export function AiTag() {
  return (
    <span
      aria-label="AI drafter"
      style={{
        display: 'inline-block',
        border: '1px solid var(--border-hi)',
        color: 'var(--text)',
        opacity: 0.85,
        fontSize: '8px',
        fontStyle: 'normal',
        fontWeight: 600,
        letterSpacing: '0.2em',
        lineHeight: 1.4,
        textTransform: 'uppercase',
        padding: '1px 5px 1px 6px',
        marginLeft: '6px',
        verticalAlign: 'middle',
        fontFamily: 'Outfit, sans-serif',
        flexShrink: 0,
      }}
    >
      AI
    </span>
  );
}
