export function ProfileChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}
