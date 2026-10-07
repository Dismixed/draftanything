import { BrainDeadMenu } from "@/components/brain-dead/menu";
import { GameAbout } from "@/components/games/game-about";

export default function BrainDeadPage() {
  return (
    <>
      <BrainDeadMenu />
      <GameAbout gameId="brain-dead" />
    </>
  );
}
