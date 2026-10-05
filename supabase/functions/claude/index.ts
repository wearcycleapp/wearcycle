// Supabase Edge Function "claude": the only place that holds your Anthropic API key.
// The app sends a task ("tag", "box", "graphic", "check" or "ideas"); prompts are built here so the key
// cannot be used as a general-purpose Claude proxy.
// The function checks the caller's sign-in itself (see requireUser), so in the dashboard turn
// "Verify JWT with legacy secret" OFF, as Supabase recommends for projects using the new API keys.
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

const CATEGORIES = ["top", "bottom", "onepiece", "outerwear", "shoes", "socks", "watch", "belt", "hat", "bag", "other"];
const COLORS = ["black", "white", "grey", "navy", "beige", "khaki", "brown", "denim", "olive", "red", "burgundy", "pink",
  "orange", "yellow", "green", "teal", "lightblue", "blue", "purple"];
const BOX = '"box": [left, top, right, bottom] as fractions from 0 to 1 of the image width and height, a tight box around ' +
  'the whole item including sleeves, straps and soles';
const SCALE = "Condition scale: 5 = like new; 4 = good, no visible wear; 3 = visible wear such as pilling, fading or a " +
  "stretched collar, fine for home; 2 = worn out with stains, small holes or broken stitching, only for chores; " +
  "1 = unusable or beyond repair.";

const LANGS: Record<string, string> = { es: "Spanish", fr: "Canadian French", tl: "Filipino (Tagalog)", hi: "Hindi", ja: "Japanese", ko: "Korean" };

function prompt(task: string, b: Record<string, unknown>): string | null {
  const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  if (task === "tag") {
    return "You are cataloguing one clothing item or accessory from a photo for a personal wardrobe app.\n" +
      `Reply with only JSON in this shape: {"name": string (2-4 words), "category": one of [${CATEGORIES.join(", ")}], ` +
      `"colors": array of 1-3 values from [${COLORS.join(", ")}], dominant first, ` +
      '"formality": 1-5 (1 athletic or lounge, 2 casual, 3 smart casual, 4 business, 5 formal), ' +
      '"occasions": subset of [work, out, sport, home, chores, formal] where wearing it would be appropriate, ' +
      '"condition": 1-5, "issues": array of short visible defects (empty if none), ' +
      '"warmth": 1-3 (1 light such as a t-shirt, shorts or sandals; 2 medium such as a shirt, jeans or a light jacket; 3 warm such as a sweater, wool coat or boots), ' +
      '"waterproof": true if it is made for rain or snow, "graphic": true if it shows a big logo, text or picture print (small brand marks do not count), ' + BOX + ', "confidence": "low" | "medium" | "high"}.\n' +
      SCALE + '\nJudge only what is visible. If the photo does not show clothing or an accessory, reply {"error": "short reason"}.';
  }
  if (task === "box") {
    return "Find the clothing item or accessory in this photo. Reply with only JSON: {" + BOX +
      '}. If several items are visible, box the largest one. If there is no clothing, reply {"error": "short reason"}.';
  }
  if (task === "graphic") {
    return 'Look at this clothing item. Reply with only JSON: {"graphic": true or false}. true means it shows a big logo, ' +
      "large text, or a picture or graphic print that would look out of place in a casual office. Small brand marks, plain colors, " +
      "stripes, checks and plaid are false.";
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

// Requests per person per day (UTC). Only enforced once supabase/limits.sql has been run; until then, no limit.
const DAILY_LIMIT: Record<string, number> = { tag: 80, box: 80, graphic: 80, check: 30, ideas: 10 };

function supabaseKeys(): { base: string; apikey: string } {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  let apikey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    apikey = keys.default ?? Object.values(keys)[0] ?? apikey;
  } catch { /* keep legacy key */ }
  return { base, apikey };
}

// Counts this request against the caller's daily limit. Returns false when the limit is reached.
async function withinLimit(req: Request, task: string): Promise<boolean> {
  const { base, apikey } = supabaseKeys();
  try {
    const res = await fetch(`${base}/rest/v1/rpc/bump_ai_usage`, {
      method: "POST",
      headers: { Authorization: req.headers.get("Authorization") ?? "", apikey, "content-type": "application/json" },
      body: JSON.stringify({ p_task: task }),
    });
    if (!res.ok) return true; // limits.sql not installed yet: do not block
    const n = await res.json();
    return typeof n !== "number" || n <= (DAILY_LIMIT[task] ?? 50);
  } catch { return true; }
}

// Confirms the request comes from a signed-in user by asking Supabase Auth about the token.
async function requireUser(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const { base, apikey } = supabaseKeys();
  if (!base || !apikey) return false;
  const res = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!res.ok) return false;
  const user = await res.json().catch(() => null);
  return !!(user && user.id && user.role === "authenticated");
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
  if (!(await requireUser(req))) return json({ error: "not_signed_in" }, 401);
  if (!API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const task = String(body.task ?? "");
  const base = prompt(task, body);
  if (!base) return json({ error: "unknown_task" }, 400);
  // The app's language: free-text values come back in it; JSON keys and listed values stay in English.
  const langName = LANGS[String(body.lang ?? "en")];
  const text = langName && (task === "tag" || task === "check" || task === "ideas")
    ? base + `\nWrite every free-text value (name, issues, summary, item, color, why) in ${langName}. ` +
      "Keep JSON keys and every value chosen from a list above (category, colors, occasions, occasion, recommendation, confidence) exactly in English."
    : base;
  if (!(await withinLimit(req, task))) return json({ error: "daily_limit" }, 429);

  const content: unknown[] = [];
  if (task === "tag" || task === "box" || task === "graphic" || task === "check") {
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
    body: JSON.stringify({ model: MODEL, max_tokens: task === "ideas" ? 1500 : task === "box" || task === "graphic" ? 120 : 700, messages: [{ role: "user", content }] }),
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
