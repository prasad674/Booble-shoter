type LevelMapProps = {
  cleared: number[];
  unlocked: number;
  current: number;
  onSelect: (level: number) => void;
};

export function LevelMap({ cleared, unlocked, current, onSelect }: LevelMapProps) {
  const total = Math.max(unlocked + 3, 9);
  const levels = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav aria-label="Level map" className="mt-6">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Level map</p>
      <ol className="mt-4 flex flex-wrap gap-3">
        {levels.map((n) => {
          const isCleared = cleared.includes(n);
          const isLocked = n > unlocked;
          const isCurrent = n === current && !isLocked;
          return (
            <li key={n}>
              <button
                type="button"
                disabled={isLocked}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(n)}
                className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border font-mono text-sm font-bold transition-colors ${
                  isLocked
                    ? "cursor-not-allowed border-border bg-secondary/40 text-muted-foreground/50"
                    : isCleared
                      ? "border-primary bg-primary/20 text-primary hover:bg-primary/30"
                      : "border-accent bg-card text-foreground hover:bg-secondary"
                } ${isCurrent ? "shadow-[var(--hud-glow)] ring-2 ring-accent" : ""}`}
                title={isLocked ? `Level ${n} locked` : `Play level ${n}`}
              >
                <span>{isLocked ? "🔒" : n}</span>
                {isCleared && <span className="text-[10px] tracking-widest">clear</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Clear a level to unlock the next node. Cleared nodes can be replayed anytime.
      </p>
    </nav>
  );
}
