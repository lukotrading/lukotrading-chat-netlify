
# Lukotrading Chat — Netlify editie

- `netlify/functions/chat.js`  → Netlify Function die OpenAI aanroept (POST)
- `knowledge/products.json`    → Productkennis
- `netlify.toml`               → Stelt functions-map in + redirect /api/chat
- `embed.html`                 → Plak in JouwWeb (HTML/Embed)

## Deploy
1) In Netlify: **Add new site → Deploy manually** → sleep de **hele map** in of upload zip.
2) Site is live (bv. https://<naam>.netlify.app).  
3) **Environment variable** zetten: `OPENAI_API_KEY` (Site settings → Build & deploy → Environment → Environment variables).  
4) **Trigger deploy** opnieuw.

## Gebruik
- `embed.html` gebruiken in JouwWeb. Laat `const BACKEND = "/api/chat";` staan.
