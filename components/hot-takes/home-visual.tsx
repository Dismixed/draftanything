import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";
import { getLegacyDailyCategory } from "@/lib/hot-takes/categories";

const TIERS = [
  { label: "S", color: "#ff7a7a" },
  { label: "A", color: "#ffab6b" },
  { label: "B", color: "#ffd966" },
  { label: "C", color: "#e8ff70" },
  { label: "D", color: "#aaff70" },
];

export async function HotTakesHomeVisual() {
  let category = getLegacyDailyCategory();
  try {
    const db = createAdminClient();
    category = await getDailyCategoryForPlay(db);
  } catch {
    // fallback to legacy placeholders when DB unavailable
  }

  const itemsPerTier = 3;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: "0 20px",
        gap: "5px",
      }}
    >
      {TIERS.map((tier, tierIdx) => {
        const tierItems = category.items.slice(
          tierIdx * itemsPerTier,
          (tierIdx + 1) * itemsPerTier,
        );
        return (
          <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "18px",
                height: "18px",
                background: tier.color,
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 900,
                fontStyle: "italic",
                color: "#1a1a1a",
                flexShrink: 0,
              }}
            >
              {tier.label}
            </div>
            <div style={{ display: "flex", gap: "4px", flex: 1 }}>
              {tierItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                  title={item.label}
                >
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="22px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
