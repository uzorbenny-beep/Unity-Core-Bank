# 🚀 UnityCore Bank - GitHub & Vercel deployment Guide
*(Go Live in Under 2 Minutes with Full API Security)*

This guide will show you how to securely link your Google AI Studio project to your private GitHub account and host the entire application (including the secure AI Virtual Assistant) on **Vercel** with full environmental security.

---

## 🛠️ Phase 1: Export Your Project to GitHub from AI Studio

Google AI Studio provides a direct integration that lets you push this entire workspace straight into a new repository:

1. Look in the **top-right corner of your Google AI Studio screen** (or open the settings wheel menu ⚙️).
2. Click on **"Export to GitHub"** or **"Push to GitHub"**.
3. Log in with your GitHub account when prompted to authorize Google workspace.
4. Name your new repository (e.g., `unitycore-bank`).
5. Choose **Public** or **Private** (Private is recommended to keep your custom configurations clean) and hit **Export**.
   - *AI Studio will automatically write all files—including our custom Vercel settings—directly to your GitHub repository!*

---

## ⚡ Phase 2: Deploy to Vercel in 3 Easy Steps

Because we have pre-configured everything (including serverless routing, vite assets, and single-page redirection), Vercel will auto-detect the project and build it in one go.

### 1. Import your Repo in Vercel
1. Log in to [Vercel](https://vercel.com) using your **GitHub account**.
2. Click **Add New...** -> **Project**.
3. Locate your newly exported `unitycore-bank` repository and click **Import**.

### 2. Configure Environment Variables (Critical for AI Assistant)
To prevent your secure API keys from being leaked to public eyes, our system pulls your Gemini AI keys from a secure serverless vault. Before clicking deploy, you must tell Vercel what your secret key is:

1. Scroll down to the **Environment Variables** section on the Vercel configure screen.
2. In the **Key** field, type exactly:
   ```text
   GEMINI_API_KEY
   ```
3. In the **Value** field, paste your Google Gemini API Key.
4. Click **Add**.

### 3. Hit Deploy!
1. Under **Framework Preset**, Vercel should automatically detect **Vite** (if it doesn't, select it from the dropdown).
2. Keep the root directory as `/` and all build commands as default.
3. Click the blue **Deploy** button.
4. **That's it!** Vercel will compile the React CSS/JS assets, deploy your secure Express backend router into their Serverless Functions, and give you a live production URL (e.g., `https://unitycore-bank.vercel.app`) instantly.

---

## 🔒 Security Built-In

Our pre-installed integrations handle these operations natively:
* **Zero-Port Conflict**: We modified `server.ts` to export standard middleware without binding to local web sockets (`app.listen`) during serverless initialization. This gives you **instant serverless cold starts** with zero deployment overhead on Vercel.
* **SPA Routing Control**: We created `/vercel.json` with direct rewrites inside Vercel's edge CDN. If a visitor types `https://your-app.vercel.app/user-dashboard` directly or reloaded the browser, Vercel will resolve it internally, preventing 404 page crashes.
* **Serverless Backend Routing**: Any client requests to `/api/support/chat` are securely directed to `/api/index.ts` where your `GEMINI_API_KEY` stays 100% hidden on Vercel's private cloud endpoints. No browser can ever steal it!
