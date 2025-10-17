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

console.log('🚀 APP.JS LOADED - VERSION 2.0 - CACHE BUSTED');

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


// --- MERGE MAPPING SCORES INTO SURVEY QUESTIONS ---
    surveyQuestions.forEach(q => {
      // 1. Top-level options
      if (Array.isArray(q.options)) {
        const mappingList = decisionMapping.scoring[q.id]; // ← FIXED: Added .scoring
        if (mappingList) {
          q.options.forEach(opt => {
            const mapping = mappingList.find(m => m.value === opt.value);
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
            const mappingList = decisionMapping.scoring[item.id]; // ← FIXED: Added .scoring
            if (mappingList) {
              item.options.forEach(opt => {
                const mapping = mappingList.find(m => m.value === opt.value);
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
            const mappingList = decisionMapping.scoring[group.id]; // ← FIXED: Added .scoring
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

    // Normalize type values for singlechoice
    surveyQuestions.forEach(q => {
      if (q.type === 'singlechoice') {
        q.type = 'single_choice';
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
  // not_includes, includes_any, not_in, not_includes_any, at_least...
  // (keep your existing blocks here, none of which use question.id)

  // all / any
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

window.finishSurvey = function() {
  // Calculate the results and show them
  const patternKey = calculateResults();
  showResults(patternKey);
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
                <div class="${optionClass}${selected ? " selected":""}" data-value="${option.value}" data-qid="${qId}" onclick="selectOption('${qId}', '${option.value}', ${isMultiSelect})">
                    ${option.label}
                </div>
            `;
        });
    } else if (question.type === 'slider') {
        optionsHtml = `
            <input type="range" min="${question.min}" max="${question.max}" step="${question.step}" 
                value="${answers[question.id] || question.min}" id="slider-input"
                oninput="selectSlider('${question.id}', this.value)">
            <span id="slider-value">${answers[question.id] || question.min}</span>
        `;
    } else if (question.type === 'compound' && Array.isArray(question.items)) {
        optionsHtml = `<div class="compound-question">
            <div class="sub-questions">
                ${question.items.map(item => {
                    if ((item.type === 'multiselect' || item.type === 'single_choice') && Array.isArray(item.options)) {
                        return `<div class="sub-question">
                            <h4>${item.title}</h4>
                            <div class="sub-options">
                                ${item.options.map(opt => {
                                    const isMultiSelect = item.type === 'multiselect';
                                    const selected = isMultiSelect
                                        ? (answers[item.id] && answers[item.id].includes(opt.value))
                                        : answers[item.id] === opt.value;
                                    return `
                                        <div class="sub-option${selected ? " selected":""}" data-value="${opt.value}" data-qid="${item.id}" onclick="selectOption('${item.id}', '${opt.value}', ${isMultiSelect})">
                                            ${opt.label}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>`;
                    } else if (item.type === 'slider') {
                        return `<div class="sub-question">
                            <h4>${item.title}</h4>
                            <div class="slider-container">
                                <input type="range" min="${item.min}" max="${item.max}" step="${item.step}" 
                                    value="${answers[item.id] || item.min}" id="slider-input-${item.id}"
                                    oninput="selectSlider('${item.id}', this.value)">
                                <span id="slider-value-${item.id}">${answers[item.id] || item.min}</span>
                            </div>
                        </div>`;
                    } else {
                        return `<div class="sub-question">${item.title} (Tipo no soportado)</div>`;
                    }
                }).join('')}
            </div>
        </div>`;
    } else if (question.type === 'grouped' && Array.isArray(question.questions)) {
        optionsHtml = `<div class="grouped-question">
            <div class="question-groups">
                ${question.questions.map(group => {
                    if ((group.type === 'multiselect' || group.type === 'single_choice') && Array.isArray(group.options)) {
                        return `<div class="question-group">
                            <h4>${group.title}</h4>
                            <div class="group-options">
                                ${group.options.map(opt => {
                                    const isMultiSelect = group.type === 'multiselect';
                                    const selected = isMultiSelect
                                        ? (answers[group.id] && answers[group.id].includes(opt.value))
                                        : answers[group.id] === opt.value;
                                    return `
                                        <div class="group-option${selected ? " selected":""}" data-value="${opt.value}" data-qid="${group.id}" onclick="selectOption('${group.id}', '${opt.value}', ${isMultiSelect})">
                                            ${opt.label}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>`;
                    } else if (group.type === 'slider') {
                        return `<div class="question-group">
                            <h4>${group.title}</h4>
                            <div class="slider-container">
                                <input type="range" min="${group.min}" max="${group.max}" step="${group.step}" 
                                    value="${answers[group.id] || group.min}" id="slider-input-${group.id}"
                                    oninput="selectSlider('${group.id}', this.value)">
                                <span id="slider-value-${group.id}">${answers[group.id] || group.min}</span>
                            </div>
                        </div>`;
                    } else {
                        return `<div class="question-group">${group.title} (Tipo no soportado)</div>`;
                    }
                }).join('')}
            </div>
        </div>`;
    } else {
        optionsHtml = `<div>No options for this question type.</div>`;
    }

    surveyContent.innerHTML = `
        <div class="question">
            <h3>${question.title}</h3>
            ${question.help_text ? `<div class="help-text">${question.help_text}</div>` : ''}
            <div class="options">
                ${optionsHtml}
            </div>
        </div>
        <div class="survey-navigation">
            <button class="btn-back" id="back-btn" onclick="previousQuestion()" style="display:none;">← Anterior</button>
            <button class="btn-next" id="next-btn" onclick="nextQuestion()">Siguiente →</button>
        </div>
    `;

    updateProgress();
    updateNavigation();
}

// Updated selectOption function with scoped selection for compound/grouped sub-questions
window.selectOption = function(qId, value, isMultiSelect) {
  console.log("Option clicked:", { qId, value, isMultiSelect });

  // Find the question type for this qId (may be item inside compound/grouped)
  let question = getQuestionById(qId);
  if (!question) {
    for (const q of surveyQuestions) {
      if (q.type === 'compound' && Array.isArray(q.items)) {
        const found = q.items.find(item => item.id === qId);
        if (found) {
          question = found;
          break;
        }
      } else if (q.type === 'grouped' && Array.isArray(q.questions)) {
        const found = q.questions.find(item => item.id === qId);
        if (found) {
          question = found;
          break;
        }
      }
    }
  }
  if (!question) return;

  let optionSelector = `.option[data-qid="${qId}"]`;
  if (document.querySelector(`.sub-option[data-qid="${qId}"]`)) {
    optionSelector = `.sub-option[data-qid="${qId}"]`;
  } else if (document.querySelector(`.group-option[data-qid="${qId}"]`)) {
    optionSelector = `.group-option[data-qid="${qId}"]`;
  }

  if (isMultiSelect) {
    if (!answers[qId]) answers[qId] = [];
    const currentAnswers = answers[qId];
    const index = currentAnswers.indexOf(value);
    if (index > -1) {
      currentAnswers.splice(index, 1);
    } else {
      if (question.validation && question.validation.maxselected && currentAnswers.length >= question.validation.maxselected) {
        currentAnswers.shift();
      }
      currentAnswers.push(value);
    }
    document.querySelectorAll(`${optionSelector}[data-value="${value}"]`).forEach(elem => {
      elem.classList.toggle('selected');
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll(`${optionSelector}`).forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelectorAll(`${optionSelector}[data-value="${value}"]`).forEach(option => {
      option.classList.add('selected');
    });
  }

  console.log("answers state after click:", JSON.stringify(answers));
  window.updateNavigation();
};

window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    console.log("answers state after slider:", JSON.stringify(answers));
    window.updateNavigation();
};

// ==================== NAVIGATION ====================

window.nextQuestion = function() {
  console.log('⏭️ Next clicked from:', questionOrder[currentQuestionIndex]);
  let nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
  if (nextIdx > -1) {
    currentQuestionIndex = nextIdx;
    renderQuestion();
  } else {
    finishSurvey();
  }
};

window.previousQuestion = function() {
  console.log('⏮️ Previous clicked from:', questionOrder[currentQuestionIndex]);
  let prevIdx = getPrevVisibleQuestionIndex(currentQuestionIndex);
  if (prevIdx > -1) {
    currentQuestionIndex = prevIdx;
    renderQuestion();
  }
};

// ==================== RESULTS ====================

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
          Object.keys(option.scores).forEach(key => {
            scores[key] += option.scores[key];
          });
        }
      });
    }
  });

  let maxScore = 0;
  let dominantPattern = 'sequedad';
  ['tension', 'calor', 'frio', 'humedad', 'sequedad'].forEach(pattern => {
    if (scores[pattern] > maxScore) {
      maxScore = scores[pattern];
      dominantPattern = pattern;
    }
  });

  return dominantPattern;
}

// ==================== DETAILED RESULTS RENDERING ====================

// Helper to safely get nested property from template
function getTemplateSection(section, patternKey) {
  if (!resultsTemplate || !resultsTemplate[section]) return null;
  return resultsTemplate[section][patternKey] || resultsTemplate[section]['by_pattern']?.[patternKey] || null;
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

// ENHANCED renderPhaseAdvice function for beautiful phase cards
function renderPhaseAdvice(patternKey) {
  const phaseSections = resultsTemplate?.phase?.generic || {};
  if (!Object.keys(phaseSections).length) return '';
  
  let html = `<div class="tips-phase-section">
    <h4 class="tips-main-title">Tips de cuidado por fase del ciclo</h4>
    <div class="phases-container">`;
  
  Object.keys(phaseSections).forEach(phaseKey => {
    const phase = phaseSections[phaseKey];
    html += `<div class="phase-block">
      <div class="phase-header">
        <h5 class="phase-title">${phase.label}</h5>
        <div class="phase-description">${phase.about}</div>
      </div>
      <div class="phase-content">`;
    
    // Foods section
    if (phase.foods && phase.foods.length > 0) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Alimentos</div>
        <ul class="subsection-list">
          ${phase.foods.map(food => `<li>${food}</li>`).join('')}
        </ul>
      </div>`;
    }
    
    // Do section  
    if (phase.do && phase.do.length > 0) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Haz</div>
        <ul class="subsection-list">
          ${phase.do.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    }
    
    // Avoid section
    if (phase.avoid && phase.avoid.length > 0) {
      html += `<div class="phase-subsection">
        <div class="subsection-label">Evita</div>
        <ul class="subsection-list">
          ${phase.avoid.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    }
    
    html += `</div></div>`; // Close phase-content and phase-block
  });
  
  html += `</div></div>`; // Close phases-container and tips-phase-section
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


// Main function to show results with full template
function showResults(patternKey) {
  // ─────────── Safe fallback for missing labels/summary ───────────
  const label = resultsTemplate?.labels?.[patternKey] || patternKey;
  const summary = resultsTemplate?.summary?.single
    ? resultsTemplate.summary.single.replace('{{label_top}}', label)
    : label;

  // ─────────── Build your results HTML ───────────

  let html = `
    <h2>${resultsTemplate?.element?.by_pattern?.[patternKey] || label}</h2>
    <h3>${summary}</h3>
    ${renderPatternCard(patternKey)}
    <div class="element-explainer">
      ${getTemplateSection('element_explainer', patternKey)?.[0] || ''}
    </div>
    ${renderCareTips(patternKey)}
    ${renderPhaseAdvice(patternKey)}
    <div class="disclaimer">
      <strong>Nota importante:</strong>
      ${resultsTemplate?.meta?.disclaimer ||
        'Esta evaluación es orientativa.'}
    </div>
  `;

  // Inject into the results-card
  document.getElementById('results-card').innerHTML = html;

  // Show email form
  document.getElementById('email-results-form-section').style.display = 'block';

  showPage('results-page');
}

// ==================== EMAIL RESULTS FORM ====================

async function sendFullResultsReport(name, email) {
  // Prepare the "full report" as HTML/text
  // You can customize this to send all template sections, answers, and result summary
  const patternKey = calculateResults();
  const reportHtml = document.getElementById('results-card').innerHTML;

  // Send to webhook (or Supabase, or email API)
  try {
    await fetch(EMAIL_REPORT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        session_id: sessionId,
        answers,
        pattern: patternKey,
        html_report: reportHtml
      }),
    });
    alert('¡Tu reporte completo ha sido enviado a tu correo!');
  } catch (err) {
    alert('Hubo un error al enviar el reporte. Intenta de nuevo.');
    console.error('Error sending report:', err);
  }
}

// Email form handler
document.addEventListener('DOMContentLoaded', function() {
  const emailResultsForm = document.getElementById('email-results-form');
  if (emailResultsForm) {
    emailResultsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('email-results-name').value;
      const email = document.getElementById('email-results-email').value;
      await sendFullResultsReport(name, email);
      emailResultsForm.reset();
    });
  }
});

// ==================== PROGRESS BAR ====================

function updateProgress() {
  let visibleCount = 0;
  for (let i = 0; i <= currentQuestionIndex; i++) {
    const q = getQuestionById(questionOrder[i]);
    if (isQuestionVisible(q, answers)) visibleCount++;
  }
  const totalVisible = questionOrder.filter(qId => isQuestionVisible(getQuestionById(qId), answers)).length;
  const progress = ((visibleCount) / totalVisible) * 100;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// ==================== NAVIGATION LOGIC (CRITICAL) ====================

window.updateNavigation = function() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);
    let hasAnswer = false;

    if (!question) return;

    if (question.type === 'multiselect') {
        const selected = Array.isArray(answers[qId]) ? answers[qId] : [];
        const minSelected = question.validation?.minselected ?? 1;
        hasAnswer = minSelected === 0 || selected.length >= minSelected;
    } else if (question.type === 'single_choice' || question.type === 'singlechoice') {
        hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
    } else if (question.type === 'slider') {
        hasAnswer = typeof answers[qId] === 'number';
    } else if (question.type === 'compound' && Array.isArray(question.items)) {
        hasAnswer = question.items.every(item => {
            if (item.type === 'multiselect') {
                const selected = Array.isArray(answers[item.id]) ? answers[item.id] : [];
                const minSelected = item.validation?.minselected ?? 1;
                return minSelected === 0 || selected.length >= minSelected;
            } else if (item.type === 'single_choice' || item.type === 'singlechoice') {
                return answers[item.id] !== undefined && answers[item.id] !== null && answers[item.id] !== '';
            } else if (item.type === 'slider') {
                return typeof answers[item.id] === 'number';
            } else {
                return true; // If unknown, skip validation
            }
        });
    } else if (question.type === 'grouped' && Array.isArray(question.questions)) {
        hasAnswer = question.questions.every(group => {
            if (group.type === 'multiselect') {
                const selected = Array.isArray(answers[group.id]) ? answers[group.id] : [];
                const minSelected = group.validation?.minselected ?? 1;
                return minSelected === 0 || selected.length >= minSelected;
            } else if (group.type === 'single_choice' || group.type === 'singlechoice') {
                return answers[group.id] !== undefined && answers[group.id] !== null && answers[group.id] !== '';
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
    if (nextBtn) {
        nextBtn.disabled = !hasAnswer;
    }
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = getPrevVisibleQuestionIndex(currentQuestionIndex) !== -1 ? 'block' : 'none';
    }
};