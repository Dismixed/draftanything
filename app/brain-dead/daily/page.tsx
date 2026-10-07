import BrainDeadGame from "@/components/brain-dead/game";

export default function DailyPage() {
  return (
    <main className="bd-page">
      <div className="bd-col">
        <BrainDeadGame mode="daily" categoryName="Daily Mix" />
      </div>
    </main>
  );
}
