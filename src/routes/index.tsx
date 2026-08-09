import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";

import { GameCanvas, type RoundResult } from "@/components/GameCanvas";
import { generateLevel, type LevelBrief } from "@/lib/level.functions";
import { MODIFIERS, NO_MODIFIERS, type ModifierId, type Modifiers } from "@/lib/modifiers";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blacksite Run — AI Shooting & Escape Game" },
      {
        name: "description",
        content:
          "Fight through AI-generated hunter squads and reach extraction. Every level is written by AI and gets faster, deadlier and more thrilling.",
      },
      { property: "og:title", content: "Blacksite Run — AI Shooting & Escape Game" },
      {
        property: "og:description",
        content:
          "An AI mission director writes each level. Clear the hunters, beat the lockdown timer, escape.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Phase = "idle" | "loading" | "briefing" | "playing" | "result";

function Index() {
  const fetchLevel = useServerFn(generateLevel);
  const [phase, setPhase] = useState<Phase>("idle");
  const [brief, setBrief] = useState<LevelBrief | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [level, setLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [mods, setMods] = useState<Modifiers>(NO_MODIFIERS);

  const toggleMod = useCallback((id: ModifierId) => {
    setMods((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  const loadLevel = useCallback(
    async (next: number) => {
      setPhase("loading");
      setError(null);
      try {
        const data = await fetchLevel({ data: { level: next, modifiers: mods } });
        setBrief(data);
        setLevel(next);
        setPhase("briefing");
      } catch {
        setError("The mission director is unreachable. Try again in a moment.");
        setPhase("idle");
      }
    },
    [fetchLevel, mods],
  );


  const onFinish = useCallback((r: RoundResult) => {
    setResult(r);
    setPhase("result");
  }, []);

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ backgroundImage: "var(--gradient-arena)" }}
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-accent">
            AI mission director online
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-foreground sm:text-6xl">
            Blacksite Run
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Shoot your way through every hunter squad, then reach extraction before lockdown. Each
            level is written fresh by AI — and gets faster, tighter and nastier.
          </p>
        </header>

        {phase === "idle" && (
          <Panel>
            <h2 className="text-xl font-bold uppercase tracking-wide text-foreground">
              Level {level} standby
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Difficulty scales every level: more hunters, faster fire, less ammo, less time.
            </p>
            <ModifierToggles mods={mods} onToggle={toggleMod} />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <ActionButton onClick={() => loadLevel(level)}>Deploy</ActionButton>
          </Panel>

        )}

        {phase === "loading" && (
          <Panel>
            <p className="animate-pulse font-mono text-sm uppercase tracking-widest text-primary">
              Generating level {level}…
            </p>
          </Panel>
        )}

        {phase === "briefing" && brief && (
          <Panel>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              Level {brief.level} · {brief.codename}
            </p>
            <p className="mt-4 text-base text-foreground">{brief.briefing}</p>
            <p className="mt-4 border-l-2 border-destructive pl-3 font-mono text-sm text-muted-foreground">
              {brief.hunterName}: “{brief.taunt}”
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs uppercase tracking-widest sm:grid-cols-4">
              <Spec label="Hunters" value={String(brief.hunters)} />
              <Spec label="Rounds" value={String(brief.ammo)} />
              <Spec label="Air" value={`${brief.timeLimit}s`} />
              <Spec label="Fire rate" value={`${brief.fireRate}ms`} />
            </dl>
            <ActionButton onClick={() => setPhase("playing")}>Breach</ActionButton>
          </Panel>
        )}

        {phase === "playing" && brief && <GameCanvas brief={brief} onFinish={onFinish} />}

        {phase === "result" && result && brief && (
          <Panel>
            <h2
              className={`text-2xl font-black uppercase tracking-wide ${
                result.outcome === "escaped" ? "text-primary" : "text-destructive"
              }`}
            >
              {result.outcome === "escaped" ? "Extracted" : "You went down"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{result.reason}</p>
            <ModifierToggles mods={mods} onToggle={toggleMod} />
            <div className="mt-5 flex flex-wrap gap-3">

              {result.outcome === "escaped" ? (
                <ActionButton onClick={() => loadLevel(brief.level + 1)}>
                  Descend to level {brief.level + 1}
                </ActionButton>
              ) : (
                <ActionButton onClick={() => loadLevel(brief.level)}>Retry level</ActionButton>
              )}
              <ActionButton variant="ghost" onClick={() => loadLevel(1)}>
                Restart run
              </ActionButton>
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card/80 p-6 shadow-[var(--hud-glow)] backdrop-blur">
      {children}
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-secondary px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-base text-primary">{value}</dd>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "ghost";
}) {
  const base =
    "mt-6 inline-flex items-center justify-center rounded-sm px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors";
  const styles =
    variant === "solid"
      ? "bg-primary text-primary-foreground hover:bg-primary/85"
      : "border border-border bg-transparent text-muted-foreground hover:bg-secondary";
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
