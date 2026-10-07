import ChainlinkGame from "@/components/chainlink/game";
import { GameAbout } from "@/components/games/game-about";

export default function ChainlinkPage() {
  return (
    <>
      <main className="game-page cl-page">
        <div className="cl-col">
          <ChainlinkGame mode="daily" />
        </div>
      </main>
      <GameAbout gameId="chainlink" />
    </>
  );
}
