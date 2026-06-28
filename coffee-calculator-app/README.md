# ☕ Coffee Recipe Cost Calculator

A Next.js app that works on Safari, Chrome, and all browsers — no CORS issues.
Saves recipes to your Google Drive and syncs in real-time across devices.

---

## 🚀 Deploy to Vercel (5 steps)

### Step 1 — Get your Anthropic API Key
1. Go to https://console.anthropic.com
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### Step 2 — Upload to GitHub
1. Create a new repo at https://github.com/new (name it `coffee-calculator`)
2. Upload all these files into the repo (drag & drop works)

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com/new
2. Click **Import** next to your GitHub repo
3. Click **Deploy** (no build settings needed — Vercel auto-detects Next.js)

### Step 4 — Add your API Key
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from Step 1
3. Click **Save** then go to **Deployments** → **Redeploy**

### Step 5 — Connect Google Drive in Claude
The app uses your Claude.ai Google Drive connection.
Make sure Google Drive is connected at https://claude.ai (Settings → Connectors).

---

## 📱 Install as App on iPhone/iPad (Safari)
1. Open your Vercel URL in Safari
2. Tap the **Share** button → **Add to Home Screen**
3. It appears as a proper app icon!

## 🖥 Install as App on Mac (Chrome)
1. Open your Vercel URL in Chrome
2. Click **⋮ menu** → **Save and share** → **Install page as app**

---

## Features
- ☕ Pre-loaded ingredient library (coffee, milk, syrups, matcha, packaging)
- 📷 Photo upload for each ingredient
- 📚 Add / Edit / Delete library ingredients
- 🥧 Live pie chart showing cost breakdown
- 💾 Auto-saves to Google Drive 3 seconds after you stop editing
- 🔄 Syncs changes from Drive every 15 seconds (real-time across devices)
- ✅ Works on Safari, Chrome, Firefox — no CORS issues
