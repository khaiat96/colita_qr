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

console.log('🚀 APP.JS LOADED - FIXED TO MATCH YOUR CSS CLASSES');

// ==================== HELPER FUNCTIONS ====================

function getQuestionById(qId) {
  return surveyQuestions.find(q => q.id === qId);
}

function isQuestionVisible(question, currentAnswers) {
  if (!question || !question.visible_if) return true;
  
  const cond = question.visible_if;
  
  // Handle "any" conditions
  if (cond.any && Array.isArray(cond.any)) {
    return cond.any.some(condition => evaluateCondition(condition, currentAnswers));
  }
  
  // Handle "all" conditions  
  if (cond.all && Array.isArray(cond.all)) {
    return cond.all.every(condition => evaluateCondition(condition, currentAnswers));
  }
  
  // Handle direct condition
  return evaluateCondition(cond, currentAnswers);
}

function evaluateCondition(condition, currentAnswers) {
  const answer = currentAnswers[condition.question_id];
  
  if (!answer) return false;
  
  if (condition.equals) {
    return answer === condition.equals;
  }
  
  if (condition.includes && Array.isArray(condition.includes)) {
    if (Array.isArray(answer)) {
      return condition.includes.some(val => answer.includes(val));
    } else {
      return condition.includes.includes(answer);
    }
  }
  
  return false;
}

// ==================== COMPOUND HELPER FUNCTION ====================

