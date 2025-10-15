// Colita de Rana Quiz App – Vanilla JS, Vercel-ready
const DATA_PATH = "./data/";
const SUPABASE_URL = "https://eithnnxevoqckkzhvnci.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xldppdop";
const GENERIC_WAITLIST_WEBHOOK = "https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20";

// State
let copy = {};
let landing = {};
let questions = {};
let scoring = {};
let results = {};
let surveyAnswers = {};
let elementScores = {};
let currentSection = 0, currentQuestion = 0, version = "regular";
let userEmail = "", userName = "", consentWaitlist = false, finalType = "";

// Util
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function warn(m) { console.warn(m); }

// Load JSON utility
async function loadJson(name, fallback = {}) {
  try {
    const res = await fetch(DATA_PATH + name);
    if (!res.ok) throw new Error("Load failed: " + name);
    return await res.json();
  } catch (e) {
    warn(`JSON load error: ${name}`); return fallback;
  }
}

// Init
(async function init() {
  [copy, landing, questions, scoring, results] = await Promise.all([
    loadJson("copy.json"),
    loadJson("Landing_Page.json"),
    loadJson("questions.json"),
    loadJson("scoring.json"),
    loadJson("results.json"),
  ]);
  renderLanding();
  renderFooter();
})();

// Routing
function renderLanding() {
  const app = $("#app");
  app.innerHTML = `
    <header class="card">
      <h1>${landing.title || copy.app?.title || "Haz el quiz y recibe tu plan personalizado para tu ciclo."}</h1>
      <p>${landing.subtitle || copy.app?.subtitle || ""}</p>
      <button id="start-btn">${copy.cta?.start || "Comenzar"}</button>
      <div class="disclaimer">${copy.app?.disclaimer || "Este contenido es informativo y no sustituye atención médica."}</div>
    </header>
  `;
  $("#start-btn").onclick = () => { version = "regular"; startSurvey(); };
}

function startSurvey() {
  surveyAnswers = {}; currentSection = 0; currentQuestion = 0;
  renderSurvey();
}

function renderSurvey() {
  const sec = questions.sections?.[currentSection];
  if (!sec) return renderCompletion();
  const q = sec.questions?.[currentQuestion];
  if (!q) { currentSection++; currentQuestion = 0; return renderSurvey(); }
  // Progress
  const total = questions.sections.reduce((a,s)=>a+s.questions.length,0);
  const progress = ((currentSection + currentQuestion/Math.max(1,sec.questions.length))/questions.sections.length)*100;
  $("#app").innerHTML = `
    <div class="progress-bar"><div class="progress-bar-inner" style="width:${progress}%"></div></div>
    <section class="card" aria-labelledby="q-${q.id}">
      <h2 id="q-${q.id}">${q.label}</h2>
      <div role="group" aria-label="${q.label}">
        ${q.options.map(opt => `
          <button class="option" tabindex="0" 
            aria-pressed="${surveyAnswers[q.id]===opt.id}" 
            onclick="window.selectOption('${q.id}','${opt.id}')"
          >${opt.label}</button>`).join("")}
      </div>
      <button id="back-btn">${copy.cta?.back || "Atrás"}</button>
      <button id="continue-btn" aria-disabled="${!surveyAnswers[q.id]}">
        ${currentSection+currentQuestion+1===total ? (copy.cta?.submit||"Ver resultados") : (copy.cta?.continue||"Continuar")}
      </button>
    </section>
    <div class="privacy-note">Tus respuestas se guardan de forma segura y puedes darte de baja en cualquier momento.</div>
  `;
  window.selectOption = (qid, oid) => { surveyAnswers[qid] = oid; renderSurvey(); };
  $("#back-btn").onclick = () => {
    if (currentQuestion > 0) currentQuestion--;
    else if (currentSection > 0) { currentSection--; currentQuestion = questions.sections[currentSection].questions.length-1; }
    renderSurvey();
  };
  $("#continue-btn").onclick = () => {
    if (!surveyAnswers[q.id]) return;
    currentQuestion++;
    renderSurvey();
  };
}

function renderCompletion() {
  $("#app").innerHTML = `
    <section class="card">
      <h2>${copy.app?.title || "¡Listo!"}</h2>
      <p>Para ver tus resultados y recibirlos por correo, ingresa tu nombre y correo electrónico.</p>
      <form id="completion-form">
        <label for="name">Nombre</label>
        <input type="text" id="name" required autocomplete="name" />
        <label for="email">Correo electrónico</label>
        <input type="email" id="email" required autocomplete="email" />
        <label>
          <input type="checkbox" id="waitlist" /> ${copy.footer?.title || "Únete a la lista de espera"}
        </label>
        <button type="submit">${copy.cta?.submit || "Ver resultados"}</button>
      </form>
    </section>
  `;
  $("#completion-form").onsubmit = async e => {
    e.preventDefault();
    userName = $("#name").value.trim();
    userEmail = $("#email").value.trim();
    consentWaitlist = $("#waitlist").checked;
    await computeScoring();
    renderResults();
    await saveSubmission();
    await sendEmail();
    if (consentWaitlist) await sendWaitlist();
  };
}

