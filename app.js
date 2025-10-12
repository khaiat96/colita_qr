// colita de rana — JSON-driven single-file app
// Loads: landing_page.json, survey_questions_regular.json, survey_questions_pro.json,
// decision_mapping-regular.json, decision_mapping-pro.json, results_template.json
// All UI copy is read from JSON files. ARIA fallbacks exist for robustness.

(() => {
  
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const app = $("#app");
  const footerBlock = $("#footerBlock");

  // Global state (in-memory; drafts persisted to localStorage)
  const state = {
    mode: "regular",         // "regular" | "pro"
    landing: null,
    qRegular: null,
    qPro: null,
    mapRegular: null,
    mapPro: null,
    resultsTpl: null,
    copy: null,              // from landing_page.json (title, ctas, disclaimer, footer)
    answers: {},             // { [questionId]: "optionId" | ["optA","optB"] | slider number }
    progress: { i: 0, total: 0 },
    user: { name: "", email: "", consent_waitlist: false },
    final: { key: null, type: null, rendered: "" },
    meta: { version: "regular", source: "qr", ua: navigator.userAgent, locale: navigator.language }
  };

  // Local storage draft
  const LS_KEY = "colita_survey_draft_v1";

  // ------- Utilities -------
  async function loadJSON(fname){
    const res = await fetch(`${DATA_PATH}${fname}`, { cache: "no-store" });
    if(!res.ok) throw new Error(`No se pudo cargar ${fname}`);
    return res.json();
  }

  function saveDraft(){
    const draft = {
      mode: state.mode, answers: state.answers, user: state.user, meta: state.meta,
      progress: state.progress, final: state.final
    };
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
  }
  function loadDraft(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return;
      const d = JSON.parse(raw);
      Object.assign(state, d);
    }catch(e){}
  }
  function clearDraft(){ localStorage.removeItem(LS_KEY); }

  // Accessibility helpers
  function focusFirstInteractive(el){ (el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')||el).focus(); }

  // ------- Data bootstrap -------
  async function boot(){
    try{
      const [landing, qReg, qPro, mapReg, mapPro, resultsTpl] = await Promise.all([
        loadJSON("landing_page.json"),
        loadJSON("survey_questions_regular.json"),
        loadJSON("survey_questions_pro.json"),
        loadJSON("decision_mapping-regular.json"),
        loadJSON("decision_mapping-pro.json"),
        loadJSON("results_template.json"),
      ]);
      state.landing = landing;
      state.copy = landing; // uses same file for hero/subtitle/disclaimer + footer
      state.qRegular = qReg;
      state.qPro = qPro;
      state.mapRegular = mapReg;
      state.mapPro = mapPro;
      state.resultsTpl = resultsTpl;

      loadDraft(); // hydrate any draft
      renderFooter();
      if(!Object.keys(state.answers).length){
        renderLanding();
      }else{
        renderSurvey(); // resume
      }
    }catch(err){
      app.innerHTML = `<div class="alert err"><strong>Error cargando datos.</strong> Revisa tus archivos JSON en <span class="mono">./</span> y el nombre de cada archivo. <div class="mt-1 mono">${err.message}</div></div>`;
    }
  }

  // ------- Landing -------
  function renderLanding(){
    const { app:copyApp, cta, footer } = state.copy || {};
    app.innerHTML = `
      <section class="stack">
        <div class="card">
          <h2>${copyApp?.title ?? "Haz el quiz para tu plan personalizado"}</h2>
          <p class="muted">${copyApp?.subtitle ?? ""}</p>
          <div class="alert warn mt-1">${copyApp?.disclaimer ?? "Esta información es educativa y no sustituye consejo médico."}</div>
          <div class="row mt-2">
            <button id="startBtn">${cta?.start ?? "Comenzar"}</button>
            <button class="ghost" id="startProBtn">${cta?.upgrade ?? "Pro: evaluación detallada"}</button>
          </div>
        </div>
        ${renderWaitlistCard(footer)}
      </section>
    `;
    $("#startBtn").addEventListener("click", () => { state.mode = "regular"; startSurvey(); });
    $("#startProBtn").addEventListener("click", () => { state.mode = "pro"; startSurvey(); });
    focusFirstInteractive(app);
  }

  // ------- Footer waitlist (persistent) -------
  function renderWaitlistCard(footer){
    if(!footer) return "";
    return `
      <div class="footer-card" aria-labelledby="waitTitle">
        <h3 id="waitTitle">${footer.title ?? "Únete a la lista de espera"}</h3>
        <p>${footer.description ?? ""}</p>
        <ul class="footer-benefits">${(footer.benefits||[]).map(b=>`<li>${b}</li>`).join("")}</ul>
        <p class="mt-1"><em>${footer.launch_date ?? ""}</em></p>
      </div>
    `;
  }
  function renderFooter(){
    const f = state.copy?.footer;
    if(!f){ footerBlock.innerHTML = ""; return; }
    footerBlock.innerHTML = renderWaitlistCard(f);
  }

  // ------- Survey renderer -------
  function currentQSpec(){
    const spec = state.mode === "pro" ? state.qPro : state.qRegular;
    const sections = spec?.sections || [];
    const qs = sections.flatMap(s => s.questions);
    return { spec, sections, questions: qs };
  }

  function startSurvey(){
    state.answers = {};
    state.user = { name:"", email:"", consent_waitlist:false };
    state.final = { key:null, type:null, rendered:"" };
    state.meta.version = state.mode;
    state.progress = { i: 0, total: currentQSpec().questions.length };
    saveDraft();
    renderSurvey(true);
  }

  function renderSurvey(scrollTop=false){
    const { spec, sections, questions } = currentQSpec();
    state.progress.total = questions.length;

    // Midway upsell if in regular
    const showUpsell = (state.mode === "regular") && (state.progress.i === Math.floor(questions.length/2));

    const q = questions[state.progress.i];
    const pct = Math.round((state.progress.i/Math.max(1,questions.length))*100);

    const nav = state.progress.i > 0 ? `<button class="ghost" id="backBtn">${state.copy?.cta?.back ?? "Atrás"}</button>` : "";
    const nextLabel = state.progress.i < questions.length - 1 ? (state.copy?.cta?.continue ?? "Continuar") : (state.copy?.cta?.submit ?? "Ver resultados");

    app.innerHTML = `
      <section class="stack" aria-label="Encuesta">
        <div class="progress" aria-hidden="true"><div style="width:${pct}%"></div></div>
        ${showUpsell ? upsellBlock() : ""}
        <form class="card" id="qForm">
          <fieldset>
            <legend>${getSectionTitle(sections, q)}</legend>
            <h3 class="mb-1">${q?.label ?? "Pregunta"}</h3>
            <div class="stack" role="group" aria-label="${q?.label ?? 'Pregunta'}">
              ${renderInput(q)}
            </div>
          </fieldset>
          <div class="row mt-2">
            ${nav}
            <button id="nextBtn">${nextLabel}</button>
            ${state.mode==="regular" ? `<button type="button" class="ghost" id="gotoProBtn">${state.copy?.cta?.upgrade ?? "Pro: evaluación detallada"}</button>`:""}
          </div>
        </form>
        ${renderWaitlistCard(state.copy?.footer)}
      </section>
    `;

    // handlers
    const form = $("#qForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if(!captureAnswer(q)) return;
      if(state.progress.i < questions.length - 1){
        state.progress.i++;
        saveDraft();
        renderSurvey(true);
      } else {
        saveDraft();
        renderCompletionGate();
      }
    });
    $("#backBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      if(state.progress.i>0){ state.progress.i--; saveDraft(); renderSurvey(true); }
    });
    $("#gotoProBtn")?.addEventListener("click", () => { switchToPro(sections, questions); });

    if(scrollTop) window.scrollTo({ top:0, behavior:"smooth" });
    focusFirstInteractive(app);
  }

  function upsellBlock(){
    return `
      <div class="card alert ok" role="note">
        <strong>¿Quieres la versión Pro?</strong> Obtén evaluación más detallada sin perder tus respuestas.
        <div class="mt-1"><button class="secondary" id="upsellGoPro">Ir a Pro</button></div>
      </div>
    `;
  }

  function switchToPro(){
    state.mode = "pro";
    state.meta.version = "pro";
    // Keep existing answers where IDs overlap
    saveDraft();
    renderSurvey(true);
  }

  function getSectionTitle(sections, q){
    const sec = sections.find(s => s.questions.some(qq => qq.id === q.id));
    return sec?.title ?? "Sección";
  }

  function renderInput(q){
    const prev = state.answers[q.id];
    if(q.type === "single"){
      return `<div class="row" role="radiogroup" aria-label="${q.label}">
        ${q.options.map(opt=>{
          const sel = prev === opt.id ? 'aria-checked="true" class="option selected"' : 'aria-checked="false" class="option"';
          return `<div role="radio" tabindex="0" ${sel} data-id="${opt.id}">${opt.label}</div>`;
        }).join("")}
      </div>`;
    }
    if(q.type === "multi"){
      const selected = new Set(Array.isArray(prev)?prev:[]);
      return `<div class="row" role="group">
        ${q.options.map(opt=>{
          const isSel = selected.has(opt.id);
          return `<button type="button" class="option ${isSel?"selected":""}" data-id="${opt.id}" aria-pressed="${isSel}">${opt.label}</button>`;
        }).join("")}
      </div>`;
    }
    if(q.type === "scale"){
      const v = typeof prev==="number" ? prev : (q.min ?? 0);
      return `
        <label for="slider" class="sr-only">${q.label}</label>
        <input id="slider" type="range" min="${q.min??0}" max="${q.max??10}" step="${q.step??1}" value="${v}" />
        <div aria-hidden="true">Valor: <span class="mono" id="sliderVal">${v}</span></div>
      `;
    }
    // Text fallback
    return `<label for="txt">${q.placeholder ?? ""}</label><input id="txt" type="text" value="${prev ?? ""}" />`;
  }

  function captureAnswer(q){
    let val = null;
    if(q.type==="single"){
      const cur = $('.option[aria-checked="true"]', app);
      if(!cur){ alert("Selecciona una opción"); return false; }
      val = cur.dataset.id;
    }else if(q.type==="multi"){
      val = $$('.option.selected', app).map(b=>b.dataset.id);
      if(val.length===0){ alert("Selecciona al menos una opción"); return false; }
    }else if(q.type==="scale"){
      val = parseFloat($('#slider').value);
    }else{
      val = $('#txt').value.trim();
      if(q.required && !val){ alert("Este campo es obligatorio"); return false; }
    }
    state.answers[q.id] = val;
    saveDraft();
    return true;
  }

  // Click selection behavior
  document.addEventListener("click", (e)=>{
    const opt = e.target.closest(".option");
    if(!opt) return;
    const role = opt.getAttribute("role");
    if(role==="radio"){
      const group = opt.parentElement;
      $$('.option[role="radio"]', group).forEach(o=>{ o.setAttribute("aria-checked","false"); o.classList.remove("selected"); });
      opt.setAttribute("aria-checked","true"); opt.classList.add("selected");
    }else{
      // toggle for multi
      const pressed = opt.classList.toggle("selected");
      opt.setAttribute("aria-pressed", pressed ? "true":"false");
    }
  });
  document.addEventListener("input", (e)=>{
    if(e.target.id==="slider"){ $("#sliderVal").textContent = e.target.value; }
  });

  // ------- Completion gate (name/email & consent) -------
  function renderCompletionGate(){
    const cta = state.copy?.cta || {};
    const privacy = state.copy?.app?.privacy ?? "Tus respuestas se guardan de forma segura y puedes darte de baja en cualquier momento.";
    app.innerHTML = `
      <section class="stack">
        <div class="card">
          <h2>¡Listo! Recibe y ve tus resultados</h2>
          <p class="muted">${privacy}</p>
          <form id="gateForm" class="stack">
            <label>Nombre
              <input type="text" id="name" autocomplete="name" required />
            </label>
            <label>Email
              <input type="email" id="email" autocomplete="email" required />
            </label>
            <label class="row"><input type="checkbox" id="consent" /> <span class="ml-1">Quiero unirme a la lista de espera</span></label>
            <div class="row">
              <button id="seeResults">${cta.submit ?? "Ver resultados"}</button>
            </div>
          </form>
        </div>
        ${renderWaitlistCard(state.copy?.footer)}
      </section>
    `;
    $("#gateForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      state.user.name = $("#name").value.trim();
      state.user.email = $("#email").value.trim();
      state.user.consent_waitlist = $("#consent").checked;
      if(!state.user.name || !/.+@.+\..+/.test(state.user.email)){ alert("Completa nombre y un email válido."); return; }
      saveDraft();
      await computeAndPersistResults();
    });
    focusFirstInteractive(app);
  }

  // ------- Scoring + decision mapping -------
  function pickMappingAndTpl(){
    return {
      mapping: state.mode==="pro" ? state.mapPro : state.mapRegular,
      tpl: state.resultsTpl
    };
  }

  function findPatternKey(mapping){
    // Generic matcher:
    // 1) If mapping has explicit rules per key, try to match question:value combos.
    // 2) If not match, fall back to simple heuristics (e.g., look for option ids that include element hints).
    // NOTE: This is schema-tolerant; it works with your existing decision_mapping files.
    const a = state.answers;
    const rules = mapping?.rules || mapping; // supports { rules: { key:[...] } } or { key:[...] }
    if(!rules) return null;

    // Try all keys and score matches
    let bestKey = null, bestScore = -1;
    for(const [key, conds] of Object.entries(rules)){
      // conds: array of matchers like "qId:valueId" or { all: ["q:v", ...] } / { any: [...] }
      let score = 0, hardFail = false;
      for(const cond of conds){
        if(typeof cond === "string"){
          const [qid,val] = cond.split(":");
          const ans = a[qid];
          const ok = Array.isArray(ans) ? ans.includes(val) : ans===val;
          score += ok ? 1 : 0;
        }else if(cond.all){
          const ok = cond.all.every(s=>{
            const [qid,val]=s.split(":"); const ans=a[qid];
            return Array.isArray(ans) ? ans.includes(val) : ans===val;
          });
          if(!ok){ hardFail=true; break; } else score += cond.all.length;
        }else if(cond.any){
          const ok = cond.any.some(s=>{
            const [qid,val]=s.split(":"); const ans=a[qid];
            return Array.isArray(ans) ? ans.includes(val) : ans===val;
          });
          if(!ok){ hardFail=true; break; } else score += 1;
        }
      }
      if(!hardFail && score > bestScore){ bestScore=score; bestKey=key; }
    }
    return bestKey;
  }

  function renderResultsCard(finalKey){
    const { tpl } = pickMappingAndTpl();
    const type = tpl?.types?.[finalKey] || null;
    if(!type){
      return `<div class="card alert err">No se encontró plantilla para <span class="mono">${finalKey||"desconocido"}</span>. Revisa <span class="mono">results_template.json</span>.</div>`;
    }
    const phaseLabels = tpl?.common?.phase_labels || { antes:"Antes", durante:"Durante", despues:"Después", entre:"Entre periodos" };
    const safety = tpl?.common?.safety_notes || {};
    const lifestyleByPhase = type?.lifestyle || {};
    const actions = type?.herbal_actions_preview || [];

    return `
      <section class="stack" aria-label="Resultados">
        <div class="card">
          <div class="row"><span class="option selected" aria-checked="true">${type.name ?? finalKey}</span></div>
          <h2 class="mt-1">${type?.summary ?? "Tu patrón energético"}</h2>
          <p>${type?.why ?? ""}</p>

          <h3 class="mt-2">Cuidado por fase del ciclo</h3>
          <div class="stack">
            ${Object.entries(lifestyleByPhase).map(([phase,list])=>`
              <div class="alert">
                <strong>${phaseLabels[phase] ?? phase}</strong>
                <ul class="mt-1">${(list||[]).map(i=>`<li>${i}</li>`).join("")}</ul>
              </div>
            `).join("")}
          </div>

          <h3 class="mt-2">Alimentación</h3>
          <ul>${(type?.nutrition||[]).map(n=>`<li>${n}</li>`).join("")}</ul>

          <h3 class="mt-2">Vista previa de acciones herbolarias</h3>
          <ul>${actions.map(a=>`<li><strong>${a.action}:</strong> ${a.explain}</li>`).join("")}</ul>

          <div class="alert warn mt-2">
            <strong>Nota de seguridad:</strong>
            <ul>
              ${safety.heavy?`<li>${safety.heavy}</li>`:""}
              ${safety.pain?`<li>${safety.pain}</li>`:""}
              ${safety.low_flow?`<li>${safety.low_flow}</li>`:""}
            </ul>
          </div>

          <p class="mt-2 muted"><em>${state.copy?.app?.disclaimer ?? "Esta información es educativa y no sustituye consejo médico."}</em></p>
        </div>
        ${renderWaitlistCard(state.copy?.footer)}
      </section>
    `;
  }

  async function computeAndPersistResults(){
    const { mapping } = pickMappingAndTpl();
    const finalKey = findPatternKey(mapping) || "aire"; // safe fallback
    state.final.key = finalKey;

    // Render once for on-screen and email body
    const html = renderResultsCard(finalKey);
    state.final.rendered = html;
    saveDraft();

    // Persist (best-effort; failure is non-blocking)
    const savePayload = {
      timestamp: new Date().toISOString(),
      version: state.meta.version,
      name: state.user.name,
      email: state.user.email,
      answers: state.answers,
      element_scores: null,          // reserved (if you add scoring.json)
      final_type: finalKey,
      consent_waitlist: state.user.consent_waitlist,
      source: state.meta.source,
      meta: { ua: state.meta.ua, locale: state.meta.locale }
    };

    await Promise.allSettled([
      saveToSupabase(savePayload),
      sendEmailWithFormspree(state.user, html, finalKey),
      state.user.consent_waitlist ? postWaitlist(state.user, finalKey) : Promise.resolve()
    ]);

    // Show results
    app.innerHTML = html + `
      <div class="row mt-2">
        <button id="restart" class="ghost">Reiniciar</button>
        <button id="pro" class="secondary">Pasar a Pro</button>
      </div>
    `;
    $("#restart").addEventListener("click", ()=>{ clearDraft(); state.mode="regular"; renderLanding(); window.scrollTo(0,0); });
    $("#pro").addEventListener("click", ()=>{ state.mode="pro"; startSurvey(); });

    window.scrollTo({ top: 0, behavior:"smooth" });
  }

  // ------- Integrations -------
  async function saveToSupabase(row){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(row)
      });
      if(!res.ok) throw new Error(await res.text());
      return res.json();
    }catch(e){
      console.warn("Supabase save failed; will retry on next visit.", e);
      // Store minimal retry queue
      const qKey = "colita_supabase_retry_v1";
      const q = JSON.parse(localStorage.getItem(qKey) || "[]");
      q.push(row); localStorage.setItem(qKey, JSON.stringify(q));
    }
  }

  async function sendEmailWithFormspree(user, html, finalKey){
    try{
      if(USE_SERVER_EMAIL){
        await fetch("/api/send-email", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ to:user.email, name:user.name, html, finalKey, version: state.meta.version }) });
        return;
      }
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("email", user.email);
      formData.append("_subject", "Tus resultados — colita de rana");
      formData.append("message", `Versión: ${state.meta.version}\nTipo: ${finalKey}\n\nHTML adjunto:\n${html}`);
      await fetch(FORMSPREE_ENDPOINT, { method:"POST", body: formData, mode:"cors" });
    }catch(e){
      console.warn("Email send failed:", e);
    }
  }

  async function postWaitlist(user, finalKey){
    try{
      await fetch(GENERIC_WAITLIST_WEBHOOK, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name:user.name, email:user.email, source:"quiz", final_type: finalKey })
      });
    }catch(e){
      console.warn("Waitlist webhook failed:", e);
    }
  }

  // Kickoff
  boot();
})();