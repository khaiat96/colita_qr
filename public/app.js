// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Debug mode: Enable with window.DEBUG_SURVEY = true or ?debug=1
function isDebug() {
    if (typeof window.DEBUG_SURVEY !== 'undefined') return window.DEBUG_SURVEY;
    return window.location.search.includes('debug=1');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
};

window.startSurvey = function() {
    window.showPage('survey-page');
    window.currentQuestionIndex = 0;
    window.answers = {};
    renderQuestion();
};

window.scrollToWaitlist = function() {
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// Survey Data Loading Functions
async function loadSurveyJSON() {
    const resp = await fetch('survey_questions-combined.json');
    if (!resp.ok) throw new Error("survey_questions-combined.json not found");
    const surveyData = await resp.json();
    window.surveyQuestions = surveyData.questions;
    window.questionOrder = surveyData.question_order;
}

async function loadDecisionMapping() {
    const resp = await fetch('decision_mapping-combined.json');
    if (!resp.ok) throw new Error("decision_mapping-combined.json not found");
    window.decisionMapping = await resp.json();
}

async function loadResultsTemplate() {
    const resp = await fetch('results_template.json');
    if (!resp.ok) throw new Error("results_template.json not found");
    window.resultsTemplate = await resp.json();
}

// Helper: Check visible_if logic (AGGRESSIVE P1 FIX + custom includes_any logic)
function isQuestionVisible(question, answers) {
    if (!question) return false;
    if (question.id === "P0_contraception" || question.id === "P1") return true;

    // AGGRESSIVE: Hide ALL P1_* questions unless P1 = "No tengo sangrado actualmente"
    if (question.id.startsWith("P1_")) {
        const p1Answer = answers["P1"];
        const shouldShow = p1Answer === "No tengo sangrado actualmente";
        if (isDebug()) {
            console.log(`🔍 Aggressive P1_* check for ${question.id}: P1="${p1Answer}" -> ${shouldShow ? 'SHOW' : 'HIDE'}`);
        }
        return shouldShow;
    }

    // Custom conditional for spotting questions
    if (
        (question.id === "P2_spotting_frecuencia" || question.id === "P2_spotting_context" || question.id === "P2_spot_pre_post")
    ) {
        const ans = answers["P2"];
        if (!ans) return false;
        const options = [
            "Manchado entre reglas",
            "Sangrado después de relaciones"
        ];
        if (Array.isArray(ans)) {
            return ans.some(val => options.includes(val));
        }
        return options.includes(ans);
    }

    // Otherwise normal logic
    const cond = question.visible_if;
    if (!cond) return true;

    // equals (strict string match)
    if (cond.question_id && typeof cond.equals !== "undefined") {
        return answers[cond.question_id] === cond.equals;
    }

    // includes (array or single)
    if (cond.question_id && cond.includes) {
        const ans = answers[cond.question_id];
        const inclArr = Array.isArray(cond.includes) ? cond.includes : [cond.includes];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return inclArr.some(val => ansArr.includes(val));
    }

    // includes_any (array)
    if (cond.question_id && cond.includes_any) {
        const ans = answers[cond.question_id];
        const inclAnyArr = Array.isArray(cond.includes_any) ? cond.includes_any : [cond.includes_any];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return inclAnyArr.some(val => ansArr.includes(val));
    }

    // not_includes (single or array)
    if (cond.question_id && cond.not_includes) {
        const ans = answers[cond.question_id];
        const notInclArr = Array.isArray(cond.not_includes) ? cond.not_includes : [cond.not_includes];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInclArr.every(val => !ansArr.includes(val));
    }

    // not_in (array)
    if (cond.question_id && cond.not_in) {
        const ans = answers[cond.question_id];
        const notInArr = Array.isArray(cond.not_in) ? cond.not_in : [cond.not_in];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInArr.every(val => !ansArr.includes(val));
    }

    // not_includes_any (array) 
    if (cond.question_id && cond.not_includes_any) {
        const ans = answers[cond.question_id];
        const notInclArr = Array.isArray(cond.not_includes_any) ? cond.not_includes_any : [cond.not_includes_any];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInclArr.every(val => !ansArr.includes(val));
    }

    // at_least (number comparison)
    if (cond.question_id && typeof cond.at_least !== "undefined") {
        const ans = Number(answers[cond.question_id]) || 0;
        return ans >= cond.at_least;
    }

    // Compound: all (array of conditions)
    if (cond.all && Array.isArray(cond.all)) {
        return cond.all.every(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }

    // Compound: any (array of conditions)
    if (cond.any && Array.isArray(cond.any)) {
        return cond.any.some(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }

    // Default: show
    return true;
}

// Helper for compound: Check if compound item is visible
function isCompoundItemVisible(item, answers) {
    if (!item.visible_if) return true;
    return isQuestionVisible({ ...item, id: item.id, visible_if: item.visible_if }, answers);
}

// Helper for compound: Has answer for a compound item
function compoundItemHasAnswer(item, answers) {
    const val = answers[item.id];
    if (item.type === 'multi_select') {
        if (!val) return false;
        if (!item.validation || !item.validation.min_selected) return true;
        return val.length >= (item.validation.min_selected || 0);
    } else if (item.type === 'slider') {
        return typeof val !== 'undefined';
    } else {
        return !!val;
    }
}

// Helper for compound: All required visible items answered
function compoundAllRequiredAnswered(items, answers) {
    return items
        .filter(item => isCompoundItemVisible(item, answers))
        .every(item => {
            if (item.type === 'multi_select') {
                if (item.validation && item.validation.min_selected === 0) return true;
                return compoundItemHasAnswer(item, answers);
            } else if (item.type === 'slider') {
                return compoundItemHasAnswer(item, answers);
            } else {
                // single_choice, etc.
                return compoundItemHasAnswer(item, answers);
            }
        });
}

// PATCH: Always initialize answers[item.id] as [] for multi_select items in compound
function initCompoundMultiSelectAnswers(items, answers) {
    items.forEach(item => {
        if (item.type === 'multi_select' && !answers[item.id]) {
            answers[item.id] = [];
        }
    });
}

// Helper to get next visible index
function getNextVisibleIndex(fromIndex) {
    let idx = fromIndex + 1;
    while (
        idx < window.questionOrder.length &&
        !isQuestionVisible(
            window.surveyQuestions.find(q => q.id === window.questionOrder[idx]),
            window.answers
        )
    ) {
        idx++;
    }
    return idx;
}

// Helper to get previous visible index
function getPrevVisibleIndex(fromIndex) {
    let idx = fromIndex - 1;
    while (
        idx >= 0 &&
        !isQuestionVisible(
            window.surveyQuestions.find(q => q.id === window.questionOrder[idx]),
            window.answers
        )
    ) {
        idx--;
    }
    return idx;
}

// Main render function (patched for compound support!)
function renderQuestion() {
    const questionOrder = window.questionOrder || [];
    const surveyQuestions = window.surveyQuestions || [];
    const answers = window.answers || {};
    let currentIndex = window.currentQuestionIndex || 0;

    // Find the next visible question (skip if needed)
    while (currentIndex < questionOrder.length) {
        const qId = questionOrder[currentIndex];
        const question = surveyQuestions.find(q => q.id === qId);
        if (isQuestionVisible(question, answers)) break;
        currentIndex++;
    }

    window.currentQuestionIndex = currentIndex;

    if (currentIndex >= questionOrder.length) {
        // Survey completed - calculate pattern and save
        document.getElementById('survey-content').innerHTML = `
            <div class="completion-message">
                <h3>🎉 ¡Encuesta completada!</h3>
                <p>Calculando tu patrón menstrual...</p>
                <div id="save-status">Procesando...</div>
                <div id="pattern-result" style="margin-top: 20px; display: none;"></div>
            </div>
        `;

        // Calculate and save results
        submitCompleteSurveyWithResults(answers).then(result => {
            const statusDiv = document.getElementById('save-status');
            const patternDiv = document.getElementById('pattern-result');

            if (result.success) {
                statusDiv.innerHTML = '✅ Respuestas guardadas correctamente';
                patternDiv.innerHTML = `
                    <h4>Tu Patrón: ${result.pattern.period_pattern}</h4>
                    <p>Confianza: ${result.pattern.pattern_confidence}</p>
                    ${result.pattern.is_mixed_pattern ? '<p>🔄 Patrón mixto detectado</p>' : ''}
                `;
                patternDiv.style.display = 'block';
            } else {
                statusDiv.innerHTML = '⚠️ Error guardando respuestas: ' + result.error;
            }
        });

        return;
    }

    const qId = questionOrder[currentIndex];
    const question = surveyQuestions.find(q => q.id === qId);

    if (!question) {
        document.getElementById('survey-content').innerHTML = `<p>Error: Question ${qId} not found</p>`;
        return;
    }

    let html = '';

    // Progress indicator
    const totalQuestions = questionOrder.length;
    const progressPercent = Math.round((currentIndex / totalQuestions) * 100);
    html += `
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        <div class="progress-text">${currentIndex + 1} de ${totalQuestions}</div>
    `;

    // Question title
    html += `<h3 class="question-title">${question.title}</h3>`;

    if (question.help_text) {
        html += `<p class="question-description">${question.help_text}</p>`;
    }

    // PATCH: Compound support
    if (question.type === 'compound') {
        // Support "items" property (new format), fallback to "questions" property (old format)
        const items = question.items || question.questions || [];
        initCompoundMultiSelectAnswers(items, answers);

        html += `<div class="compound-question">`;
        items.forEach(item => {
            if (!isCompoundItemVisible(item, answers)) return;
            html += `<div class="sub-question">`;
            html += `<h4>${item.title}</h4>`;
            if (item.help_text) {
                html += `<div class="sub-help">${item.help_text}</div>`;
            }
            if (item.type === 'slider') {
                const sliderValue = typeof answers[item.id] !== 'undefined' ? answers[item.id] : item.min;
                html += `
                    <div class="slider-container">
                        <div class="slider-labels">
                            <span>${item.tick_labels ? item.tick_labels[item.min] : item.min}</span>
                            <span>${item.tick_labels ? item.tick_labels[item.max] : item.max}</span>
                        </div>
                        <input type="range" min="${item.min}" max="${item.max}" step="${item.step || 1}" 
                               value="${sliderValue}" id="slider-input-${item.id}"
                               oninput="document.getElementById('slider-value-${item.id}').innerText = this.value; window.answers['${item.id}'] = Number(this.value)">
                        <div class="slider-value">
                            Valor: <span id="slider-value-${item.id}">${sliderValue}</span>
                        </div>
                    </div>
                `;
            } else if (item.type === 'single_choice') {
                html += `<div class="options-container">`;
                item.options.forEach(option => {
                    const isSelected = answers[item.id] === option.value;
                    html += `
                        <div class="option ${isSelected ? 'selected' : ''}" 
                             onclick="selectCompoundOption('${item.id}', '${option.value}')">
                            <div class="option-indicator"></div>
                            <span class="option-text">${option.label}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            } else if (item.type === 'multi_select') {
                html += `<div class="options-container">`;
                item.options.forEach(option => {
                    const isSelected = answers[item.id] && answers[item.id].includes(option.value);
                    html += `
                        <div class="option ${isSelected ? 'selected' : ''}" 
                             onclick="selectCompoundMultiOption('${item.id}', '${option.value}')">
                            <div class="option-indicator"></div>
                            <span class="option-text">${option.label}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    }
    // Non-compound question logic (unchanged, see previous code for single_choice, multi_select, slider)

    else if (question.type === 'single_choice') {
        html += `<div class="options-container">`;
        question.options.forEach(option => {
            const isSelected = answers[qId] === option.value;
            html += `
                <div class="option ${isSelected ? 'selected' : ''}" 
                     onclick="selectOption('${option.value}', false)">
                    <div class="option-indicator"></div>
                    <span class="option-text">${option.label}</span>
                </div>
            `;
        });
        html += `</div>`;
    } else if (question.type === 'multi_select') {
        if (!answers[qId]) answers[qId] = [];
        html += `<div class="options-container">`;
        question.options.forEach(option => {
            const isSelected = answers[qId] && answers[qId].includes(option.value);
            html += `
                <div class="option ${isSelected ? 'selected' : ''}" 
                     onclick="selectOption('${option.value}', true)">
                    <div class="option-indicator"></div>
                    <span class="option-text">${option.label}</span>
                </div>
            `;
        });
        html += `</div>`;
    } else if (question.type === 'slider') {
        const sliderValue = answers[question.id] !== undefined ? answers[question.id] : question.min;
        html += `
            <div class="slider-container">
                <div class="slider-labels">
                    <span>${question.min_label || question.min}</span>
                    <span>${question.max_label || question.max}</span>
                </div>
                <input type="range" min="${question.min}" max="${question.max}" step="${question.step || 1}" 
                       value="${sliderValue}" id="slider-input"
                       oninput="document.getElementById('slider-value').innerText = this.value; window.answers['${question.id}'] = Number(this.value)">
                <div class="slider-value">
                    Valor: <span id="slider-value">${sliderValue}</span>
                </div>
            </div>
        `;
    }

    // Navigation buttons
    html += `<div class="navigation-buttons">`;

    // Back button
    const prevIndex = getPrevVisibleIndex(currentIndex);
    if (prevIndex >= 0) {
        html += `<button class="btn-secondary" onclick="goToPreviousQuestion()">← Anterior</button>`;
    }

    // Next button logic ("compound" support!)
    let hasAnswer;
    if (question.type === 'compound') {
        const items = question.items || question.questions || [];
        hasAnswer = compoundAllRequiredAnswered(items, answers);
    } else {
        hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
        // Always allow next for optional multi_select questions
        if (
            question.type === "multi_select" &&
            question.validation &&
            question.validation.min_selected === 0
        ) {
            hasAnswer = true;
        }
    }
    if (hasAnswer || question.type === 'slider') {
        html += `<button class="btn-primary" onclick="goToNextQuestion()">Siguiente →</button>`;
    }

    html += `</div>`;

    document.getElementById('survey-content').innerHTML = html;

    if (isDebug()) {
        console.log("[renderQuestion] qId:", qId, "type:", question.type, "hasAnswer:", hasAnswer, "answers[qId]:", answers[qId], "currentIndex:", currentIndex, "nextVisibleIndex:", getNextVisibleIndex(currentIndex));
    }
}

// Selection functions
window.selectOption = function(value, isMultiSelect) {
    const currentIndex = window.currentQuestionIndex || 0;
    const questionOrder = window.questionOrder || [];
    const surveyQuestions = window.surveyQuestions || [];
    const qId = questionOrder[currentIndex];
    const question = surveyQuestions.find(q => q.id === qId);

    if (!question) return;

    if (isMultiSelect) {
        if (!window.answers[qId]) window.answers[qId] = [];
        const arr = window.answers[qId];
        if (arr.includes(value)) {
            window.answers[qId] = arr.filter(v => v !== value);
        } else {
            window.answers[qId].push(value);
        }
    } else {
        window.answers[qId] = value;
    }

    if (isDebug()) console.log(`selectOption: Saved answer for ${qId}:`, window.answers[qId]);

    // Move to next visible question automatically for single choice
    if (!isMultiSelect) {
        window.currentQuestionIndex = getNextVisibleIndex(currentIndex);
        renderQuestion();
    } else {
        // Just re-render to update selection state for multi-select
        renderQuestion();
    }
};

window.selectCompoundOption = function(subQuestionId, value) {
    window.answers[subQuestionId] = value;
    if (isDebug()) console.log(`selectCompoundOption: Saved answer for ${subQuestionId}:`, value);
    renderQuestion();
};

window.selectCompoundMultiOption = function(subQuestionId, value) {
    if (!window.answers[subQuestionId]) window.answers[subQuestionId] = [];
    const arr = window.answers[subQuestionId];
    if (arr.includes(value)) {
        window.answers[subQuestionId] = arr.filter(v => v !== value);
    } else {
        window.answers[subQuestionId].push(value);
    }
    if (isDebug()) console.log(`selectCompoundMultiOption: Saved answer for ${subQuestionId}:`, window.answers[subQuestionId]);
    renderQuestion();
};

window.goToNextQuestion = function() {
    const currentIndex = window.currentQuestionIndex || 0;
    const nextIndex = getNextVisibleIndex(currentIndex);
    if (isDebug()) {
        console.log("Moving from", currentIndex, "to", nextIndex, "next qid:", window.questionOrder[nextIndex]);
    }
    window.currentQuestionIndex = nextIndex;
    renderQuestion();
};

window.goToPreviousQuestion = function() {
    const currentIndex = window.currentQuestionIndex || 0;
    window.currentQuestionIndex = getPrevVisibleIndex(currentIndex);
    renderQuestion();
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await Promise.all([
            loadSurveyJSON(),
            loadDecisionMapping(),
            loadResultsTemplate()
        ]);
        console.log('✅ All survey data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading survey data:', error);
        document.getElementById('survey-content').innerHTML = `
            <div class="error-message">
                <h3>Error loading survey</h3>
                <p>${error.message}</p>
                <p>Please make sure all JSON files are present in the same directory.</p>
            </div>
        `;
    }
});

document.addEventListener("DOMContentLoaded", function() {
  // ... existing code ...
  
  // Waitlist form handler (main landing)
  const mainWaitlistForm = document.getElementById('main-waitlist-form');
  if (mainWaitlistForm) {
    mainWaitlistForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const name = document.getElementById('main-waitlist-name').value.trim();
      const email = document.getElementById('main-waitlist-email').value.trim();
      if (!name || !email) return;
      fetch(WAITLIST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'main' })
      }).then(() => {
        mainWaitlistForm.reset();
        alert('¡Gracias por unirte a la lista de espera! Pronto recibirás novedades.');
      });
    });
  }

  // Waitlist form handler (results page)
  const resultsWaitlistForm = document.getElementById('results-waitlist-form');
  if (resultsWaitlistForm) {
    resultsWaitlistForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const name = document.getElementById('results-waitlist-name').value.trim();
      const email = document.getElementById('results-waitlist-email').value.trim();
      if (!name || !email) return;
      fetch(WAITLIST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'results' })
      }).then(() => {
        resultsWaitlistForm.reset();
        alert('¡Gracias por unirte a la lista de espera! Pronto recibirás novedades.');
      });
    });
  }

  // Waitlist form handler (waitlist page)
  const waitlistForm = document.getElementById('waitlist-form');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const name = document.getElementById('waitlist-name').value.trim();
      const email = document.getElementById('waitlist-email').value.trim();
      if (!name || !email) return;
      fetch(WAITLIST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'waitlist' })
      }).then(() => {
        waitlistForm.reset();
        alert('¡Gracias por unirte a la lista de espera! Pronto recibirás novedades.');
      });
    });
  }
});

