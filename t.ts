import { Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./src/lib/ai-gateway.server";
const g = createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!);
const r = streamText({ model: g("google/gemini-2.5-flash"), output: Output.object({ schema: z.object({ codename: z.string(), briefing: z.string() }) }), prompt: "Level 3 of a shooting escape game. codename + briefing." });
try { console.log(await r.output); } catch (e) { console.log("ERR", e); }
