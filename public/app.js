// Configuration  
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwiYXBwIjoiZGVtbyIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';
const EMAIL_REPORT_WEBHOOK = 'https://hook.us2.make.com/er23s3ieomte4jue36f4v4o0g3mrtsdl';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let questionOrder = [];
let surveyQuestions = [];
let answers = {};
let currentQuestionIndex = 0;
let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let resultsTemplate = null;
window.surveyLoaded = false;

console.log('🚀 APP.JS LOADED - VERSION 5.0 - CACHE BUSTED');

function scrollToWaitlist() {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth' });
  }
}

window.handleTextInput = function(qId, value) {
    answers[qId] = value;
    window.updateNavigation();
};

async function sendResponsesToGoogleSheet() {
  try {
    const payload = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      answers: answers
    };

    const resp = await fetch(EMAIL_REPORT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
    }

    console.log('✅ Survey responses sent to Google Sheets via Make webhook.');
  } catch (err) {
    console.error('❌ Failed to send survey data to Google Sheets:', err);
  }
}


// ==================== WAITLIST FUNCTIONS ====================

window.scrollToWaitlist = function() {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
    page.style.display = 'none';
  });

  // Show the requested page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.display = 'block';

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log(`✓ Switched to page: ${pageId}`);
  } else {
    console.error(`✗ Page not found: ${pageId}`);
  }
}

window.startSurvey = function() {
  currentQuestionIndex = 0;
  answers = {};
  showPage('survey-page');
  renderQuestion();
};

// ==================== MAIN INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
  showPage('landing-page');

  const quizBtn = document.getElementById('take-quiz-btn');
  if (quizBtn) quizBtn.disabled = true; // Disabled until loaded

  try {
    // Load survey questions
    const surveyResp = await fetch('survey_questions.json');
    if (!surveyResp.ok) throw new Error(`HTTP ${surveyResp.status}: ${surveyResp.statusText}`);
    const surveyData = await surveyResp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;

    // Load decision mapping
    const mappingResp = await fetch('decision_mapping.json');
    if (!mappingResp.ok) throw new Error(`HTTP ${mappingResp.status}: ${mappingResp.statusText}`);
    const decisionMapping = await mappingResp.json();

  // Load results_template.json (add this after the other fetches)
  try {
  const resultsResp = await fetch('results_template.json');
  if (!resultsResp.ok) throw new Error(`HTTP ${resultsResp.status}: ${resultsResp.statusText}`);
  resultsTemplate = await resultsResp.json();
  console.log('✅ Loaded results_template.json');
  } catch (err) {
  resultsTemplate = null;
  console.error('❌ Failed to load results_template.json:', err);
  }


// Normalize all question types first
surveyQuestions.forEach(q => {
  if (q.type === 'singlechoice' || q.type === 'single') {
    q.type = 'single_choice';
  }
});

// --- THEN process the decision mapping logic ---
surveyQuestions.forEach(q => {
  // 1. Top-level options
  if (Array.isArray(q.options)) {
const mappingList = decisionMapping?.decision_map?.[q.id];
if (mappingList) {
      q.options.forEach(opt => {
    const mapping = mappingList[opt.value];
        if (mapping && mapping.scores) {
          opt.scores = mapping.scores;
        }
      });
    }
  }

  // 2. Compound questions (items)
  if (q.type === "compound" && Array.isArray(q.items)) {
    q.items.forEach(item => {
      if (Array.isArray(item.options)) {
const mappingList = decisionMapping?.decision_map?.[item.id];
        if (mappingList) {
          item.options.forEach(opt => {
        const mapping = mappingList[opt.value];            
if (mapping && mapping.scores) {
              opt.scores = mapping.scores;
            }
          });
        }
      }
    });
  }

  // 3. Grouped questions (questions)
  if (q.type === "grouped" && Array.isArray(q.questions)) {
    q.questions.forEach(group => {
      if (Array.isArray(group.options)) {
        const mappingList = decisionMapping?.decision_map?.[id][group.id];
        if (mappingList) {
          group.options.forEach(opt => {
            const mapping = mappingList.find(m => m.value === opt.value);
            if (mapping && mapping.scores) {
              opt.scores = mapping.scores;
            }
          });
        }
      }
    });
  }
});

    window.surveyLoaded = true;
    console.log('✅ Loaded', surveyQuestions.length, 'questions');

    if (quizBtn) quizBtn.disabled = false;
  } catch (err) {
    console.error('❌ Error:', err);
    alert(`No se pudieron cargar las preguntas del quiz: ${err.message}`);
    if (quizBtn) quizBtn.disabled = true;
  }
});

