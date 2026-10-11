import type { Metadata } from "next";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";
import { parsePlayParams } from "@/lib/draft-landing/play-href";

export const metadata: Metadata = {
  title: "Start or join a draft",
  alternates: { canonical: "/draft-anything" },
  robots: { index: false, follow: true },
};

export default async function DraftAnythingPlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab, topic, code } = parsePlayParams(await searchParams);
  return <DraftLobbyPage initialTab={tab} initialTopic={topic} initialRoomCode={code} />;
}
