import { GAMES, type GameId } from "@/lib/games/registry";

export interface GameBrand {
  first: string;
  second: string;
  color: string;
}

export const GAME_BRANDS = Object.fromEntries(
  GAMES.map((game) => [game.id, game.brand]),
) as Record<GameId, GameBrand>;

export type GameBrandId = GameId;
