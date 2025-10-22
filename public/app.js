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
let currentPatternType = null; // ✅ ADDED: Store pattern for PDF generation

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

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
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
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
    page.style.display = 'none';
  });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.display = 'block';
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
  if (quizBtn) quizBtn.disabled = true;

  try {
    const surveyResp = await fetch('survey_questions.json');
    if (!surveyResp.ok) throw new Error(`HTTP ${surveyResp.status}: ${surveyResp.statusText}`);
    const surveyData = await surveyResp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;

    const mappingResp = await fetch('decision_mapping.json');
    if (!mappingResp.ok) throw new Error(`HTTP ${mappingResp.status}: ${mappingResp.statusText}`);
    const decisionMapping = await mappingResp.json();

    try {
      const resultsResp = await fetch('results_template.json');
      if (!resultsResp.ok) throw new Error(`HTTP ${resultsResp.status}: ${resultsResp.statusText}`);
      resultsTemplate = await resultsResp.json();
      console.log('✅ Loaded results_template.json');
    } catch (err) {
      resultsTemplate = null;
      console.error('❌ Failed to load results_template.json:', err);
    }

    surveyQuestions.forEach(q => {
      if (q.type === 'singlechoice' || q.type === 'single') {
        q.type = 'single_choice';
      }
    });

    surveyQuestions.forEach(q => {
      if (Array.isArray(q.options)) {
        const mappingList = decisionMapping?.decision_map?.[q.id];
        if (mappingList) {
          q.options.forEach(opt => {
            const mapping = mappingList[opt.value];
            if (mapping && mapping.scores) opt.scores = mapping.scores;
          });
        }
      }

      if (q.type === "compound" && Array.isArray(q.items)) {
        q.items.forEach(item => {
          if (Array.isArray(item.options)) {
            const mappingList = decisionMapping?.decision_map?.[item.id];
            if (mappingList) {
              item.options.forEach(opt => {
                const mapping = mappingList[opt.value];
                if (mapping && mapping.scores) opt.scores = mapping.scores;
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

  // not_includes
  if (cond.question_id && cond.not_includes) {
    const ans = answers[cond.question_id];
    const notInclArr = Array.isArray(cond.not_includes) ? cond.not_includes : [cond.not_includes];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return !notInclArr.some(v => ansArr.includes(v));
  }

  // includes_any
  if (cond.question_id && cond.includes_any) {
    const ans = answers[cond.question_id];
    const anyArr = Array.isArray(cond.includes_any) ? cond.includes_any : [cond.includes_any];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return anyArr.some(v => ansArr.includes(v));
  }

  // not_in
  if (cond.question_id && cond.not_in) {
    const ans = answers[cond.question_id];
    const notInArr = Array.isArray(cond.not_in) ? cond.not_in : [cond.not_in];
    return !notInArr.includes(ans);
  }

  // not_includes_any
  if (cond.question_id && cond.not_includes_any) {
    const ans = answers[cond.question_id];
    const notAnyArr = Array.isArray(cond.not_includes_any) ? cond.not_includes_any : [cond.not_includes_any];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return !notAnyArr.some(v => ansArr.includes(v));
  }

  // at_least
  if (cond.question_id && typeof cond.at_least === 'number') {
    const ans = answers[cond.question_id];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return ansArr.length >= cond.at_least;
  }

  // all
  if (cond.all) {
    return cond.all.every(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
  }

  // any
  if (cond.any) {
    return cond.any.some(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
  }

  return true;
}

function getNextVisibleQuestionIndex(currentIndex) {
  for (let i = currentIndex + 1; i < questionOrder.length; i++) {
    const qId = questionOrder[i];
    const question = getQuestionById(qId);
    if (isQuestionVisible(question, answers)) {
      return i;
    }
  }
  return -1;
}

function getPrevVisibleQuestionIndex(currentIndex) {
  for (let i = currentQuestionIndex - 1; i >= 0; i--) {
    const qId = questionOrder[i];
    const question = getQuestionById(qId);
    if (isQuestionVisible(question, answers)) {
      return i;
    }
  }
  return -1;
}

window.finishSurvey = function () {
  const patternKey = calculateResults();
  currentPatternType = patternKey; // ✅ ADDED: Store pattern globally
  showResults(patternKey);
  sendResponsesToGoogleSheet();
};

// ==================== SURVEY RENDERING ====================
function renderQuestion() {
  let qId = questionOrder[currentQuestionIndex];
  let question = getQuestionById(qId);

  // Guard for undefined question
  if (!question) {
    finishSurvey();
    return;
  }

  console.log('Rendering question:', question.id, 'type:', question.type, 'options:', question.options);

  // Skip invisible questions
  while (question && !isQuestionVisible(question, answers)) {
    const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
    if (nextIdx > -1) {
      currentQuestionIndex = nextIdx;
      qId = questionOrder[currentQuestionIndex];
      question = getQuestionById(qId);
    } else {
      finishSurvey();
      return;
    }
  }

  if (!question) {
    finishSurvey();
    return;
  }

  // Initialize answers for multiselect
  if (question.type === "multiselect" && !answers[qId]) {
    answers[qId] = [];
    console.log(`✅ Initialized ${qId} as empty array`);
  }

  const surveyContent = document.getElementById('survey-content');
  if (!surveyContent) return;

  let optionsHtml = '';

  // Handle standard option types
  if ((question.type === 'multiselect' || question.type === 'single_choice') && Array.isArray(question.options)) {
    question.options.forEach((option, index) => {
      const isMultiSelect = question.type === 'multiselect';
      const optionClass = isMultiSelect ? 'option multi-select' : 'option';
      const selected = isMultiSelect
        ? (answers[qId] && answers[qId].includes(option.value))
        : answers[qId] === option.value;

      optionsHtml += `
        <div class="${optionClass} ${selected ? 'selected' : ''}"
             data-value="${option.value}"
             onclick="handleOptionClick('${qId}', '${option.value}', ${isMultiSelect})">
          ${option.label}
        </div>
      `;
    });
  }

  // Handle compound questions
  if (question.type === 'compound' && Array.isArray(question.items)) {
    optionsHtml = '<div class="compound-question">';
    question.items.forEach(item => {
      optionsHtml += `
        <div class="compound-item">
          <label class="compound-label">${item.label}</label>
          <div class="compound-options">
      `;
      if (Array.isArray(item.options)) {
        item.options.forEach(opt => {
          const selected = answers[item.id] === opt.value;
          optionsHtml += `
            <div class="option ${selected ? 'selected' : ''}"
                 data-value="${opt.value}"
                 onclick="handleCompoundOption('${item.id}', '${opt.value}')">
              ${opt.label}
            </div>
          `;
        });
      }
      optionsHtml += '</div></div>';
    });
    optionsHtml += '</div>';
  }

  // Handle text/number inputs
  if (question.type === 'text' || question.type === 'number') {
    const inputType = question.type === 'number' ? 'number' : 'text';
    const currentVal = answers[qId] || '';
    optionsHtml = `
      <input type="${inputType}"
             class="text-input"
             value="${currentVal}"
             placeholder="${question.placeholder || ''}"
             oninput="handleTextInput('${qId}', this.value)" />
    `;
  }

  surveyContent.innerHTML = `
    <div class="question-container">
      <h2 class="question-title">${question.question}</h2>
      ${question.description ? `<p class="question-description">${question.description}</p>` : ''}
      <div class="options-container">
        ${optionsHtml}
      </div>
    </div>
  `;

  updateNavigation();
}

window.handleOptionClick = function(qId, value, isMultiSelect) {
  if (isMultiSelect) {
    if (!Array.isArray(answers[qId])) answers[qId] = [];
    const idx = answers[qId].indexOf(value);
    if (idx > -1) {
      answers[qId].splice(idx, 1);
    } else {
      answers[qId].push(value);
    }
  } else {
    answers[qId] = value;
  }
  renderQuestion();
};

window.handleCompoundOption = function(itemId, value) {
  answers[itemId] = value;
  renderQuestion();
};

// ==================== NAVIGATION ====================
function updateNavigation() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) {
    prevBtn.disabled = getPrevVisibleQuestionIndex(currentQuestionIndex) === -1;
  }

  const qId = questionOrder[currentQuestionIndex];
  const question = getQuestionById(qId);
  const isAnswered = answers[qId] !== undefined && answers[qId] !== '' &&
    !(Array.isArray(answers[qId]) && answers[qId].length === 0);

  if (nextBtn) {
    const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
    if (nextIdx === -1) {
      nextBtn.textContent = 'Finalizar';
      nextBtn.disabled = !isAnswered;
    } else {
      nextBtn.textContent = 'Siguiente';
      nextBtn.disabled = !isAnswered;
    }
  }
}

window.updateNavigation = updateNavigation;

window.prevQuestion = function() {
  const prevIdx = getPrevVisibleQuestionIndex(currentQuestionIndex);
  if (prevIdx > -1) {
    currentQuestionIndex = prevIdx;
    renderQuestion();
  }
};

window.nextQuestion = function() {
  const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
  if (nextIdx > -1) {
    currentQuestionIndex = nextIdx;
    renderQuestion();
  } else {
    finishSurvey();
  }
};

// ==================== CALCULATE RESULTS ====================
function calculateResults() {
  const scores = { calor: 0, frio: 0, humedo: 0, seco: 0, tension: 0, deficiencia: 0 };

  surveyQuestions.forEach(q => {
    const qId = q.id;
    const userAnswer = answers[qId];

    if (!userAnswer) return;

    // Single choice
    if (q.type === 'single_choice' && Array.isArray(q.options)) {
      const selectedOption = q.options.find(opt => opt.value === userAnswer);
      if (selectedOption && selectedOption.scores) {
        Object.keys(selectedOption.scores).forEach(dim => {
          scores[dim] = (scores[dim] || 0) + selectedOption.scores[dim];
        });
      }
    }

    // Multiselect
    if (q.type === 'multiselect' && Array.isArray(userAnswer) && Array.isArray(q.options)) {
      userAnswer.forEach(val => {
        const selectedOption = q.options.find(opt => opt.value === val);
        if (selectedOption && selectedOption.scores) {
          Object.keys(selectedOption.scores).forEach(dim => {
            scores[dim] = (scores[dim] || 0) + selectedOption.scores[dim];
          });
        }
      });
    }

    // Compound
    if (q.type === 'compound' && Array.isArray(q.items)) {
      q.items.forEach(item => {
        const itemAnswer = answers[item.id];
        if (itemAnswer && Array.isArray(item.options)) {
          const selectedOption = item.options.find(opt => opt.value === itemAnswer);
          if (selectedOption && selectedOption.scores) {
            Object.keys(selectedOption.scores).forEach(dim => {
              scores[dim] = (scores[dim] || 0) + selectedOption.scores[dim];
            });
          }
        }
      });
    }
  });

  console.log('Final scores:', scores);

  // Determine pattern
  const { calor, frio, humedo, seco, tension, deficiencia } = scores;
  const tempAxis = calor - frio;
  const humidityAxis = humedo - seco;
  const toneAxis = tension - deficiencia;

  if (Math.abs(tempAxis) > Math.abs(humidityAxis) && Math.abs(tempAxis) > Math.abs(toneAxis)) {
    return tempAxis > 0 ? 'calor' : 'frio';
  } else if (Math.abs(humidityAxis) > Math.abs(toneAxis)) {
    return humidityAxis > 0 ? 'humedo' : 'seco';
  } else {
    return toneAxis > 0 ? 'tension' : 'deficiencia';
  }
}

// ==================== SHOW RESULTS ====================
// ✅ FIXED: renderPhase now accepts patternKey parameter
function renderPhase(patternKey) {
  const result = resultsTemplate;
  const card = document.getElementById("results-card");
  if (!card || !result) return;

  const phases = result.phase?.generic || {};
  if (!Object.keys(phases).length) return;

  const phaseSection = document.createElement("div");
  phaseSection.className = "tips-phase-section";
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
              .join("")}</ul>
          </div>`
        )
        .join("")}
    </div>`;
  card.appendChild(phaseSection);
}

function createEnergeticTerrainSection(patternType) {
  const section = document.createElement("div");
  section.id = "energetic-terrain";
  section.className = "energetic-terrain";
  section.innerHTML = `
    <h4>Estado energético de tu ciclo</h4>
    <div class="terrain-visual">
      <div class="terrain-axis terrain-vertical"></div>
      <div class="terrain-axis terrain-horizontal"></div>
      <div class="terrain-dot" id="terrain-dot"></div>
    </div>
  `;
  return section;
}

function positionEnergeticDot(patternType) {
  const dot = document.getElementById('terrain-dot');
  if (!dot) return;

  const positions = {
    calor: { x: 50, y: 20 },
    frio: { x: 50, y: 80 },
    humedo: { x: 80, y: 50 },
    seco: { x: 20, y: 50 },
    tension: { x: 65, y: 35 },
    deficiencia: { x: 35, y: 65 }
  };

  const pos = positions[patternType] || { x: 50, y: 50 };
  dot.style.left = pos.x + '%';
  dot.style.top = pos.y + '%';
}

function showResults(patternType) {
  if (!resultsTemplate) {
    console.error("❌ resultsTemplate is null — failed to load results_template.json");
    alert("No se pudo cargar el archivo de resultados. Revisa results_template.json");
    return;
  }

  showPage('results-page');

  const result = resultsTemplate;
  const card = document.getElementById("results-card");
  if (!card) return;
  card.innerHTML = "";

  // --- Element Header ---
  const elementTitle = result.element?.by_pattern?.[patternType]?.[0] || patternType;
  const title = document.createElement("h2");
  title.className = "results-main-title";
  title.textContent = elementTitle;
  card.appendChild(title);

  // --- Subtitle ---
  const subtitleText =
    (result.summary?.single || "Tu tipo de ciclo: {{label_top}}").replace(
      "{{label_top}}",
      result.labels?.[patternType] || patternType
    );
  const subtitle = document.createElement("h3");
  subtitle.className = "results-subtitle";
  subtitle.textContent = subtitleText;
  card.appendChild(subtitle);

  // --- Pattern Card ---
  const patternData = result.pattern_card?.single?.[patternType];
  if (patternData) {
    const patternSection = document.createElement("div");
    patternSection.className = "pattern-description";
    const expl = patternData.pattern_explainer || "";
    const bullets = (patternData.characteristics || [])
      .map((c) => `<li>${c}</li>`)
      .join("");
    patternSection.innerHTML = `
      <p class="pattern-explainer">${expl}</p>
      <ul class="characteristics">${bullets}</ul>`;
    card.appendChild(patternSection);
  }

  // --- Energetic Terrain Section ---
  const terrainSection = createEnergeticTerrainSection(patternType);
  card.appendChild(terrainSection);
  setTimeout(() => positionEnergeticDot(patternType), 120);

  // --- Why Cluster ---
  const why = result.why_cluster?.by_pattern?.[patternType]?.[0];
  if (why) {
    const whySection = document.createElement("div");
    whySection.className = "why-cluster";
    whySection.innerHTML = `<h4>¿Por qué se agrupan tus síntomas?</h4><p>${why}</p>`;
    card.appendChild(whySection);
  }

  // --- Care Tips ---
  const habits = result.care_tips?.by_pattern?.[patternType] || [];
  if (habits.length) {
    const habitsSection = document.createElement("div");
    habitsSection.className = "recommendations";
    const items = habits.map((h) => `<li>${h}</li>`).join("");
    habitsSection.innerHTML = `
      <h4>🌸 Mini-hábitos para tu patrón</h4>
      <ul class="recommendations-list">${items}</ul>`;
    card.appendChild(habitsSection);
  }

  // ✅ FIXED: Pass patternType to renderPhase
  renderPhase(patternType);

  // --- Colita de Rana Club Section ---
  const cdrContainer = document.createElement("section");
  cdrContainer.className = "cdr-section";
  cdrContainer.innerHTML = `
    <div class="cdr-header">
      <h3>🌿 Colita de Rana Club</h3>
      <p>Tu cuerpo tiene un lenguaje propio. Nuestro sistema lo traduce en elementos (aire, fuego, tierra y agua) para ofrecerte <em>medicina personalizada</em> que evoluciona contigo.</p>
    </div>
  `;

  // Herbal mechanisms
  const herbs = result.how_herbs_work?.by_pattern?.[patternType];
  if (herbs) {
    const herbSection = document.createElement("div");
    herbSection.className = "herbs-section";
    herbSection.innerHTML = `
      <h4>Cómo trabajaríamos tu patrón</h4>
      <ul class="herb-mechanisms">
        ${herbs.mechanism.map((m) => `<li>${m}</li>`).join("")}
      </ul>
      <p class="herb-logic">${herbs.combo_logic}</p>`;
    cdrContainer.appendChild(herbSection);
  }

  // Unique system differentiators
  const diff = result.unique_system?.differentiators || [];
  if (diff.length) {
    const uniqueGrid = document.createElement("div");
    uniqueGrid.className = "unique-system";
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
          .join("")}
      </div>`;
    cdrContainer.appendChild(uniqueGrid);
  }

  card.appendChild(cdrContainer);

  // Disclaimer
  const disclaimer = document.createElement("p");
  disclaimer.className = "results-disclaimer";
  disclaimer.textContent =
    result.meta?.disclaimer ||
    "Esta información es educativa y no sustituye consejo médico profesional.";
  card.appendChild(disclaimer);

  // ✅ ADDED: PDF controls
  addPDFControls();
}

// ==================== PDF + EMAIL FUNCTIONALITY ====================
function extractResultsHTML() {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard) throw new Error('Results card not found');
  
  const clone = resultsCard.cloneNode(true);
  const buttons = clone.querySelectorAll('button, #pdf-controls');
  buttons.forEach(btn => btn.remove());
  
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-results-wrapper';
  wrapper.appendChild(clone);
  
  return wrapper.outerHTML;
}

async function extractCSSContent() {
  let allCSS = '';
  
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach(style => {
    allCSS += style.textContent + '\n';
  });
  
  const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
  for (const link of linkElements) {
    try {
      const response = await fetch(link.href);
      const css = await response.text();
      allCSS += css + '\n';
    } catch (e) {
      console.warn(`Failed to fetch CSS from ${link.href}`, e);
    }
  }
  
  return allCSS;
}

async function generateAndSendPDF(email = null) {
  try {
    const resultsHTML = extractResultsHTML();
    const cssContent = await extractCSSContent();
    
    const payload = {
      resultsHTML,
      cssContent,
      email,
      sessionId,
      patternType: currentPatternType
    };

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    const blob = await response.blob();
    
    if (!email) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultados-colita-de-rana-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

function addPDFControls() {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard || document.getElementById('pdf-controls')) return;

  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'pdf-controls';
  controlsContainer.className = 'pdf-controls';
  controlsContainer.style.cssText = 'margin-top: 30px; padding: 20px; text-align: center;';

  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn-primary';
  downloadBtn.innerHTML = '📄 Descargar resultados en PDF';
  downloadBtn.style.cssText = 'margin: 10px;';
  
  downloadBtn.addEventListener('click', async () => {
    try {
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Generando PDF...';
      await generateAndSendPDF(null);
      downloadBtn.textContent = '✅ PDF descargado';
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '📄 Descargar resultados en PDF';
      }, 3000);
    } catch {
      alert('❌ Error al generar el PDF');
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '📄 Descargar resultados en PDF';
    }
  });

  // Email section
  const emailSection = document.createElement('div');
  emailSection.style.cssText = 'margin-top: 20px;';
  emailSection.innerHTML = `
    <p style="margin-bottom: 10px; color: var(--color-text-secondary);">
      O recibe tus resultados por correo:
    </p>
    <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap;">
      <input type="email" id="pdf-email-input" placeholder="tu@correo.com" class="form-control"
        style="max-width: 300px; flex: 1; min-width: 200px;" />
      <button id="email-pdf-btn" class="btn-secondary">✉️ Enviar por email</button>
    </div>
  `;

  controlsContainer.appendChild(downloadBtn);
  controlsContainer.appendChild(emailSection);
  resultsCard.appendChild(controlsContainer);

  // Email button logic
  const emailBtn = document.getElementById('email-pdf-btn');
  const emailInput = document.getElementById('pdf-email-input');

  emailBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Por favor ingresa un correo electrónico válido.');
      return;
    }

    try {
      emailBtn.disabled = true;
      emailBtn.textContent = 'Enviando...';
      await generateAndSendPDF(email);
      emailBtn.textContent = '✅ Enviado';
      emailInput.value = '';
      alert(`✅ Tu reporte ha sido enviado a ${email}`);
      setTimeout(() => {
        emailBtn.disabled = false;
        emailBtn.textContent = '✉️ Enviar por email';
      }, 3000);
    } catch {
      alert('❌ Hubo un error al enviar el correo.');
      emailBtn.disabled = false;
      emailBtn.textContent = '✉️ Enviar por email';
    }
  });
}

console.log('✅ App.js fully loaded with PDF support');