// ==================== WAITLIST FORM HANDLER ====================

document.addEventListener('DOMContentLoaded', function() {
  // Landing page waitlist
  const mainWaitlistForm = document.getElementById('main-waitlist-form');
  if (mainWaitlistForm) {
    mainWaitlistForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('main-waitlist-name').value;
      const email = document.getElementById('main-waitlist-email').value;
      try {
        await fetch(WAITLIST_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, source: 'landing_page' })
        });
        alert('¡Gracias por unirte! Te notificaremos cuando lancemos.');
        mainWaitlistForm.reset();
      } catch (error) {
        console.error('Error joining waitlist:', error);
        alert('Hubo un error. Por favor intenta de nuevo.');
      }
    });
  }
  // Results page waitlist
  const resultsWaitlistForm = document.getElementById('results-waitlist-form');
  if (resultsWaitlistForm) {
    resultsWaitlistForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('results-waitlist-name').value;
      const email = document.getElementById('results-waitlist-email').value;
      try {
        await fetch(WAITLIST_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, source: 'results_page' })
        });
        alert('¡Gracias por unirte! Te notificaremos cuando lancemos.');
        resultsWaitlistForm.reset();
      } catch (error) {
        console.error('Error joining waitlist:', error);
        alert('Hubo un error. Por favor intenta de nuevo.');
      }
    });
  }
});

// ==================== UTILITY FUNCTIONS ====================

function getQuestionById(qId) {
  return surveyQuestions.find(q => q.id === qId);
}

