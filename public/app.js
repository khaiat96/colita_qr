// Configuration  
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwiYXBwIjoiZGVtbyIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let questionOrder = [];
let surveyQuestions = [];
let answers = {};
let currentQuestionIndex = 0;
let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let isProMode = false;

// === ADDED: flag for survey loaded ===
window.surveyLoaded = false;

console.log('🚀 APP.JS LOADED - VERSION 2.0 - CACHE BUSTED');

// ==================== WAITLIST FUNCTIONS ====================

window.scrollToWaitlist = function() {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

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
        await supabase.from('waitlist').insert([{ name, email, source: 'landing_page' }]);
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
        await supabase.from('waitlist').insert([{ name, email, source: 'results_page' }]);
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

// ==================== SURVEY RENDERING ====================

// Improved renderQuestion function for robust handling of all question types (single_choice, multiselect, slider, compound, grouped)
// Also guards against undefined question objects and missing options arrays.

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
                <div class="${optionClass}${selected ? " selected":""}" data-value="${option.value}" onclick="selectOption('${qId}', '${option.value}', ${isMultiSelect})">
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
        // Compound: render each item as its own mini-question
        optionsHtml = `<div class="compound-question">
            <div class="sub-questions">
                ${question.items.map(item => {
                    if ((item.type === 'multiselect' || item.type === 'single_choice') && Array.isArray(item.options)) {
                        return `<div class="sub-question">
                            <h4>${item.title}</h4>
                            <div class="sub-options">
                                ${item.options.map(opt => {
                                    // For compound, use selectOption with item.id as qId
                                    const isMultiSelect = item.type === 'multiselect';
                                    const selected = isMultiSelect
                                        ? (answers[item.id] && answers[item.id].includes(opt.value))
                                        : answers[item.id] === opt.value;
                                    return `
                                        <div class="sub-option${selected ? " selected":""}" data-value="${opt.value}" onclick="selectOption('${item.id}', '${opt.value}', ${isMultiSelect})">
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
        // Grouped: render each grouped question (like compound, but may have different structure)
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
                                        <div class="group-option${selected ? " selected":""}" data-value="${opt.value}" onclick="selectOption('${group.id}', '${opt.value}', ${isMultiSelect})">
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
        // Fallback for unknown question type or missing options
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

// Updated selectOption function
window.selectOption = function(qId, value, isMultiSelect) {
  // For debugging:
  console.log("Option clicked:", { qId, value, isMultiSelect });
  const question = getQuestionById(qId);
  if (!question) return;

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
    document.querySelectorAll(`[data-value="${value}"]`).forEach(elem => {
      if (elem.dataset.value === value) {
        elem.classList.toggle('selected');
      }
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll(`[data-value]`).forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelectorAll(`[data-value="${value}"]`).forEach(option => {
      option.classList.add('selected');
    });
  }

  updateNavigation();
};

// Updated selectSlider for compound/grouped items:
window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    updateNavigation();
};

// Updated selectOption function
window.selectOption = function(qId, value, isMultiSelect) {
  // For debugging:
  console.log("Option clicked:", { qId, value, isMultiSelect });
  const question = getQuestionById(qId);
  if (!question) return;

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
    document.querySelectorAll(`[data-value="${value}"]`).forEach(elem => {
      if (elem.dataset.value === value) {
        elem.classList.toggle('selected');
      }
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll(`[data-value]`).forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelectorAll(`[data-value="${value}"]`).forEach(option => {
      option.classList.add('selected');
    });
  }

  updateNavigation();
};

// Updated selectSlider for compound/grouped items:
window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    updateNavigation();
};

// Also update selectOption to allow an optional qId override for compound/grouped items:
window.selectOption = function(value, isMultiSelect, overrideQId) {
    const qId = overrideQId || questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);

    if (isMultiSelect) {
        if (!answers[qId]) {
            answers[qId] = [];
        }
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

        document.querySelectorAll(`[data-value="${value}"]`).forEach(option => {
            option.classList.toggle('selected');
        });
    } else {
        answers[qId] = value;
        document.querySelectorAll(`[data-value]`).forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-value="${value}"]`).classList.add('selected');
    }

    updateNavigation();
};

// Also update selectSlider for compound/grouped items:
window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    updateNavigation();
};

