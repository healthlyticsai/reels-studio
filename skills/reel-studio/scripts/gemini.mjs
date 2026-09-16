/**
 * Thin shared wrapper around the Gemini generateContent endpoint.
 *
 * Two callers with slightly different needs: brief.mjs wants strict JSON back,
 * research.mjs wants JSON *and* Google Search grounding — and the API refuses
 * responseMimeType: application/json while a tool is enabled. So the JSON gets
 * asked for in the prompt and dug out of the prose here.
 */

export const MODEL = "gemini-3.1-pro-preview";

/** Pulls the first JSON object out of a response that may be fenced or chatty. */
export const extractJson = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("empty response");

  const candidates = [text];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      /* try the next shape */
    }
  }
  throw new Error("no valid JSON in response");
};

export const callGemini = async ({
  key,
  prompt,
  model = MODEL,
  temperature = 0.9,
  json = false,
  search = false,
}) => {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };

  // Grounding and forced-JSON output are mutually exclusive on this endpoint.
  if (search) body.tools = [{ google_search: {} }];
  else if (json) body.generationConfig.responseMimeType = "application/json";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const payload = await res.json();
  if (payload.error) throw new Error(`Gemini: ${payload.error.message}`);

  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
  if (!text.trim()) {
    throw new Error(`Gemini returned no text (finishReason: ${candidate?.finishReason ?? "unknown"})`);
  }

  const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter(Boolean)
    .map((w) => ({ title: w.title, uri: w.uri }));

  return { text, sources };
};
