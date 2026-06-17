import type { ReactNode } from "react";

export function ButtonSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      style={{ width: size, height: size, flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function ButtonLoadingLabel({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: ReactNode;
  loadingLabel: ReactNode;
}) {
  if (!loading) return <>{label}</>;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      <ButtonSpinner />
      {loadingLabel}
    </span>
  );
}
