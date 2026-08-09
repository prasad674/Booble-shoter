import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const LevelInput = z.object({ level: z.number().int().min(1).max(99) });

const LevelSchema = z.object({
  codename: z.string(),
  briefing: z.string(),
  hunterName: z.string(),
  taunt: z.string(),
  extractionLine: z.string(),
});

export type LevelBrief = z.infer<typeof LevelSchema> & {
  level: number;
  hunters: number;
  hunterSpeed: number;
  fireRate: number;
  timeLimit: number;
  ammo: number;
};

function tuning(level: number) {
  return {
    hunters: Math.min(3 + Math.floor(level * 1.6), 22),
    hunterSpeed: Math.min(0.9 + level * 0.16, 3.4),
    fireRate: Math.max(1500 - level * 95, 380),
    timeLimit: Math.max(75 - level * 3, 30),
    ammo: Math.max(60 - level * 2, 24),
  };
}

const fallback = (level: number): LevelBrief => ({
  level,
  codename: `Blacksite ${level}`,
  briefing:
    "Comms are down. Hunters are already inside the corridor. Clear them, then reach the extraction door before the lockdown seals it.",
  hunterName: "Hunter Squad",
  taunt: "You will not make the door.",
  extractionLine: "Door breached. Keep moving.",
  ...tuning(level),
});

export const generateLevel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LevelInput.parse(input))
  .handler(async ({ data }): Promise<LevelBrief> => {
    const key = process.env["LOVABLE_API_KEY"];
    const t = tuning(data.level);
    if (!key) return fallback(data.level);

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const result = streamText({
        model: gateway("google/gemini-2.5-flash"),
        output: Output.object({ schema: LevelSchema }),
        prompt: `You are the mission director of a tense top-down shooting-and-escape game.
Write level ${data.level} of an escalating campaign. Level 1 is tense; by level 20 it is nightmarish and claustrophobic.
This level has ${t.hunters} armed hunters, ${t.timeLimit} seconds of air, and ${t.ammo} rounds.

Rules: codename max 4 words. briefing max 2 sentences, second person, thriller tone, mention the escalating threat.
hunterName max 3 words. taunt max 12 words, spoken by the enemy. extractionLine max 10 words, spoken on escape.
No markdown, no quotes around fields.`,
      });
      const output = await result.output;
      return { ...output, level: data.level, ...t };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) return fallback(data.level);
      console.error("generateLevel failed", error);
      return fallback(data.level);
    }
  });
