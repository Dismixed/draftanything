import ChainlinkGame from "@/components/chainlink/game";

export default function DailyPuzzlePage() {
  return (
    <main className="game-page cl-page">
      <div className="cl-col">
        <ChainlinkGame mode="daily" />
      </div>
    </main>
  );
}