function renderCompoundItem(item) {
  const qId = item.id;
  let html = `<div style="margin: 20px 0; padding: 15px; border-left: 3px solid #00D4AA; background: rgba(0, 212, 170, 0.05);">`;
  html += `<h4 style="margin: 0 0 10px 0; color: #333;">${item.title}</h4>`;
  
  if (item.help_text) {
    html += `<p style="color: #b0b0b0; margin-bottom: 15px; font-size: 14px;">${item.help_text}</p>`;
  }

  // Single choice or single_choice
  if (item.type === 'single' || item.type === 'single_choice') {
    html += `<div class="options">`;
    item.options.forEach(opt => {
      const checked = answers[qId] === opt.value ? 'selected' : '';
      html += `
        <div class="option ${checked}" onclick="selectSingleOption('${qId}', '${opt.value}', this)">
          ${opt.label}
        </div>`;
    });
    html += `</div>`;
  }

  // Multiselect
  else if (item.type === 'multiselect') {
    html += `<div class="options">`;
    const currentAnswers = answers[qId] || [];
    item.options.forEach(opt => {
      const checked = currentAnswers.includes(opt.value) ? 'selected' : '';
      html += `
        <div class="option ${checked}" onclick="toggleMultiOption('${qId}', '${opt.value}', this)">
          ${opt.label}
        </div>`;
    });
    html += `</div>`;
  }

  // Text input
  else if (item.type === 'text') {
    const currentValue = answers[qId] || '';
    html += `<input type="text" class="input-text" 
      value="${currentValue}" 
      oninput="window.handleTextInput('${qId}', this.value)" 
      placeholder="${item.placeholder || 'Escribe tu respuesta...'}">`;
  }

  // Slider
  else if (item.type === 'slider') {
    const val = answers[qId] || item.default || item.min || 5;
    html += `<div class="slider-container" style="margin: 20px 0;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="color: #b0b0b0; min-width: 20px;">${item.min || 0}</span>
        <input type="range" min="${item.min || 1}" max="${item.max || 10}" 
          value="${val}" class="slider" style="flex: 1;"
          oninput="answers['${qId}'] = parseInt(this.value); this.nextElementSibling.nextElementSibling.textContent = this.value; window.updateNavigation();">
        <span style="color: #b0b0b0; min-width: 20px;">${item.max || 10}</span>
        <span style="color: #00D4AA; font-weight: bold; min-width: 30px;">${val}</span>
      </div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

// ==================== WAITLIST HANDLING ====================

async function handleWaitlistSubmission(formData) {
  try {
    console.log('📝 Submitting to waitlist:', formData);
    
    const response = await fetch(WAITLIST_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        timestamp: new Date().toISOString(),
        source: formData.source || 'landing_page'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Waitlist submission successful');
    
    // Show success message
    alert('¡Gracias! Te has unido exitosamente a la lista de espera. Te notificaremos cuando estemos listos para el lanzamiento.');
    
    return true;
  } catch (error) {
    console.error('❌ Waitlist submission failed:', error);
    alert('Hubo un error al unirte a la lista de espera. Por favor intenta de nuevo.');
    return false;
  }
}

function setupWaitlistForms() {
  // Main waitlist form on landing page
  const mainWaitlistForm = document.getElementById('main-waitlist-form');
  if (mainWaitlistForm) {
    mainWaitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('main-waitlist-name').value.trim();
      const email = document.getElementById('main-waitlist-email').value.trim();
      
      if (!name || !email) {
        alert('Por favor completa todos los campos.');
        return;
      }
      
      const success = await handleWaitlistSubmission({
        name,
        email,
        source: 'landing_page'
      });
      
      if (success) {
        mainWaitlistForm.reset();
      }
    });
  }

  // Results page waitlist form
  const resultsWaitlistForm = document.getElementById('results-waitlist-form');
  if (resultsWaitlistForm) {
    resultsWaitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('results-waitlist-name').value.trim();
      const email = document.getElementById('results-waitlist-email').value.trim();
      
      if (!name || !email) {
        alert('Por favor completa todos los campos.');
        return;
      }
      
      const success = await handleWaitlistSubmission({
        name,
        email,
        source: 'results_page'
      });
      
      if (success) {
        resultsWaitlistForm.reset();
      }
    });
  }

  // Standalone waitlist page form
  const waitlistForm = document.getElementById('waitlist-form');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('waitlist-name').value.trim();
      const email = document.getElementById('waitlist-email').value.trim();
      
      if (!name || !email) {
        alert('Por favor completa todos los campos.');
        return;
      }
      
      const success = await handleWaitlistSubmission({
        name,
        email,
        source: 'waitlist_page'
      });
      
      if (success) {
        waitlistForm.reset();
        // Optionally redirect to landing page
        showPage('landing-page');
      }
    });
  }
}

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

// ==================== WAITLIST SCROLL ====================

window.scrollToWaitlist = function () {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    console.error('⚠️ Could not find waitlist-section');
  }
};

// ==================== SURVEY START ====================

window.startSurvey = function () {
  if (!surveyQuestions || surveyQuestions.length === 0) {
    alert('Las preguntas no se han cargado correctamente.');
    return;
  }
  
  currentQuestionIndex = 0;
  answers = {};
  showPage('survey-page');
  renderQuestion();
};

// ==================== RENDER QUESTION ====================

function renderQuestion() {
  const qId = questionOrder[currentQuestionIndex];
  const question = getQuestionById(qId);

  if (!question) {
    console.error('⚠️ Question not found:', qId);
    return;
  }

  console.log('📝 Rendering question:', qId, question.type);

  const container = document.getElementById('question-container');
  if (!container) {
    console.error('⚠️ question-container not found in DOM');
    return;
  }

  // Use CSS classes that match your style.css
  let html = `<div class="question">
    <h3>${question.title}</h3>`;

  if (question.help_text) {
    html += `<p style="color: #b0b0b0; margin-bottom: 20px;">${question.help_text}</p>`;
  }

  html += `<div class="options">`;

  // Single choice (your JSON uses "single")
  if (question.type === 'single') {
    question.options.forEach(opt => {
      const checked = answers[qId] === opt.value ? 'selected' : '';
      html += `
        <div class="option ${checked}" onclick="selectSingleOption('${qId}', '${opt.value}', this)">
          <input type="radio" name="${qId}" value="${opt.value}" ${checked ? 'checked' : ''} style="display: none;">
          ${opt.label}
        </div>`;
    });
  }

  // Multiselect
  else if (question.type === 'multiselect') {
    const currentAnswers = answers[qId] || [];
    question.options.forEach(opt => {
      const checked = currentAnswers.includes(opt.value) ? 'selected' : '';
      html += `
        <div class="option ${checked}" onclick="toggleMultiOption('${qId}', '${opt.value}', this)">
          <input type="checkbox" value="${opt.value}" ${checked ? 'checked' : ''} style="display: none;">
          ${opt.label}
        </div>`;
    });
  }

  // Text input
  else if (question.type === 'text') {
    const currentValue = answers[qId] || '';
    html += `<input type="text" class="input-text" 
      value="${currentValue}" 
      oninput="window.handleTextInput('${qId}', this.value)" 
      placeholder="${question.placeholder || 'Escribe tu respuesta...'}">`;
  }

  // Slider
  else if (question.type === 'slider') {
    const val = answers[qId] || question.default || question.min || 5;
    html += `<div class="slider-container" style="margin: 20px 0;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="color: #b0b0b0; min-width: 20px;">${question.min || 0}</span>
        <input type="range" min="${question.min || 1}" max="${question.max || 10}" 
          value="${val}" class="slider" style="flex: 1;"
          oninput="answers['${qId}'] = parseInt(this.value); this.nextElementSibling.nextElementSibling.textContent = this.value; window.updateNavigation();">
        <span style="color: #b0b0b0; min-width: 20px;">${question.max || 10}</span>
        <span style="color: #00D4AA; font-weight: bold; min-width: 30px;">${val}</span>
      </div>
    </div>`;
  }

  // COMPOUND QUESTIONS - NEW ADDITION (KEEPS YOUR EXISTING STYLING)
  else if (question.type === 'compound' && Array.isArray(question.items)) {
    html += '</div>'; // Close the options div first
    question.items.forEach(item => {
      html += renderCompoundItem(item);
    });
    html += '<div class="options">'; // Reopen for consistency
  }

  html += `</div></div>`;
  container.innerHTML = html;

  updateProgress();
  window.updateNavigation();
}

// ==================== OPTION SELECTION HANDLERS ====================

window.selectSingleOption = function(qId, value, element) {
  // Remove selected class from all options in this question
  const container = element.parentElement;
  container.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
  
  // Add selected class to clicked option
  element.classList.add('selected');
  
  // Update answer
  answers[qId] = value;
  window.updateNavigation();
};

window.toggleMultiOption = function(qId, value, element) {
  if (!Array.isArray(answers[qId])) answers[qId] = [];
  
  if (answers[qId].includes(value)) {
    // Remove from selection
    answers[qId] = answers[qId].filter(v => v !== value);
    element.classList.remove('selected');
  } else {
    // Add to selection
    answers[qId].push(value);
    element.classList.add('selected');
  }
  
  window.updateNavigation();
};

window.handleTextInput = function(qId, value) {
  answers[qId] = value;
  window.updateNavigation();
};

// ==================== SEND RESPONSES ====================

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

    console.log('✅ Survey responses sent to webhook.');
  } catch (err) {
    console.error('❌ Failed to send survey:', err);
  }
}

// ==================== LOAD SURVEY DATA ====================

document.addEventListener('DOMContentLoaded', async function () {
  showPage('landing-page');
  const quizBtn = document.getElementById('take-quiz-btn');
  if (quizBtn) quizBtn.disabled = true;

  // Set up waitlist forms
  setupWaitlistForms();

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

    // Apply scoring (if you have decision mapping)
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
    window.finishSurvey();
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

// ==================== UPDATE NAVIGATION ====================

window.updateNavigation = function() {
  const qId = questionOrder[currentQuestionIndex];
  const question = getQuestionById(qId);
  let hasAnswer = false;

  if (!question) return;

  // ADD COMPOUND VALIDATION
  if (question.type === 'compound') {
    let allRequired = true;
    if (question.items && Array.isArray(question.items)) {
      question.items.forEach(item => {
        if (item.required) {
          const itemAnswer = answers[item.id];
          if (!itemAnswer || (typeof itemAnswer === 'string' && itemAnswer.trim() === '')) {
            allRequired = false;
          }
          if (item.type === 'multiselect' && Array.isArray(itemAnswer) && itemAnswer.length === 0) {
            allRequired = false;
          }
        }
      });
    }
    hasAnswer = allRequired;
  }
  else if (question.type === 'multiselect') {
    const selected = Array.isArray(answers[qId]) ? answers[qId] : [];
    const minSelected = question.validation?.minselected ?? 1;
    hasAnswer = minSelected === 0 || selected.length >= minSelected;

  } else if (question.type === 'single') {
    hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';

  } else if (question.type === 'slider') {
    hasAnswer = typeof answers[qId] === 'number';
    
  } else if (question.type === 'text') {
    const value = answers[qId];
    if (question.required) {
      hasAnswer = value !== undefined && value !== null && value.trim() !== '';
    } else {
      hasAnswer = true; // Text input is optional by default
    }

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
    if (!answer || !question.options) return;

    const answerArray = Array.isArray(answer) ? answer : [answer];
    answerArray.forEach(value => {
      const option = question.options.find(opt => opt.value === value);
      if (option && option.scores) {
        Object.entries(option.scores).forEach(([key, val]) => {
          scores[key] += val;
        });
      }
    });
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
  if (!resultsTemplate) {
    console.error('Results template not loaded');
    return;
  }

  const label = resultsTemplate.labels?.[patternKey] || patternKey;
  let html = '';

  // HEADER
  html += `<h2>${resultsTemplate.element?.by_pattern?.[patternKey]?.[0] || label}</h2>`;
  
  // SUMMARY
  const summary = resultsTemplate.summary?.single
    ? resultsTemplate.summary.single.replace('{{label_top}}', label)
    : `Tu tipo de ciclo: ${label}`;
  html += `<h3>${summary}</h3>`;

  // ELEMENT EXPLAINER
  if (resultsTemplate.element_explainer?.by_pattern?.[patternKey]) {
    html += `<div class="pattern-description">${resultsTemplate.element_explainer.by_pattern[patternKey][0]}</div>`;
  }

  // PATTERN CARD - Characteristics
  if (resultsTemplate.pattern_card?.single?.[patternKey]) {
    const pattern = resultsTemplate.pattern_card.single[patternKey];
    html += `
      <div class="pattern-characteristics">
        <h4>Características principales:</h4>
        <ul>
    `;
    if (pattern.characteristics) {
      pattern.characteristics.forEach(char => {
        html += `<li>${char}</li>`;
      });
    }
    html += `</ul></div>`;
  }

  // WHY CLUSTER
  if (resultsTemplate.why_cluster?.by_pattern?.[patternKey]) {
    html += `
      <div class="pattern-explanation">
        <h4>¿Por qué se agrupan tus síntomas?</h4>
        <p>${resultsTemplate.why_cluster.by_pattern[patternKey][0]}</p>
      </div>
    `;
  }

  // PHASE TIPS SECTION
  if (resultsTemplate.phase?.generic) {
    html += `
      <div class="tips-phase-section">
        <h3 class="tips-main-title">Tips por fase del ciclo</h3>
        <div class="phases-container">
    `;

    // Get phases from common.phase_labels
    const phaseLabels = resultsTemplate.common?.phase_labels || {
      'antes': 'Antes del periodo (PMS)',
      'durante': 'Durante', 
      'despues': 'Después',
      'entre': 'Entre periodos'
    };

    Object.keys(phaseLabels).forEach(phaseKey => {
      const phaseData = resultsTemplate.phase.generic[phaseKey];
      if (phaseData) {
        html += `
          <div class="phase-block">
            <div class="phase-header">
              <h4 class="phase-title">${phaseLabels[phaseKey]}</h4>
              <p class="phase-description">${phaseData.que_significa || ''}</p>
            </div>
            <div class="phase-content">
        `;

        // Add subsections (alimentos, haz, evita)
        if (phaseData.alimentos) {
          html += `
            <div class="phase-subsection">
              <div class="subsection-label">Alimentos:</div>
              <ul class="subsection-list">
          `;
          phaseData.alimentos.forEach(item => {
            html += `<li>${item}</li>`;
          });
          html += `</ul></div>`;
        }

        if (phaseData.haz) {
          html += `
            <div class="phase-subsection">
              <div class="subsection-label">Haz:</div>
              <ul class="subsection-list">
          `;
          phaseData.haz.forEach(item => {
            html += `<li>${item}</li>`;
          });
          html += `</ul></div>`;
        }

        if (phaseData.evita) {
          html += `
            <div class="phase-subsection">
              <div class="subsection-label">Evita:</div>
              <ul class="subsection-list">
          `;
          phaseData.evita.forEach(item => {
            html += `<li>${item}</li>`;
          });
          html += `</ul></div>`;
        }

        html += `</div></div>`; // Close phase-content and phase-block
      }
    });

    html += `</div></div>`; // Close phases-container and tips-phase-section
  }

  // DISCLAIMER
  html += `
    <div class="disclaimer">
      <strong>Nota importante:</strong>
      ${resultsTemplate.meta?.disclaimer || 'Esta evaluación es orientativa y no sustituye consejo médico.'}
    </div>
  `;

  document.getElementById('results-card').innerHTML = html;
  showPage('results-page');
}

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

console.log("✅ app.js loaded and ready - USING YOUR CSS CLASSES + COMPOUND SUPPORT!");