// =================================================================
// ENHANCED SURVEY FUNCTIONS - PATTERN CALCULATION AND SAVING
// =================================================================

// Function to calculate period pattern
function calculatePeriodPattern(answers) {
    const scores = {
        tension: 0,
        calor: 0,
        frio: 0,
        humedad: 0,
        sequedad: 0
    };

    if (isDebug()) console.log('🧮 Calculating pattern for answers:', answers);

    // P2 symptom scoring
    if (answers.P2 && Array.isArray(answers.P2)) {
        answers.P2.forEach(symptom => {
            if (symptom.includes('Sangrado abundante (rojo brillante')) scores.calor += 3;
            if (symptom.includes('Sangrado abundante (prolongado, con coágulos')) {
                scores.humedad += 3;
                scores.frio += 1;
            }
            if (symptom.includes('Dolor o cólicos')) scores.tension += 3;
            if (symptom.includes('Hinchazón o retención')) scores.humedad += 2;
            if (symptom.includes('Sangrado escaso o ausente')) {
                scores.sequedad += 2;
                scores.frio += 2;
            }
            if (symptom.includes('Fatiga o cansancio extremo')) scores.sequedad += 2;
            if (symptom.includes('Cambios de humor')) scores.tension += 2;
        });
    }

    // P3 scoring
    if (answers.P3 && Array.isArray(answers.P3)) {
        answers.P3.forEach(sign => {
            if (sign.includes('Calor, enrojecimiento')) scores.calor += 2;
            if (sign.includes('Frío en manos/pies')) scores.frio += 2;
            if (sign.includes('Hinchazón, pesadez')) scores.humedad += 2;
            if (sign.includes('Sequedad')) scores.sequedad += 2;
            if (sign.includes('Lengua pálida')) scores.frio += 1;
        });
    }

    // Slider scores
    if (answers.P2_hinchazon_severidad) {
        const severity = Number(answers.P2_hinchazon_severidad);
        if (severity >= 9) scores.humedad += 3;
        else if (severity >= 7) scores.humedad += 2;
        else if (severity >= 5) scores.humedad += 1;
    }

    if (answers.P2_fatiga_severidad) {
        const fatigue = Number(answers.P2_fatiga_severidad);
        if (fatigue >= 8) scores.sequedad += 2;
        else if (fatigue >= 6) scores.sequedad += 1;
    }

    if (answers.P2_animo_severidad) {
        const mood = Number(answers.P2_animo_severidad);
        if (mood >= 8) scores.tension += 2;
        else if (mood >= 6) scores.tension += 1;
    }

    // Determine primary pattern
    const sortedScores = Object.entries(scores).sort(([,a], [,b]) => b - a);
    const topPattern = sortedScores[0][0];
    const topScore = sortedScores[0][1];
    const secondPattern = sortedScores[1][0];
    const secondScore = sortedScores[1][1];

    const margin = topScore - secondScore;
    let confidence = 'Baja';
    if (margin >= 3) confidence = 'Alta';
    else if (margin >= 2) confidence = 'Media';

    // Check for mixed pattern
    const isMixed = margin <= 1 && topScore >= 2 && secondScore >= 2;

    const result = {
        period_pattern: isMixed ? `${topPattern}${secondPattern}` : topPattern,
        pattern_confidence: confidence,
        is_mixed_pattern: isMixed,
        mixed_patterns: isMixed ? [topPattern, secondPattern] : null,
        tension_score: scores.tension,
        calor_score: scores.calor,
        frio_score: scores.frio,
        humedad_score: scores.humedad,
        sequedad_score: scores.sequedad,
        total_score: Object.values(scores).reduce((a, b) => a + b, 0),
        margin: margin
    };

    if (isDebug()) console.log('🎯 Pattern calculated:', result);
    return result;
}

