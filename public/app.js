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

console.log('🚀 APP.JS LOADED - MERGED CLEAN VERSION');

// Waitlist scroll handler
window.scrollToWaitlist = function () {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Start survey
window.startSurvey = function () {
  currentQuestionIndex = 0;
  answers = {};
  showPage('survey-page');
  renderQuestion();
};

// Send responses
async function sendResponsesToGoogleSheet() {
  try {
    const payload = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      answers: answers
    };

    const resp = await fetch(WAITLIST_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
    }

    console.log('✅ Survey responses sent to webhook.');
  } catch (err) {
    console.error('❌ Failed to send survey:', err);
  }
}
// Load survey and decision mapping
document.addEventListener('DOMContentLoaded', async function () {
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

    const resultsResp = await fetch('results_template.json');
    if (!resultsResp.ok) throw new Error(`HTTP ${resultsResp.status}: ${resultsResp.statusText}`);
    resultsTemplate = await resultsResp.json();

    // Normalize question types
    surveyQuestions.forEach(q => {
      if (q.type === 'singlechoice' || q.type === 'single') {
        q.type = 'single_choice';
      }
    });

    // Apply scoring
    surveyQuestions.forEach(q => {
      const applyScores = (items, id) => {
        const mappingList = decisionMapping?.scoring?.[id];
        if (!mappingList) {
          console.warn(`⚠️ No scoring found for ${id}`);
          return;
        }
        items.forEach(opt => {
          const mapping = mappingList.find(m => m.value === opt.value);
          if (mapping?.scores) opt.scores = mapping.scores;
        });
      };

      if (Array.isArray(q.options)) applyScores(q.options, q.id);
      if (q.type === 'compound' && Array.isArray(q.items)) {
        q.items.forEach(item => Array.isArray(item.options) && applyScores(item.options, item.id));
      }
      if (q.type === 'grouped' && Array.isArray(q.questions)) {
        q.questions.forEach(group => Array.isArray(group.options) && applyScores(group.options, group.id));
      }
    });

    window.surveyLoaded = true;
    console.log('✅ Survey loaded:', surveyQuestions.length, 'questions');
    if (quizBtn) quizBtn.disabled = false;

  } catch (err) {
    console.error('❌ Error loading survey:', err);
    alert(`No se pudieron cargar las preguntas: ${err.message}`);
    if (quizBtn) quizBtn.disabled = true;
  }
});
// ==================== SURVEY CONTROLS ====================

window.startSurvey = function () {
  currentQuestionIndex = 0;
  answers = {};
  showPage('survey-page');
  renderQuestion();
};

window.handleTextInput = function(qId, value) {
  answers[qId] = value;
  window.updateNavigation();
};

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

window.scrollToWaitlist = function () {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

window.finishSurvey = function () {
  const patternKey = calculateResults();
  showResults(patternKey);
  sendResponsesToGoogleSheet();
};
// ==================== NAVIGATION ====================

function getNextVisibleQuestionIndex(currentIndex) {
  for (let i = currentIndex + 1; i < questionOrder.length; i++) {
    const qId = questionOrder[i];
    const question = getQuestionById(qId);
    if (isQuestionVisible(question, answers)) return i;
  }
  return -1;
}

function getPrevVisibleQuestionIndex(currentIndex) {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const qId = questionOrder[i];
    const question = getQuestionById(qId);
    if (isQuestionVisible(question, answers)) return i;
  }
  return -1;
}

window.nextQuestion = function () {
  console.log('⏭️ Next clicked from:', questionOrder[currentQuestionIndex]);
  const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
  if (nextIdx > -1) {
    currentQuestionIndex = nextIdx;
    renderQuestion();
  } else {
    finishSurvey();
  }
};

window.previousQuestion = function () {
  console.log('⏮️ Previous clicked from:', questionOrder[currentQuestionIndex]);
  const prevIdx = getPrevVisibleQuestionIndex(currentQuestionIndex);
  if (prevIdx > -1) {
    currentQuestionIndex = prevIdx;
    renderQuestion();
  }
};

// ==================== PROGRESS BAR ====================

