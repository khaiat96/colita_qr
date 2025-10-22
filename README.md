# Colita de Rana Menstrual Health Survey – Vercel Deployment Guide

This version works!! (just need to change questions)

## How it works

This is a vanilla JS/HTML/CSS menstrual health survey app for “colita de rana”. All UI text and logic are loaded from JSON files in `/data/`, making content updates easy. The app guides users through symptom questions, computes their energetic type, and provides gentle lifestyle/herbal tips—no medical claims, no proprietary blends.

Submissions are saved to Supabase (anonymous POST); if unavailable, localStorage is used. Results are emailed via Formspree in a pretty format. If opted-in, a waitlist webhook triggers. All Spanish copy, accessibility (WCAG AA, keyboard, ARIA), and error handling are present.

## Deployment (≤500 words)

1. **Clone/Upload to Vercel:**  
   Copy all files (`index.html`, `style.css`, `app.js`) and the `/data/` folder with JSON content to your Vercel project root.

2. **No build step:**  
   This is a static site. No frameworks or bundlers. Just deploy the folder.

3. **Edit content:**  
   To change questions, results, or copy, edit the relevant `.json` files in `/data/`.  
   For Pro version, add or update `questions_pro.json`.

4. **Environment/webhooks:**  
   - Supabase, Formspree, and waitlist webhook URLs are set as constants in `app.js`.  
   - If you add a serverless `/api/send-email` endpoint, gate this via a feature flag in `app.js`.
   - Never expose RESEND_API_KEY client-side.

5. **Offline/incomplete submissions:**  
   Drafts save to `localStorage` until submission is complete and confirmed.

6. **Accessibility:**  
   All interactive elements are keyboard navigable, with visible focus states.

## Suggestions & Next Steps

- **Serverless email endpoint:**  
  Add `/api/send-email` (with RESEND_API_KEY) for branded email results and analytics (keep API key only server-side).

- **Analytics:**  
  Add privacy-respecting tracking (e.g., Plausible) for completion rates and quiz starts.

- **A/B testing:**  
  Serve alternate JSON question sets via ENV, or use Supabase to randomize.

- **Internationalization:**  
  Expand to multi-language JSON sets.

- **End-to-end tests:**  
  Use Cypress or Playwright for accessibility, error, and offline flows.

- **Pro content:**  
  Expand `questions_pro.json` and enrich `results.json` for deeper evaluation.

## Maintenance

All content is in JSON. To update questions or results, edit `/data/*.json`—no code changes needed.

**Poster tagline:**  
> Haz el quiz y recibe tu plan personalizado para tu ciclo.