// Function to extract triage flags
function extractTriageFlags(answers, patternResults) {
    const flags = {};

    // Heavy flow triage
    if (answers.P2 && Array.isArray(answers.P2)) {
        const hasHeavyFlow = answers.P2.some(symptom => symptom.includes('Sangrado abundante'));
        const highQuantity = Number(answers.P2_cantidad) >= 7;
        const frequentChange = answers.P2_abundancia === '1h';

        if (hasHeavyFlow && (highQuantity || frequentChange)) {
            flags.heavy_flow = {
                severity: 'high',
                reason: 'Sangrado abundante con cambio frecuente de productos'
            };
        }
    }

    // Pain triage  
    if (answers.P2 && answers.P2.includes('Dolor o cólicos')) {
        const painSeverity = Number(answers.P2_dolor_severidad);
        if (painSeverity >= 9) {
            flags.severe_pain = {
                severity: 'high',
                reason: 'Dolor de intensidad 9-10/10'
            };
        }
    }

    // Low flow triage
    if (answers.P1 === 'Irregular (varía >7 días entre ciclos)' &&
        answers.P2 && answers.P2.includes('Sangrado escaso o ausente')) {
        flags.low_flow = {
            severity: 'medium',
            reason: 'Irregularidad con sangrado escaso'
        };
    }

    return flags;
}