// In nextQuestion()
function nextQuestion() {
  const qId = questionOrder[currentQuestionIndex];
  const question = getQuestionById(qId);

  // Only validate if 'required' !== false
  if (question.required !== false) {
    if (question.type === 'multiselect' && answers[qId]?.length === 0) {
      alert('Por favor selecciona al menos una opción.');
      return;
    }
    if ((question.type === 'single_choice' || question.type === 'singlechoice') && !answers[qId]) {
      alert('Por favor selecciona una opción.');
      return;
    }
  }

  const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
  if (nextIdx > -1) {
    currentQuestionIndex = nextIdx;
    renderQuestion();
  } else {
    finishSurvey();
  }
}

// New selectOption function
window.selectOption = function(qId, value, isMultiSelect) {
  const question = getQuestionById(qId);
  if (!question) return;

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
    document.querySelectorAll(`[data-value="${value}"]`).forEach(elem => {
      if (elem.dataset.value === value) {
        elem.classList.toggle('selected');
      }
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector(`[data-value="${value}"]`).classList.add('selected');
  }

  updateNavigation();
};

window.selectSlider = function(qId, value) {
  answers[qId] = Number(value);
  document.getElementById('slider-value').textContent = value;
  updateNavigation();
};

function updateProgress() {
  let visibleCount = 0;
  for (let i = 0; i <= currentQuestionIndex; i++) {
    const q = getQuestionById(questionOrder[i]);
    if (isQuestionVisible(q, answers)) visibleCount++;
  }
  const totalVisible = questionOrder.filter(qId => isQuestionVisible(getQuestionById(qId), answers)).length;
  const progress = ((visibleCount) / totalVisible) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;
  document.getElementById('progress-text').textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// ✅ CRITICAL FIX: Updated navigation logic
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
                <div class="${optionClass}${selected ? " selected":""}" data-value="${option.value}" onclick="selectOption('${qId}', '${option.value}', ${isMultiSelect})">
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
        // Compound: render each item as its own mini-question
        optionsHtml = `<div class="compound-question">
            <div class="sub-questions">
                ${question.items.map(item => {
                    if ((item.type === 'multiselect' || item.type === 'single_choice') && Array.isArray(item.options)) {
                        return `<div class="sub-question">
                            <h4>${item.title}</h4>
                            <div class="sub-options">
                                ${item.options.map(opt => {
                                    // For compound, use selectOption with item.id as qId
                                    const isMultiSelect = item.type === 'multiselect';
                                    const selected = isMultiSelect
                                        ? (answers[item.id] && answers[item.id].includes(opt.value))
                                        : answers[item.id] === opt.value;
                                    return `
                                        <div class="sub-option${selected ? " selected":""}" data-value="${opt.value}" onclick="selectOption('${item.id}', '${opt.value}', ${isMultiSelect})">
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
        // Grouped: render each grouped question (like compound, but may have different structure)
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
                                        <div class="group-option${selected ? " selected":""}" data-value="${opt.value}" onclick="selectOption('${group.id}', '${opt.value}', ${isMultiSelect})">
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
        // Fallback for unknown question type or missing options
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

// Updated selectOption function
window.selectOption = function(qId, value, isMultiSelect) {
  // For debugging:
  console.log("Option clicked:", { qId, value, isMultiSelect });
  const question = getQuestionById(qId);
  if (!question) return;

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
    document.querySelectorAll(`[data-value="${value}"]`).forEach(elem => {
      if (elem.dataset.value === value) {
        elem.classList.toggle('selected');
      }
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll(`[data-value]`).forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelectorAll(`[data-value="${value}"]`).forEach(option => {
      option.classList.add('selected');
    });
  }

  updateNavigation();
};

// Updated selectSlider for compound/grouped items:
window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    updateNavigation();
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
  ['tension', 'calor', 'humedad', 'sequedad'].forEach(pattern => {
    if (scores[pattern] > maxScore) {
      maxScore = scores[pattern];
      dominantPattern = pattern;
    }
  });

  return dominantPattern;
}

async function finishSurvey() {
  document.getElementById('loading-modal').classList.add('show');
  const dominantPattern = calculateResults();

  try {
    await supabase
      .from('survey_responses')
      .insert([{
        session_id: sessionId,
        answers: answers,
        result_pattern: dominantPattern,
        is_pro_mode: isProMode,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Error saving to Supabase:', error);
  }

  setTimeout(() => {
    document.getElementById('loading-modal').classList.remove('show');
    showResults(dominantPattern);
  }, 2000);
}

function showResults(patternKey) {
  const elementPatterns = {
    tension: {
      element: 'Viento/Aire 🌬️',
      pattern: 'Exceso de Viento con espasmo uterino y nervioso',
      characteristics: [
        'Dolor cólico o punzante (espasmos)',
        'Síntomas irregulares/cambiantes',
        'Ansiedad, hipervigilancia',
        'Sensibilidad al estrés',
        'Respiración entrecortada con dolor'
      ]
    },
    calor: {
      element: 'Fuego 🔥',
      pattern: 'Exceso de Fuego: calor interno, sangrado abundante, irritabilidad',
      characteristics: [
        'Flujo rojo brillante/abundante',
        'Sensación de calor/sed/enrojecimiento',
        'Irritabilidad premenstrual',
        'Sueño ligero',
        'Digestión rápida/acidez'
      ]
    },
    humedad: {
      element: 'Tierra ⛰️',
      pattern: 'Exceso de Tierra: pesadez, retención, coágulos',
      characteristics: [
        'Hinchazón/pesadez',
        'Coágulos o flujo espeso',
        'Digestión lenta de grasas',
        'Letargo postcomida',
        'Mejoría con movimiento suave'
      ]
    },
    sequedad: {
      element: 'Agua 💧',
      pattern: 'Deficiencia de Agua: flujo escaso, piel/mucosas secas, fatiga',
      characteristics: [
        'Sangrado muy escaso o ausente',
        'Sed y sequedad',
        'Cansancio, sueño no reparador',
        'Rigidez articular',
        'Irritabilidad por agotamiento'
      ]
    }
  };
  const pattern = elementPatterns[patternKey];

  const resultsCard = document.getElementById('results-card');
  const characteristicsHtml = pattern.characteristics.map(char => 
    `<li>${char}</li>`
  ).join('');
  const proModeText = isProMode ? '<div class="pro-mode-indicator">✨ Resultados PRO - Análisis Avanzado</div>' : '';

  resultsCard.innerHTML = `
    ${proModeText}
    <h2>${pattern.element}</h2>
    <h3>${pattern.pattern}</h3>
    <ul class="characteristics">
      ${characteristicsHtml}
    </ul>
    <div class="disclaimer">
      <strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional. Consulta siempre con un profesional de la salud para cualquier problema menstrual.
    </div>
  `;

  showPage('results-page');
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');
}

// === UPDATED: startSurvey disables quiz button until loaded and logs state ===
window.startSurvey = function() {
  console.log('🚦 startSurvey called');
  if (!window.surveyLoaded || !surveyQuestions.length || !questionOrder.length) {
    alert('Las preguntas del quiz no se han cargado aún. Intenta de nuevo en unos segundos.');
    console.log('❌ Survey not loaded:', {
      surveyLoaded: window.surveyLoaded,
      surveyQuestions: surveyQuestions.length,
      questionOrder: questionOrder.length
    });
    return;
  }
  showPage('survey-page');
  currentQuestionIndex = 0;
  answers = {};
  console.log('✅ Survey started, rendering first question');
  renderQuestion();
};

// === UPDATED: load survey questions, enable quiz button when ready ===
document.addEventListener('DOMContentLoaded', async function() {
  showPage('landing-page');
  isProMode = false;

  // Disable the quiz button until loaded
  const quizBtn = document.getElementById('take-quiz-btn');
  if (quizBtn) quizBtn.disabled = true;

  try {
    console.log('🔍 Loading survey questions...');
    const resp = await fetch('survey_questions-combined.json');
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    const surveyData = await resp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;

    // Normalize type values for singlechoice
    surveyQuestions.forEach(q => {
      if (q.type === 'singlechoice') {
        q.type = 'single_choice';
      }
    });

    window.surveyLoaded = true;
    console.log('✅ Loaded', surveyQuestions.length, 'questions');

    // Enable quiz button now
    if (quizBtn) quizBtn.disabled = false;

    // Debug P2
    const p2 = surveyQuestions.find(q => q.id === 'P2');
    if (p2) {
      console.log('🎯 P2 Config:', {
        id: p2.id,
        type: p2.type,
        validation: p2.validation,
        optionsCount: p2.options.length
      });
    }
  } catch (err) {
    console.error('❌ Error:', err);
    alert(`No se pudieron cargar las preguntas del quiz: ${err.message}`);
    // Quiz can't be taken
    if (quizBtn) quizBtn.disabled = true;
  }
});
