// netlify/functions/chat.js
const fs = require("fs");
const path = require("path");

function loadKnowledge() {
  try {
    // In Netlify Functions wijst process.cwd() naar de bundleroot (/var/task)
    const kbPath = path.join(process.cwd(), "knowledge", "products.json");
    const raw = fs.readFileSync(kbPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("KB load error:", e);
    return [];
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const messages = Array.isArray(body.messages) ? body.messages : [];

  // simpele kennisbank (top-3 match)
  const items = loadKnowledge();
  let kb = [];
  try {
    const last = [...messages].reverse().find(m => m.role === "user")?.content?.toLowerCase() || "";
    const words = last.split(/\W+/).filter(Boolean);
    kb = items
      .map(it => {
        const keys = [
          it.name,
          ...(it.aliases || []),
          it.usage || "",
          ...(Array.isArray(it.instructions) ? it.instructions.join(" ") : []),
          it.safety || "",
          ...(it.sector || []),
          it.notes || ""
        ].join(" ").toLowerCase();
        const score = words.reduce((s, w) => s + (keys.includes(w) ? 1 : 0), 0);
        return { score, it };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(x => x.score > 0)
      .map(x => x.it);
  } catch (e) {
    console.error("KB match error:", e);
  }

  const system = [
    "Je bent de productassistent van Lukotrading (Innolab).",
    "Wees concreet en kort. Veiligheid eerst.",
    "Als iets onbekend is, zeg dat eerlijk en verwijs naar info@lukotrading.com."
  ].join(" ");

  const augmented = [
    { role: "system", content: system },
    ...(kb.length ? [{ role: "system", content: "Relevante productinfo: " + JSON.stringify(kb) }] : []),
    ...messages
  ];

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: augmented, temperature: 0.2 })
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error("OpenAI error:", text);
      return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: "OpenAI error: " + text };
    }
    const data = JSON.parse(text);
    const out = data.choices?.[0]?.message?.content || "(geen antwoord)";
    return { statusCode: 200, headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" }, body: out };
  } catch (e) {
    console.error("Server error:", e);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: "Server error: " + e.message };
  }
};

