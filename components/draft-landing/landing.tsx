import Link from "next/link";
import { HOT_CATEGORIES } from "@/components/lobby/hot-categories";
import { playHref } from "@/lib/draft-landing/play-href";
import { buildFaqJsonLd, getGameContent } from "@/lib/games/content";
import { JsonLdScript } from "@/lib/seo";
import { LandingLink } from "./landing-link";
import { RotatingTopic } from "./rotating-topic";

const TOPICS = [
  "comfort foods.",
  "movies of the 2010s.",
  "the greatest athletes.",
  "desert island items.",
  "albums of all time.",
];

const HERO_CHIPS = ["movies", "food", "sports", "gaming", "wild"];

const STEPS = [
  { title: "Pick a topic", body: "Anything you could make a list of. Films, snacks, holiday spots." },
  { title: "Share the code", body: "Friends join with a room code and a name. Nobody signs up." },
  { title: "Take turns picking", body: "Once something is taken, it is gone. Build the best lineup." },
  { title: "Defend and get judged", body: "Argue your case. The room votes, an AI judge rules, or both." },
];

const JUDGES = [
  { name: "The Analyst", line: "Maya took mac and cheese first overall. Correct, and it decided the draft." },
  { name: "The Hype Voice", line: "Ramen in round two?! That is a STEAL. Somebody check on Dev." },
  { name: "The Roaster", line: "Jo drafted plain toast. I have nothing further to add." },
];

function Actions({ position }: { position: "hero" | "closing" }) {
  return (
    <div className="dal-actions">
      <LandingLink href={playHref()} cta="start" position={position} className="dal-btn">
        Start a draft
      </LandingLink>
      <LandingLink href={playHref({ tab: "join" })} cta="join" position={position} className="dal-btn dal-btn-outline">
        Join a room
      </LandingLink>
      <LandingLink href={playHref({ tab: "solo" })} cta="solo" position={position} className="dal-btn dal-btn-ghost">
        Play solo
      </LandingLink>
    </div>
  );
}

/** The Draft Anything front door: what the game is, then three ways into the room screen. */
export function DraftLanding() {
  const content = getGameContent("draft-anything");
  const chips = HOT_CATEGORIES.filter((category) => HERO_CHIPS.includes(category.id));

  return (
    <main className="dal game-page">
      <header className="dal-top">
        <Link href="/" className="dal-top-back">
          ← Stim Games
        </Link>
        <span className="dal-wordmark" aria-hidden>
          Draft <em>Anything</em>
        </span>
        <span />
      </header>

      <section className="dal-hero">
        <p className="dal-eyebrow">Draft Anything · a party game for 1 to 6</p>
        <h1 className="dal-h1">
          Tonight we are drafting
          <RotatingTopic topics={TOPICS} />
        </h1>
        <p className="dal-lede">
          Pick a topic. Take turns choosing. Defend your lineup, then let the room or an AI judge decide who won.
        </p>
        <Actions position="hero" />
        <p className="dal-fine">Free. No accounts, no download.</p>
        <div className="dal-chips">
          {chips.map((category) => (
            <LandingLink
              key={category.id}
              href={playHref({ topic: category.topic })}
              cta="topic"
              position="hero"
              topic={category.topic}
              className="dal-chip"
            >
              <span aria-hidden>{category.emoji}</span> {category.topic}
            </LandingLink>
          ))}
        </div>
      </section>

      <section className="dal-sec" aria-labelledby="dal-how">
        <h2 id="dal-how">How a draft works</h2>
        <ol className="dal-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="dal-step-num" aria-hidden>
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dal-sec" aria-labelledby="dal-ideas-h">
        <h2 id="dal-ideas-h">Things people draft</h2>
        <div className="dal-ideas" data-testid="dal-ideas">
          {HOT_CATEGORIES.map((category) => (
            <LandingLink
              key={category.id}
              href={playHref({ topic: category.topic })}
              cta="topic"
              position="ideas"
              topic={category.topic}
              className="dal-idea"
            >
              <small>{category.label}</small>
              {category.topic}
            </LandingLink>
          ))}
        </div>
      </section>

      <section className="dal-sec" aria-labelledby="dal-judges-h">
        <h2 id="dal-judges-h">Pick your judge</h2>
        <div className="dal-judges">
          {JUDGES.map((judge) => (
            <figure key={judge.name} className="dal-judge">
              <figcaption>{judge.name}</figcaption>
              <blockquote>“{judge.line}”</blockquote>
            </figure>
          ))}
        </div>
      </section>

      <section className="dal-sec dal-faq" aria-labelledby="dal-faq-h">
        <h2 id="dal-faq-h">Questions</h2>
        {content.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
        {content.sections.slice(1).map((section) => (
          <details key={section.heading}>
            <summary>{section.heading}</summary>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </details>
        ))}
        <JsonLdScript data={buildFaqJsonLd("draft-anything")} />
      </section>

      <section className="dal-sec dal-close">
        <h2>Get the group chat ready.</h2>
        <Actions position="closing" />
      </section>

      <footer className="dal-foot">
        <Link href="/">All Stim Games →</Link>
      </footer>
    </main>
  );
}
