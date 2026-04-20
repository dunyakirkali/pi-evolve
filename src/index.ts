/**
 * /evolve — Genetic programming style brainstorming.
 *
 * Usage:
 *   /evolve I want a title in the lines of "interviewing in the post llm world"
 *
 * Flow:
 *   1. LLM generates 5 alternatives similar to the seed.
 *   2. You pick one with the selector (or ✓ Finalize, or ✗ Cancel).
 *   3. The picked one becomes the new seed → 5 more alternatives.
 *   4. Repeat until you finalize. The chosen text is dropped into the editor.
 */

import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const SYSTEM_PROMPT = [
	"You are a creative brainstorming engine used for genetic-programming style iteration.",
	"The user gives you a seed (e.g. a title, tagline, idea, name).",
	"Generate exactly 5 fresh alternatives in the same spirit / domain / tone as the seed.",
	"Rules:",
	"  • Each alternative should feel like a sibling of the seed, not a rephrasing.",
	"  • Vary angle, metaphor, cadence — explore the neighborhood, do not cluster.",
	"  • Keep them punchy and roughly the same length as the seed.",
	"  • No numbering, no quotes, no commentary — just the 5 lines.",
	"Output: exactly 5 lines, one alternative per line, nothing else.",
].join("\n");

function parseAlternatives(text: string): string[] {
	return text
		.split("\n")
		.map((l) => l.trim())
		// strip common list prefixes: "1.", "1)", "-", "*", "•"
		.map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, ""))
		// strip surrounding quotes
		.map((l) => l.replace(/^["'`“”‘’](.*)["'`“”‘’]$/, "$1").trim())
		.filter((l) => l.length > 0)
		.slice(0, 5);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("evolve", {
		description: "Genetic-programming brainstorm: generate 5 alternatives, pick one, repeat",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui?.notify?.("/evolve requires interactive UI", "warning");
				return;
			}

			let seed = (args ?? "").trim();
			if (!seed) {
				const input = await ctx.ui.input("Seed for /evolve:", "e.g. interviewing in the post llm world");
				if (!input) return;
				seed = input.trim();
				if (!seed) return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No active model — set one with /model first", "error");
				return;
			}
			const model = ctx.model;

			const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
			if (!auth.ok) {
				ctx.ui.notify(auth.error, "error");
				return;
			}
			if (!auth.apiKey) {
				ctx.ui.notify(`No API key for ${model.provider}/${model.id}`, "error");
				return;
			}

			const history: string[] = [seed];

			while (true) {
				ctx.ui.setStatus("evolve", `Evolving from: ${seed}`);

				let alternatives: string[] = [];
				try {
					const response = await complete(
						model,
						{
							systemPrompt: SYSTEM_PROMPT,
							messages: [
								{
									role: "user",
									content: [
										{
											type: "text",
											text: `Seed: ${seed}\n\nGenerate 5 alternatives in the same spirit.`,
										},
									],
									timestamp: Date.now(),
								},
							],
						},
						{ apiKey: auth.apiKey, headers: auth.headers },
					);
					const text = response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");
					alternatives = parseAlternatives(text);
				} catch (err) {
					ctx.ui.setStatus("evolve", undefined);
					ctx.ui.notify(`Generation failed: ${(err as Error).message}`, "error");
					return;
				}

				ctx.ui.setStatus("evolve", undefined);

				if (alternatives.length === 0) {
					ctx.ui.notify("Model returned no alternatives", "warning");
					return;
				}

				const FINALIZE = `✓ Finalize current seed: "${seed}"`;
				const CANCEL = "✗ Cancel";
				const options = [...alternatives, FINALIZE, CANCEL];

				const picked = await ctx.ui.select(
					`Pick one to evolve (history: ${history.length - 1} step${history.length - 1 === 1 ? "" : "s"})`,
					options,
				);

				if (!picked || picked === CANCEL) {
					ctx.ui.notify("Evolve cancelled", "info");
					return;
				}

				if (picked === FINALIZE) {
					ctx.ui.setEditorText(seed);
					ctx.ui.notify(`Finalized after ${history.length - 1} iteration${history.length - 1 === 1 ? "" : "s"} — inserted into editor`, "info");
					return;
				}

				seed = picked;
				history.push(seed);
			}
		},
	});
}
