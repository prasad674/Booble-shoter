export type ModifierId = "lockdown" | "marksman" | "swarm" | "scarce";

export type Modifiers = Record<ModifierId, boolean>;

export const MODIFIERS: {
  id: ModifierId;
  label: string;
  description: string;
}[] = [
  {
    id: "lockdown",
    label: "Harder lockdown",
    description: "30% less air before the door seals.",
  },
  {
    id: "marksman",
    label: "Hunter accuracy",
    description: "Hunters aim true — almost no bullet spread.",
  },
  {
    id: "swarm",
    label: "Swarm protocol",
    description: "50% more hunters in the corridor.",
  },
  {
    id: "scarce",
    label: "Scarce rounds",
    description: "30% fewer rounds in your magazine.",
  },
];

export const NO_MODIFIERS: Modifiers = {
  lockdown: false,
  marksman: false,
  swarm: false,
  scarce: false,
};

export function tuning(level: number, mods: Modifiers) {
  const hunters = Math.min(
    Math.round(Math.min(3 + Math.floor(level * 1.6), 22) * (mods.swarm ? 1.5 : 1)),
    32,
  );
  const timeLimitBase = Math.max(75 - level * 3, 30);
  const ammoBase = Math.max(60 - level * 2, 24);
  return {
    hunters,
    hunterSpeed: Math.min(0.9 + level * 0.16, 3.4),
    fireRate: Math.max(1500 - level * 95, 380),
    timeLimit: Math.max(Math.round(timeLimitBase * (mods.lockdown ? 0.7 : 1)), 18),
    ammo: Math.max(Math.round(ammoBase * (mods.scarce ? 0.7 : 1)), 14),
    spread: mods.marksman ? 0.03 : Math.max(0.24 - level * 0.006, 0.1),
    modifiers: mods,
  };
}
