import { useCallback, useEffect, useRef, useState } from "react";

import type { LevelBrief } from "@/lib/level.functions";

type Vec = { x: number; y: number };
type Bullet = Vec & { vx: number; vy: number; hostile: boolean };
type Hunter = Vec & { hp: number; nextShot: number; alive: boolean };

export type RoundResult = { outcome: "escaped" | "down"; reason: string };

const W = 900;
const H = 560;
const PLAYER_SPEED = 3.4;
const BULLET_SPEED = 8;

function token(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function GameCanvas({
  brief,
  onFinish,
}: {
  brief: LevelBrief;
  onFinish: (result: RoundResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const [hud, setHud] = useState({
    hp: 100,
    ammo: brief.ammo,
    left: brief.hunters,
    time: brief.timeLimit,
    exitOpen: false,
  });

  const finish = useCallback(
    (result: RoundResult) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish(result);
    },
    [onFinish],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = {
      bg: token("--background", "#141a24"),
      grid: token("--border", "#3a4250"),
      player: token("--primary", "#f0a744"),
      hunter: token("--accent", "#e2523c"),
      exit: token("--chart-3", "#3ecf9a"),
      text: token("--foreground", "#f4f2ec"),
    };

    const player: Vec = { x: 80, y: H - 80 };
    const exit = { x: W - 70, y: 70, r: 26 };
    const bullets: Bullet[] = [];
    const hunters: Hunter[] = Array.from({ length: brief.hunters }, (_, i) => ({
      x: 220 + ((i * 137) % (W - 320)),
      y: 60 + ((i * 211) % (H - 200)),
      hp: 1 + Math.floor(brief.level / 6),
      nextShot: performance.now() + 800 + Math.random() * brief.fireRate,
      alive: true,
    }));

    let hp = 100;
    let ammo = brief.ammo;
    let timeLeft = brief.timeLimit;
    const keys = new Set<string>();
    const aim: Vec = { x: W / 2, y: H / 2 };
    let raf = 0;
    let last = performance.now();
    let shootCooldown = 0;
    let firing = false;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()))
        e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const toLocal = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      aim.x = ((e.clientX - rect.left) / rect.width) * W;
      aim.y = ((e.clientY - rect.top) / rect.height) * H;
    };
    const onMove = (e: MouseEvent) => toLocal(e);
    const onDown = (e: MouseEvent) => {
      toLocal(e);
      firing = true;
    };
    const onUp = () => {
      firing = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const shoot = () => {
      if (ammo <= 0 || shootCooldown > 0) return;
      const dx = aim.x - player.x;
      const dy = aim.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      bullets.push({
        x: player.x,
        y: player.y,
        vx: (dx / len) * BULLET_SPEED,
        vy: (dy / len) * BULLET_SPEED,
        hostile: false,
      });
      ammo -= 1;
      shootCooldown = 130;
    };

    const loop = (now: number) => {
      const dt = Math.min(now - last, 40);
      last = now;
      timeLeft -= dt / 1000;
      shootCooldown = Math.max(0, shootCooldown - dt);

      let dx = 0;
      let dy = 0;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      const mlen = Math.hypot(dx, dy) || 1;
      player.x = Math.max(16, Math.min(W - 16, player.x + (dx / mlen) * PLAYER_SPEED));
      player.y = Math.max(16, Math.min(H - 16, player.y + (dy / mlen) * PLAYER_SPEED));

      if (firing || keys.has(" ")) shoot();

      const aliveHunters = hunters.filter((h) => h.alive);
      for (const h of aliveHunters) {
        const hx = player.x - h.x;
        const hy = player.y - h.y;
        const hl = Math.hypot(hx, hy) || 1;
        if (hl > 90) {
          h.x += (hx / hl) * brief.hunterSpeed;
          h.y += (hy / hl) * brief.hunterSpeed;
        }
        if (now >= h.nextShot) {
          h.nextShot = now + brief.fireRate * (0.7 + Math.random() * 0.6);
          bullets.push({
            x: h.x,
            y: h.y,
            vx: (hx / hl) * (BULLET_SPEED * 0.55),
            vy: (hy / hl) * (BULLET_SPEED * 0.55),
            hostile: true,
          });
        }
      }

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const b = bullets[i];
        if (!b) continue;

        b.y += b.vy;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
          bullets.splice(i, 1);
          continue;
        }
        if (b.hostile) {
          if (Math.hypot(b.x - player.x, b.y - player.y) < 14) {
            hp -= 8 + brief.level;
            bullets.splice(i, 1);
          }
        } else {
          const hit = hunters.find((h) => h.alive && Math.hypot(b.x - h.x, b.y - h.y) < 16);
          if (hit) {
            hit.hp -= 1;
            if (hit.hp <= 0) hit.alive = false;
            bullets.splice(i, 1);
          }
        }
      }

      for (const h of aliveHunters) {
        if (Math.hypot(h.x - player.x, h.y - player.y) < 22) hp -= dt * 0.02 * brief.level;
      }

      const remaining = hunters.filter((h) => h.alive).length;
      const exitOpen = remaining === 0;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      for (let x = 0; x <= W; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.strokeStyle = colors.exit;
      ctx.fillStyle = colors.exit;
      ctx.globalAlpha = exitOpen ? 0.9 : 0.25;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, exit.r + (exitOpen ? Math.sin(now / 160) * 4 : 0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = exitOpen ? 0.35 : 0.1;
      ctx.fill();
      ctx.restore();

      for (const h of hunters) {
        if (!h.alive) continue;
        ctx.fillStyle = colors.hunter;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = colors.player;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
      ctx.fill();
      const ax = aim.x - player.x;
      const ay = aim.y - player.y;
      const al = Math.hypot(ax, ay) || 1;
      ctx.strokeStyle = colors.player;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + (ax / al) * 24, player.y + (ay / al) * 24);
      ctx.stroke();

      for (const b of bullets) {
        ctx.fillStyle = b.hostile ? colors.hunter : colors.text;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.hostile ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }

      setHud({
        hp: Math.max(0, Math.round(hp)),
        ammo,
        left: remaining,
        time: Math.max(0, Math.ceil(timeLeft)),
        exitOpen,
      });

      if (exitOpen && Math.hypot(player.x - exit.x, player.y - exit.y) < exit.r + 12) {
        finish({ outcome: "escaped", reason: brief.extractionLine });
        return;
      }
      if (hp <= 0) {
        finish({ outcome: "down", reason: `${brief.hunterName} took you down.` });
        return;
      }
      if (timeLeft <= 0) {
        finish({ outcome: "down", reason: "Lockdown sealed the corridor. No extraction." });
        return;
      }
      if (ammo <= 0 && remaining > 0 && bullets.every((b) => b.hostile)) {
        finish({ outcome: "down", reason: "Out of ammo with hunters still breathing." });
        return;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [brief, finish]);

  return (
    <div className="w-full">
      <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-xs uppercase tracking-widest sm:grid-cols-4">
        <Stat label="Vitals" value={`${hud.hp}%`} danger={hud.hp < 35} />
        <Stat label="Rounds" value={String(hud.ammo)} danger={hud.ammo < 8} />
        <Stat label="Hunters" value={String(hud.left)} danger={hud.left > 0} />
        <Stat label="Air" value={`${hud.time}s`} danger={hud.time < 12} />
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label="Shooting and escape arena"
        className="w-full cursor-crosshair rounded-sm border border-border shadow-[var(--danger-glow)]"
      />
      <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
        WASD move · mouse aim · click or space to fire ·{" "}
        {hud.exitOpen ? "extraction open — run" : "extraction locked until all hunters are down"}
      </p>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-card px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className={danger ? "text-lg text-destructive" : "text-lg text-primary"}>{value}</p>
    </div>
  );
}