function isQuestionVisible(question, answers) {
  if (!question) return false;
  const qId = typeof question.id === 'string' ? question.id : '';

  // always show P0 and P1
  if (qId === 'P0_contraception' || qId === 'P1') return true;

  // P1_ follow-ups
  if (qId.startsWith('P1_')) {
    return answers.P1 === 'No tengo sangrado actualmente';
  }

  if (!question.visible_if) return true;
  const cond = question.visible_if;

  // equals
  if (cond.question_id && typeof cond.equals !== 'undefined') {
    return answers[cond.question_id] === cond.equals;
  }
  // includes
  if (cond.question_id && cond.includes) {
    const ans = answers[cond.question_id];
    const inclArr = Array.isArray(cond.includes) ? cond.includes : [cond.includes];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return inclArr.some(v => ansArr.includes(v));
  }

  if (cond.all) {
    return cond.all.every(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
  }
  if (cond.any) {
    return cond.any.some(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
  }

  return true;
}

// ==================== RESULTS SECTION ====================

// --- Energetic Terrain Positioning ---
function updateEnergeticTerrain(result) {
  const dot = document.getElementById("terrain-dot");
  if (!dot || !result || !result.label_top) return;

  const map = {
    calor: { x: 80, y: 50, color: "#FF6B6B" },
    frio: { x: 20, y: 50, color: "#4ECDC4" },
    humedad: { x: 50, y: 80, color: "#00A8CC" },
    sequedad: { x: 50, y: 20, color: "#F4A261" },
    tension: { x: 70, y: 30, color: "#9C44DC" },
    relajacion: { x: 30, y: 70, color: "#90BE6D" },
    calor_humedad: { x: 75, y: 75, color: "#E76F51" },
    frio_humedad: { x: 25, y: 75, color: "#457B9D" },
    calor_sequedad: { x: 75, y: 25, color: "#F4A261" },
    frio_sequedad: { x: 25, y: 25, color: "#264653" },
    tension_calor: { x: 85, y: 35, color: "#D62828" },
    tension_humedad: { x: 65, y: 70, color: "#577590" }
  };

  const pattern = result.label_top;
  const coords = map[pattern] || { x: 50, y: 50, color: "#00D4AA" };

  dot.style.left = `${coords.x}%`;
  dot.style.top = `${coords.y}%`;
  dot.style.background = coords.color;
  dot.style.boxShadow = `0 0 20px ${coords.color}80`;
}

// --- Create diagram container dynamically ---
function createEnergeticTerrainSection(patternType) {
  const section = document.createElement("section");
  section.id = "energetic-terrain-section";
  section.className = "energetic-section";
  section.innerHTML = `
    <h3 class="energetic-title">Estado energético del ciclo</h3>
    <p class="energetic-intro">
      Tu cuerpo se mueve entre tres ejes: temperatura, humedad y tono.
      Este punto muestra hacia dónde tiende tu equilibrio actual.
    </p>
    <div id="energetic-terrain">
      <div class="axis axis-x">🔥 Calor ↔ ❄️ Frío</div>
      <div class="axis axis-y">💧 Humedad ↔ 🌵 Sequedad</div>
      <div class="axis axis-z">🌪️ Tensión ↔ 🌾 Relajación</div>
      <div id="terrain-dot"></div>
    </div>
  `;
  return section;
}

// --- Main function to show results with full template ---
function showResults(patternType) {
  const result = resultsTemplate;
  const card = document.getElementById('results-card');
  card.innerHTML = ''; // clear old results

  const elementTitle = result.element?.by_pattern?.[patternType]?.[0] || patternType;
  const title = document.createElement('h2');
  title.className = 'results-main-title';
  title.textContent = elementTitle;
  card.appendChild(title);

  const subtitleText =
    (result.summary?.single || 'Tu tipo de ciclo: {{label_top}}').replace(
      '{{label_top}}',
      result.labels?.[patternType] || patternType
    );
  const subtitle = document.createElement('h3');
  subtitle.className = 'results-subtitle';
  subtitle.textContent = subtitleText;
  card.appendChild(subtitle);

  // --- ADD ENERGETIC TERRAIN HERE ---
  const terrainSection = createEnergeticTerrainSection(patternType);
  card.appendChild(terrainSection);
  updateEnergeticTerrain({ label_top: patternType });
  // -----------------------------------

  const patternData = result.pattern_card?.single?.[patternType];
  if (patternData) {
    const patternSection = document.createElement('div');
    patternSection.className = 'pattern-description';
    const expl = patternData.pattern_explainer || '';
    const bullets = (patternData.characteristics || [])
      .map((c) => `<li>${c}</li>`)
      .join('');
    patternSection.innerHTML = `
      <p class="pattern-explainer">${expl}</p>
      <ul class="characteristics">${bullets}</ul>`;
    card.appendChild(patternSection);
  }

  const why = result.why_cluster?.by_pattern?.[patternType]?.[0];
  if (why) {
    const whySection = document.createElement('div');
    whySection.className = 'why-cluster';
    whySection.innerHTML = `<h4>¿Por qué se agrupan tus síntomas?</h4><p>${why}</p>`;
    card.appendChild(whySection);
  }

  const habits = result.care_tips?.by_pattern?.[patternType] || [];
  if (habits.length) {
    const habitsSection = document.createElement('div');
    habitsSection.className = 'recommendations';
    const items = habits.map((h) => `<li>${h}</li>`).join('');
    habitsSection.innerHTML = `
      <h4>🌸 Mini-hábitos para tu patrón</h4>
      <ul class="recommendations-list">${items}</ul>`;
    card.appendChild(habitsSection);
  }

  const phases = result.phase?.generic || {};
  if (Object.keys(phases).length) {
    const phaseSection = document.createElement('div');
    phaseSection.className = 'tips-phase-section';
    phaseSection.innerHTML = `
      <h4 class="tips-main-title">Tips de cuidado por fase del ciclo</h4>
      <div class="phases-container">
        ${Object.values(phases)
          .map(
            (p) => `
            <div class="phase-block">
              <h5>${p.label}</h5>
              <p>${p.about}</p>
              <ul>${p.do
                .slice(0, 3)
                .map((d) => `<li>${d}</li>`)
                .join('')}</ul>
            </div>`
          )
          .join('')}
      </div>`;
    card.appendChild(phaseSection);
  }

  const cdrContainer = document.createElement('section');
  cdrContainer.className = 'cdr-section';

  cdrContainer.innerHTML = `
    <div class="cdr-header">
      <h3>🌿 Colita de Rana Club</h3>
      <p>Tu cuerpo tiene un lenguaje propio. Nuestro sistema lo traduce en elementos (aire, fuego, tierra y agua) para ofrecerte <em>medicina personalizada</em> que evoluciona contigo.</p>
    </div>
  `;

  const diff = result.unique_system?.differentiators || [];
  if (diff.length) {
    const uniqueGrid = document.createElement('div');
    uniqueGrid.className = 'unique-system';
    uniqueGrid.innerHTML = `
      <h4>${result.unique_system.title}</h4>
      <div class="unique-grid">
        ${diff
          .map(
            (d) => `
          <div class="unique-item">
            <h5>${d.title}</h5>
            <p>${d.description}</p>
          </div>`
          )
          .join('')}
      </div>`;
    cdrContainer.appendChild(uniqueGrid);
