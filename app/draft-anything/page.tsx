import { GameAbout } from "@/components/games/game-about";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";

export default function DraftAnythingPage() {
  return (
    <>
      <DraftLobbyPage />
      <GameAbout gameId="draft-anything" />
    </>
  );
}