function updateProgress() {
  let visibleCount = 0;
  for (let i = 0; i <= currentQuestionIndex; i++) {
    const q = getQuestionById(questionOrder[i]);
    if (isQuestionVisible(q, answers)) visibleCount++;
  }

  const totalVisible = questionOrder.filter(qId => {
    const q = getQuestionById(qId);
    return isQuestionVisible(q, answers);
  }).length;

  const progress = (visibleCount / totalVisible) * 100;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// ==================== SURVEY COMPLETION ====================

window.finishSurvey = function () {
  const patternKey = calculateResults();
  showResults(patternKey);
  sendResponsesToGoogleSheet();
};
// ==================== RESULTS CALCULATION ====================

function calculateResults() {
  const scores = {
    tension: 0,
    calor: 0,
    frio: 0,
    humedad: 0,
    sequedad: 0
  };

  surveyQuestions.forEach(question => {
    const answer = answers[question.id];
    if (!answer) return;

    const answerArray = Array.isArray(answer) ? answer : [answer];
    if (question.options) {
      answerArray.forEach(value => {
        const option = question.options.find(opt => opt.value === value);
        if (option && option.scores) {
          Object.entries(option.scores).forEach(([key, val]) => {
            scores[key] += val;
          });
        }
      });
    }
  });

  let maxScore = 0;
  let dominantPattern = 'sequedad';
  Object.entries(scores).forEach(([pattern, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantPattern = pattern;
    }
  });

  return dominantPattern;
}
// ==================== RESULTS DISPLAY ====================

function showResults(patternKey) {
  const label = resultsTemplate?.labels?.[patternKey] || patternKey;
  const summary = resultsTemplate?.summary?.single
    ? resultsTemplate.summary.single.replace('{{label_top}}', label)
    : label;

  let html = `
    <h2>${resultsTemplate?.element?.by_pattern?.[patternKey] || label}</h2>
    <h3>${summary}</h3>
    ${renderPatternCard(patternKey)}
    ${renderCareTips(patternKey)}
    ${renderPhaseAdvice(patternKey)}
    <div class="disclaimer">
      <strong>Nota importante:</strong>
      ${resultsTemplate?.meta?.disclaimer || 'Esta evaluación es orientativa.'}
    </div>
  `;

  document.getElementById('results-card').innerHTML = html;

  const emailFormSection = document.getElementById('email-results-form-section');
  if (emailFormSection) emailFormSection.style.display = 'none';

  showPage('results-page');
}
function renderPatternCard(patternKey) {
  const card = resultsTemplate?.pattern_card?.single?.[patternKey] || {};
  if (!card.pattern_explainer) return '';

  return `
    <div class="pattern-description">${card.pattern_explainer}</div>
    <ul class="characteristics">
      ${(card.characteristics || []).map(char => `<li>${char}</li>`).join('')}
    </ul>
  `;
}

function renderCareTips(patternKey) {
  const tips = resultsTemplate?.care_tips?.by_pattern?.[patternKey] || [];
  if (!tips.length) return '';
  return `
    <div class="recommendations">
      <h4>Mini-hábitos por patrón</h4>
      <ul class="recommendations-list">
        ${tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderPhaseAdvice(patternKey) {
  const phaseSections = resultsTemplate?.phase?.generic || {};
  if (!Object.keys(phaseSections).length) return '';
    let html = `<div class="tips-phase-section">
    <h4 class="tips-main-title">Tips de cuidado por fase del ciclo</h4>
    <div class="phases-container">`;

  Object.entries(phaseSections).forEach(([phaseKey, phase]) => {
    html += `<div class="phase-block">
      <div class="phase-header">
        <h5 class="phase-title">${phase.label}</h5>
        <div class="phase-description">${phase.about}</div>
      </div>
      <div class="phase-content">`;

    if (phase.foods?.length) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Alimentos</div>
        <ul class="subsection-list">
          ${phase.foods.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (phase.do?.length) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Haz</div>
        <ul class="subsection-list">
          ${phase.do.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (phase.avoid?.length) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Evita</div>
        <ul class="subsection-list">
          ${phase.avoid.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    }

    html += `</div></div>`; // Close content + block
  });

  html += `</div></div>`; // Close container + section
  return html;
}
function renderPatternCard(patternKey) {
  const card = resultsTemplate?.pattern_card?.single?.[patternKey] || {};
  if (!card.pattern_explainer) return '';

  return `
    <div class="pattern-description">${card.pattern_explainer}</div>
    <ul class="characteristics">
      ${(card.characteristics || []).map(char => `<li>${char}</li>`).join('')}
    </ul>
  `;
}

function showResults(patternKey) {
  const label = resultsTemplate?.labels?.[patternKey] || patternKey;
  const summary = resultsTemplate?.summary?.single
    ? resultsTemplate.summary.single.replace('{{label_top}}', label)
    : label;

  let html = `
    <h2>${resultsTemplate?.element?.by_pattern?.[patternKey] || label}</h2>
    <h3>${summary}</h3>
    ${renderPatternCard(patternKey)}
    ${renderCareTips(patternKey)}
    ${renderPhaseAdvice(patternKey)}
    <div class="disclaimer">
      <strong>Nota importante:</strong>
      ${resultsTemplate?.meta?.disclaimer || 'Esta evaluación es orientativa.'}
    </div>
  `;

  document.getElementById('results-card').innerHTML = html;

  const emailFormSection = document.getElementById('email-results-form-section');
  if (emailFormSection) emailFormSection.style.display = 'none';

  showPage('results-page');
}
// ==================== PROGRESS BAR ====================

function updateProgress() {
  let visibleCount = 0;
  for (let i = 0; i <= currentQuestionIndex; i++) {
    const q = getQuestionById(questionOrder[i]);
    if (isQuestionVisible(q, answers)) visibleCount++;
  }
  const totalVisible = questionOrder.filter(qId => isQuestionVisible(getQuestionById(qId), answers)).length;
  const progress = (visibleCount / totalVisible) * 100;

  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// ==================== NAVIGATION ====================

window.updateNavigation = function() {
  const qId = questionOrder[currentQuestionIndex];
  const question = getQuestionById(qId);
  let hasAnswer = false;

  if (!question) return;

  if (question.type === 'multiselect') {
    const selected = Array.isArray(answers[qId]) ? answers[qId] : [];
    const minSelected = question.validation?.minselected ?? 1;
    hasAnswer = minSelected === 0 || selected.length >= minSelected;

  } else if (question.type === 'single_choice') {
    hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';

  } else if (question.type === 'slider') {
    hasAnswer = typeof answers[qId] === 'number';
  } else if (question.type === 'compound' && Array.isArray(question.items)) {
    hasAnswer = question.items.every(item => {
      if (item.type === 'multiselect') {
        const selected = Array.isArray(answers[item.id]) ? answers[item.id] : [];
        const minSelected = item.validation?.minselected ?? 1;
        return minSelected === 0 || selected.length >= minSelected;
      } else if (item.type === 'single_choice') {
        return answers[item.id] !== undefined && answers[item.id] !== '';
      } else if (item.type === 'slider') {
        return typeof answers[item.id] === 'number';
      } else {
        return true;
      }
    });

  } else if (question.type === 'grouped' && Array.isArray(question.questions)) {
    hasAnswer = question.questions.every(group => {
      if (group.type === 'multiselect') {
        const selected = Array.isArray(answers[group.id]) ? answers[group.id] : [];
        const minSelected = group.validation?.minselected ?? 1;
        return minSelected === 0 || selected.length >= minSelected;
      } else if (group.type === 'single_choice') {
        return answers[group.id] !== undefined && answers[group.id] !== '';
      } else if (group.type === 'slider') {
        return typeof answers[group.id] === 'number';
      } else {
        return true;
      }
    });

  } else {
    hasAnswer = !!answers[qId];
  }

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.disabled = !hasAnswer;

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.style.display = getPrevVisibleQuestionIndex(currentQuestionIndex) !== -1 ? 'block' : 'none';
  }
};
// ==================== DEBUG + HELPERS ====================

window.debugAnswers = function () {
  console.log("🧪 Current answers:", JSON.stringify(answers, null, 2));
};

window.resetSurvey = function () {
  if (confirm("¿Estás seguro de que quieres reiniciar el cuestionario?")) {
    answers = {};
    currentQuestionIndex = 0;
    showPage('survey-page');
    renderQuestion();
  }
};

console.log("✅ app.js loaded and ready.");