async function computeScoring() {
  elementScores = { aire:0, fuego:0, agua:0, tierra:0 };
  Object.entries(surveyAnswers).forEach(([qid,oid]) => {
    const w = scoring.weights?.[`${qid}:${oid}`];
    if (w) Object.entries(w).forEach(([el,val])=>elementScores[el]=(elementScores[el]||0)+val);
  });
  // Pick highest
  const max = Math.max(...Object.values(elementScores));
  let candidates = Object.entries(elementScores).filter(([_,v])=>v===max).map(([el])=>el);
  // Tie-breaker
  finalType = candidates.length>1 ? scoring.thresholds.tie_breaker.find(el=>candidates.includes(el)) : candidates[0];
}

function renderResults() {
  const type = results.types?.[finalType];
  if (!type) return warn("Missing result type: "+finalType);
  $("#app").innerHTML = `
    <section class="result-card">
      <h2>${type.name || finalType}</h2>
      <p>${type.summary || ""}</p>
      <div><strong>¿Por qué?</strong> ${type.why || ""}</div>
      <div>
        <strong>Tips por fase:</strong>
        ${Object.entries(type.lifestyle||{}).map(([phase,arr])=>`
          <div><em>${phase[0].toUpperCase()+phase.slice(1)}</em>: ${arr.join(" ")}</div>
        `).join("")}
      </div>
      <div>
        <strong>Nutrición:</strong> ${(type.nutrition||[]).join(" ")}
      </div>
      <div>
        <strong>Acciones herbales:</strong>
        <ul>
          ${(type.herbal_actions_preview||[]).map(a=>`<li><b>${a.action}</b>: ${a.explain}</li>`).join("")}
        </ul>
      </div>
      <button id="retake-btn">${copy.cta?.upgrade||"Pro: evaluación detallada"}</button>
      <div class="disclaimer">${copy.app?.disclaimer||""}</div>
    </section>
  `;
  $("#retake-btn").onclick = () => renderProRetake();
}

function renderProRetake() {
  // Load pro questions
  loadJson("questions_pro.json").then(qpro => {
    questions = qpro; version = "pro"; startSurvey();
  });
}

function renderFooter() {
  const f = copy.footer||{};
  $("#footer").innerHTML = `
    <h3>${f.title||""}</h3>
    <p>${f.description||""}</p>
    <ul>${(f.benefits||[]).map(b=>`<li>${b}</li>`).join("")}</ul>
    <div>${f.launch_date||""}</div>
  `;
}

// Data capture
async function saveSubmission() {
  const answers = {...surveyAnswers};
  const payload = {
    version, name: userName, email: userEmail,
    answers, element_scores: elementScores, final_type: finalType,
    consent_waitlist: consentWaitlist, source: "qr",
    meta: { ua: navigator.userAgent, locale: navigator.language }
  };
  // Supabase insert
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });
    localStorage.removeItem("colita_quiz_draft");
  } catch (e) {
    warn("Supabase save failed, fallback to localStorage");
    localStorage.setItem("colita_quiz_draft", JSON.stringify(payload));
  }
}

async function sendEmail() {
  // Render results as pretty HTML string
  const type = results.types?.[finalType];
  let html = `
    <h2>${type.name}</h2>
    <p>${type.summary}</p>
    <div><b>¿Por qué?</b> ${type.why}</div>
    <b>Tips por fase:</b>
    ${Object.entries(type.lifestyle||{}).map(([phase,arr])=>`<div><em>${phase}</em>: ${arr.join(" ")}</div>`).join("")}
    <b>Nutrición:</b> ${(type.nutrition||[]).join(" ")}
    <b>Acciones herbales:</b>
    <ul>${(type.herbal_actions_preview||[]).map(a=>`<li>${a.action}: ${a.explain}</li>`).join("")}</ul>
    <hr />
    <div>${copy.footer?.title||""}</div>
    <div>${copy.footer?.description||""}</div>
    <ul>${(copy.footer?.benefits||[]).map(b=>`<li>${b}</li>`).join("")}</ul>
    <div>${copy.footer?.launch_date||""}</div>
    <div class="disclaimer">${copy.app?.disclaimer||""}</div>
  `;
  // POST to Formspree
  try {
    await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userName, email: userEmail, results: html, version
      })
    });
  } catch (e) { warn("Email send failed"); }
}

async function sendWaitlist() {
  try {
    await fetch(GENERIC_WAITLIST_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userName, email: userEmail, source: "quiz", final_type: finalType
      })
    });
  } catch (e) { warn("Waitlist webhook failed"); }
}

// Accessibility: sticky progress/focus management
document.addEventListener("keydown", e => {
  if (e.key==="Tab") {
    document.body.classList.add("user-is-tabbing");
  }
});