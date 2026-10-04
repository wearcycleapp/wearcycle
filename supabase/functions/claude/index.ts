// Supabase Edge Function "claude": the only place that holds your Anthropic API key.
// The app sends a task ("tag", "check" or "ideas"); prompts are built here so the key
// cannot be used as a general-purpose Claude proxy.
// Supabase verifies the caller's sign-in token before this code runs (JWT verification is on by default).
//
// Secrets (Edge Functions > Secrets in the dashboard):
//   ANTHROPIC_API_KEY  required
//   CLAUDE_MODEL       optional, defaults to claude-sonnet-5-5

const API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CATEGORIES = ["top", "bottom", "onepiece", "outerwear", "shoes", "watch", "belt", "hat", "bag", "other"];
const COLORS = ["black", "white", "grey", "navy", "beige", "khaki", "brown", "denim", "olive", "red", "burgundy", "pink",
  "orange", "yellow", "green", "teal", "lightblue", "blue", "purple"];
const SCALE = "Condition scale: 5 = like new; 4 = good, no visible wear; 3 = visible wear such as pilling, fading or a " +
  "stretched collar, fine for home; 2 = worn out with stains, small holes or broken stitching, only for chores; " +
  "1 = unusable or beyond repair.";

function prompt(task: string, b: Record<string, unknown>): string | null {
  const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  if (task === "tag") {
    return "You are cataloguing one clothing item or accessory from a photo for a personal wardrobe app.\n" +
      `Reply with only JSON in this shape: {"name": string (2-4 words), "category": one of [${CATEGORIES.join(", ")}], ` +
      `"colors": array of 1-3 values from [${COLORS.join(", ")}], dominant first, ` +
      '"formality": 1-5 (1 athletic or lounge, 2 casual, 3 smart casual, 4 business, 5 formal), ' +
      '"occasions": subset of [work, out, sport, home, chores] where wearing it would be appropriate, ' +
      '"condition": 1-5, "issues": array of short visible defects (empty if none), "confidence": "low" | "medium" | "high"}.\n' +
      SCALE + '\nJudge only what is visible. If the photo does not show clothing or an accessory, reply {"error": "short reason"}.';
  }
  if (task === "check") {
    return `Assess the physical condition of this clothing item from the photo. The owner calls it "${s(b.name, 80)}" (${s(b.category, 30)}). ` +
      SCALE + '\nReply with only JSON: {"condition": 1-5, "issues": array of short visible defects, ' +
      '"recommendation": "keep" | "downgrade" | "retire", "summary": one sentence, "confidence": "low" | "medium" | "high"}. ' +
      'Use "downgrade" when it is fine for home or chores but not for work or going out. ' +
      "Set confidence to low when lighting, angle or resolution hide detail.";
  }
  if (task === "ideas") {
    return "Help one person fill gaps in their wardrobe so they always have outfits ready for work, going out, sport, home and chores.\n\n" +
      "Their closet:\n" + s(b.closet, 12000) + "\n\nGaps (have/target):\n" + s(b.gaps, 2000) +
      "\n\nSuggest 6 specific pieces to buy that add the most new combinations with what they already own, prioritising the gaps " +
      "and replacements for condition 1 items. No brand names. Reply with only a JSON array of objects: " +
      '{"item": string, "color": string, "occasion": one of work|out|sport|home|chores, "pairsWith": array of up to 3 item names from their closet, "why": one short sentence}.';
  }
  return null;
}

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* fall through */ } }
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fall through */ } }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const task = String(body.task ?? "");
  const text = prompt(task, body);
  if (!text) return json({ error: "unknown_task" }, 400);

  const content: unknown[] = [];
  if (task === "tag" || task === "check") {
    const image = String(body.image ?? "");
    if (!image || image.length > 6_000_000) return json({ error: "image_missing_or_too_large" }, 400);
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
  }
  content.push({ type: "text", text });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: task === "ideas" ? 1500 : 600, messages: [{ role: "user", content }] }),
  });

  if (res.status === 429) return json({ error: "rate_limited" }, 429);
  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic error", res.status, detail.slice(0, 500));
    return json({ error: res.status === 401 ? "invalid_api_key" : `anthropic_${res.status}` }, 502);
  }
  const data = await res.json();
  const out = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  const result = extractJson(out);
  if (result === null) return json({ error: "unreadable_answer" }, 502);
  return json({ result, usage: data.usage ?? null });
});