// Enhanced function to submit complete survey with pattern results
async function submitCompleteSurveyWithResults(answers) {
    if (isDebug()) console.log('📊 Submitting complete survey with pattern calculation...', answers);

    try {
        // 1. Calculate period pattern
        const patternResults = calculatePeriodPattern(answers);

        // 2. Extract triage flags
        const triageFlags = extractTriageFlags(answers, patternResults);

        // 3. Extract key fields
        const extractedFields = {
            p1_cycle_regularity: answers.P1 || null,
            p2_symptoms: answers.P2 || [],
            p7_symptom_timing: answers.P7 || null,
            contraception_type: answers.P0_contraception || null
        };

        // 4. Prepare complete survey data
        const surveyData = {
            answers: answers,
            period_pattern: patternResults.period_pattern,
            pattern_confidence: patternResults.pattern_confidence,
            is_mixed_pattern: patternResults.is_mixed_pattern,
            mixed_patterns: patternResults.mixed_patterns,
            tension_score: patternResults.tension_score,
            calor_score: patternResults.calor_score,
            frio_score: patternResults.frio_score,
            humedad_score: patternResults.humedad_score,
            sequedad_score: patternResults.sequedad_score,
            ...extractedFields,
            triage_flags: triageFlags,
            has_heavy_flow_flag: !!triageFlags.heavy_flow,
            has_pain_flag: !!triageFlags.severe_pain,
            has_low_flow_flag: !!triageFlags.low_flow,
            survey_version: 'v5.4.0',
            mode: window.currentMode || 'regular',
            session_id: window.sessionId || generateSessionId(),
            user_agent: navigator.userAgent,
            started_at: window.surveyStartTime || new Date().toISOString(),
            completed_at: new Date().toISOString()
        };

        // 5. Save to Supabase
        const { data, error } = await supabase
            .from('survey_responses')
            .insert([surveyData])
            .select();

        if (error) {
            console.error('❌ Supabase save error:', error);
            throw error;
        }

        if (isDebug()) console.log('✅ Complete survey saved:', data);

        // 6. Optional: Send email notification
        try {
            const emailData = {
                type: 'survey_results',
                survey_id: data[0].id,
                period_pattern: patternResults.period_pattern,
                pattern_confidence: patternResults.pattern_confidence,
                key_answers: extractedFields,
                scores: {
                    tension: patternResults.tension_score,
                    calor: patternResults.calor_score,
                    frio: patternResults.frio_score,
                    humedad: patternResults.humedad_score,
                    sequedad: patternResults.sequedad_score
                },
                triage_flags: triageFlags,
                completed_at: surveyData.completed_at
            };

            fetch(WAITLIST_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
            }).then(response => {
                if (response.ok) {
                    if (isDebug()) console.log('✅ Results email sent');
                } else {
                    console.warn('⚠️ Email webhook failed, but survey saved successfully');
                }
            }).catch(emailError => {
                console.warn('⚠️ Email sending failed:', emailError.message);
            });
        } catch (emailError) {
            console.warn('⚠️ Email notification error:', emailError.message);
        }

        return { 
            success: true, 
            data: data[0], 
            pattern: patternResults,
            triage: triageFlags
        };

    } catch (error) {
        console.error('❌ Complete survey submission error:', error);
        return { success: false, error: error.message };
    }
}

// Utility functions
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Enhanced data status checker
async function checkEnhancedDataStatus() {
    try {
        const { data: recentSurveys, error } = await supabase
            .from('survey_responses')
            .select('id, period_pattern, pattern_confidence, completed_at')
            .order('completed_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Database connection failed:', error);
            return { connected: false, error: error.message };
        }

        console.log('✅ Database Status:');
        console.log('📊 Recent surveys:', recentSurveys?.length || 0);

        if (recentSurveys?.length > 0) {
            console.log('🎯 Recent patterns:', 
                recentSurveys.map(s => `${s.period_pattern} (${s.pattern_confidence})`));
        }

        return {
            connected: true,
            survey_count: recentSurveys?.length || 0,
            recent_surveys: recentSurveys
        };

    } catch (error) {
        console.error('❌ Data status check failed:', error);
        return { connected: false, error: error.message };
    }
}

// Initialize session tracking
if (!window.sessionId) {
    window.sessionId = generateSessionId();
    window.surveyStartTime = new Date().toISOString();
}