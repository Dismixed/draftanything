import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { SHARE_IMAGE_SIZE } from "@/lib/og/metadata";
import { decodeResult, shareDare } from "@/lib/share/result-link";
import "./share-landing.css";

interface Props {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ r?: string | string[] }>;
}

function dailyGameId(value: string): DailyGameId | null {
  return (DAILY_GAMES as readonly string[]).includes(value) ? (value as DailyGameId) : null;
}

async function read({ params, searchParams }: Props) {
  const gameId = dailyGameId((await params).game);
  if (!gameId) notFound();
  const raw = (await searchParams).r;
  const encoded = typeof raw === "string" ? raw : undefined;
  return { gameId, game: getGame(gameId), encoded, result: decodeResult(encoded) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { gameId, game, encoded, result } = await read(props);
  const title = result ? `${game.name} · ${result.label}: ${result.lines[0]}` : game.name;
  const description = `${shareDare(gameId)} Play today's ${game.name} free on Stim Games.`;

  return {
    title: { absolute: title },
    description,
    // One page per shared result: useful in a chat, noise in search.
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      siteName: "Stim Games",
      type: "website",
      images: [
        {
          url: result && encoded ? `/og/result/${gameId}?r=${encoded}` : `/og/${gameId}`,
          ...SHARE_IMAGE_SIZE,
          alt: result ? `${game.name} result for ${result.label}` : `${game.name}: ${game.blurb}`,
        },
      ],
    },
  };
}

/** Where a friend's shared result lands: their result first, then today's puzzle. */
export default async function SharedResultPage(props: Props) {
  const { gameId, game, result } = await read(props);
  const playHref = `${game.playHref}?ref=share`;
  if (!result) redirect(playHref);

  const style = {
    "--sl-page": game.theme.page,
    "--sl-panel": game.theme.background,
    "--sl-border": game.theme.border,
    "--sl-accent": game.theme.accent,
    "--sl-brand": game.brand.color,
    "--sl-text": game.theme.text,
    "--sl-muted": game.theme.muted,
  } as CSSProperties;

  return (
    <main className="share-landing" style={style} data-game={gameId}>
      <div className="share-landing-inner">
        <p className="share-landing-kicker">A friend shared their result</p>

        <section className="share-landing-card" aria-label={`${game.name} result`}>
          <h1 className="share-landing-title">
            <span>{game.brand.first}</span>
            <span className="share-landing-brand">{game.brand.second}</span>
          </h1>
          <p className="share-landing-label">{result.label}</p>
          <div className="share-landing-lines">
            {result.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </section>

        <p className="share-landing-blurb">{game.blurb}</p>

        <Link href={playHref} className="share-landing-play">
          Play today&apos;s {game.name}
        </Link>
        <Link href="/" className="share-landing-more">
          See all daily games
        </Link>
      </div>
    </main>
  );
}
