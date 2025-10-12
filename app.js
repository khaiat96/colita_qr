/* app.js — Landing cohesivo + integraciones:
   - Formspree (email forwarding)
   - Supabase (guardar datos)
   - Make Webhook (waitlist)
*/

(function () {
  /* ---------- Required constants (as provided) ---------- */
  // Where your JSONs live (put the 5 files into ./data/)
  /* ====== Config (provided) ====== */
  const DATA_PATH = "./";

  // Supabase (data saving)
  const SUPABASE_URL = "https://eithnnxevoqckkzhvnci.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig"; // public anon key only

  // Email forwarding (Formspree)
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/xldppdop";

  // Waitlist integration (Generic webhook e.g., Make)
  const GENERIC_WAITLIST_WEBHOOK =
    "https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20";

  /* ---------- DOM ---------- */
  const dom = {
    progressWrap: document.querySelector(".progress-container"),
    progressBar: document.querySelector(".progress-bar"),
    progressLabel: document.querySelector(".progress-label"),
    waitlistForm: document.getElementById("waitlist-form"),
    waitlistStatus: document.getElementById("waitlist-status"),
    nameInput: document.getElementById("name"),
    emailInput: document.getElementById("email"),
    startBtn: document.getElementById("start-btn"),
    startBtn2: document.getElementById("start-btn-2"),
  };

  /* ---------- Landing copy (safety set) ---------- */
  const landing = {
    title: "Colita de rana… pero ahora personalizada.",
    subtitle:
      "Estamos desarrollando el primer sistema de plantas medicinales personalizado para la salud menstrual. Cada mujer tiene un patrón único de síntomas que merece un trato único.",
    primaryCta: "Descubre tu tipo de ciclo",
  };

  const titleEl = document.getElementById("hero-title");
  const subEl = document.getElementById("hero-subtitle");
  if (titleEl) titleEl.textContent = landing.title;
  if (subEl) subEl.textContent = landing.subtitle;
  if (dom.startBtn) dom.startBtn.textContent = landing.primaryCta;

  /* ---------- Progress hidden on landing ---------- */
  setProgressVisible(false);
  setProgress(0);

  if (dom.startBtn2) {
    dom.startBtn2.addEventListener("click", () => {
      // If SPA routing exists, show progress here.
      // setProgressVisible(true);
    });
  }

  /* ---------- Waitlist submit ---------- */
  if (dom.waitlistForm) {
    dom.waitlistForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = dom.nameInput?.value?.trim();
      const email = dom.emailInput?.value?.trim();

      if (!name || !email || !isValidEmail(email)) {
        return setStatus("Por favor ingresa un nombre y correo válido.", true);
      }

      setStatus("Enviando…");

      // Fire all targets in parallel; succeed if at least one works
      const tasks = [
        sendToWaitlistWebhook({ name, email }),
        forwardWithFormspree({ name, email }),
        saveInSupabase({ name, email }),
      ];

      const results = await Promise.allSettled(tasks);

      const anySuccess = results.some((r) => r.status === "fulfilled");
      if (anySuccess) {
        setStatus(`¡Gracias ${name}! Te agregamos a la lista de espera. 💜`);
        dom.waitlistForm.reset();
      } else {
        setStatus("Hubo un problema. Intenta de nuevo más tarde.", true);
        console.error("All waitlist targets failed:", results);
      }
    });
  }

  /* ---------- Integrations ---------- */

  function sendToWaitlistWebhook(payload) {
    if (!GENERIC_WAITLIST_WEBHOOK) return Promise.resolve("skipped");
    return fetch(GENERIC_WAITLIST_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(assertOk);
  }

  function forwardWithFormspree(payload) {
    if (!FORMSPREE_ENDPOINT) return Promise.resolve("skipped");
    // Formspree accepts JSON; include a _subject for convenience
    const body = { ...payload, _subject: "Nuevo registro · Waitlist Colita de rana" };
    return fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(assertOk);
  }

  function saveInSupabase(payload) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return Promise.resolve("skipped");

    // Try multiple possible table names gracefully
    const tables = ["waitlist_signups", "waitlist", "submissions"];
    const record = {
      name: payload.name,
      email: payload.email,
      source: "landing_waitlist",
      created_at: new Date().toISOString(),
    };

    // Attempt sequentially until one succeeds
    return tables
      .reduce((chain, table) => {
        return chain.catch(() =>
          fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(record),
          }).then(assertOk)
        );
      }, Promise.reject())
      .catch((err) => {
        // First attempt in chain starts rejected; run first fetch explicitly
        return fetch(`${SUPABASE_URL}/rest/v1/${tables[0]}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(record),
        })
          .then(assertOk)
          .catch((finalErr) => Promise.reject(finalErr || err));
      });
  }

  /* ---------- Helpers ---------- */

  function assertOk(res) {
    if (!res || !res.ok) {
      const msg = `HTTP ${res ? res.status : "no-response"}`;
      return Promise.reject(new Error(msg));
    }
    return res.text(); // minimal
  }

  function setStatus(msg, isError = false) {
    if (!dom.waitlistStatus) return;
    dom.waitlistStatus.textContent = msg;
    dom.waitlistStatus.style.color = isError ? "var(--danger)" : "var(--fg)";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setProgressVisible(visible) {
    if (!dom.progressWrap) return;
    dom.progressWrap.style.visibility = visible ? "visible" : "hidden";
    dom.progressWrap.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function setProgress(pct) {
    if (!dom.progressBar || !dom.progressLabel) return;
    const safe = Math.max(0, Math.min(100, pct | 0));
    dom.progressBar.style.width = `${safe}%`;
    dom.progressLabel.textContent = `${safe}%`;
  }
})();
