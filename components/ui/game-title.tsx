import type { CSSProperties, ElementType, ReactNode } from "react";
import { GAME_BRANDS, type GameBrandId } from "@/lib/game-branding";

interface GameTitleProps {
  game: GameBrandId;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  suffix?: ReactNode;
}

export function GameTitle({
  game,
  as: Tag = "span",
  className,
  style,
  suffix,
}: GameTitleProps) {
  const { first, second, color } = GAME_BRANDS[game];

  return (
    <Tag className={className} style={style}>
      {first}
      <span style={{ color }}>{second}</span>
      {suffix}
    </Tag>
  );
}
