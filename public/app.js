// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Survey data variables
let surveyData = null;
let surveyQuestions = [];
let questionOrder = [];
let decisionMapping = null;
let resultsTemplate = null;
let currentQuestionIndex = 0;
let answers = {};
let sessionId = generateSessionId();
let isProMode = false;

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load survey questions from JSON
async function loadSurveyJSON() {
    const resp = await fetch('/data/survey_questions-combined.json');
    surveyData = await resp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;
}

async function loadDecisionMapping() {
    const resp = await fetch('/data/decision_mapping-combined.json');
    decisionMapping = await resp.json();
}

async function loadResultsTemplate() {
    const resp = await fetch('/data/results_template.json');
    resultsTemplate = await resp.json();
}

// Helper: Find question by ID, supports top-level and nested (compound/grouped) questions
function getQuestionById(qId) {
    let question = surveyQuestions.find(q => q.id === qId);
    if (question) return question;
    for (const q of surveyQuestions) {
        if (q.items) {
            let subQ = q.items.find(sub => sub.id === qId);
            if (subQ) return subQ;
        }
        if (q.questions) {
            let subQ = q.questions.find(sub => sub.id === qId);
            if (subQ) return subQ;
        }
    }
    return undefined;
}

// Improved Helper: Evaluate visible_if condition (supports all common cases from the JSON, including arrays)
function isQuestionVisible(question, answers) {
    if (!question.visible_if) return true;
    const cond = question.visible_if;
    if (cond.question_id && cond.includes) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.includes)) {
            if (Array.isArray(ans)) return cond.includes.some(v => ans.includes(v));
            return cond.includes.includes(ans);
        } else {
            if (Array.isArray(ans)) return ans.includes(cond.includes);
            return ans === cond.includes;
        }
    }
    if (cond.question_id && cond.includes_any) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.includes_any)) {
            if (Array.isArray(ans)) return cond.includes_any.some(v => ans.includes(v));
            return cond.includes_any.includes(ans);
        } else {
            if (Array.isArray(ans)) return ans.includes(cond.includes_any);
            return ans === cond.includes_any;
        }
    }
    if (cond.question_id && cond.not_includes_any) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.not_includes_any)) {
            if (Array.isArray(ans)) return cond.not_includes_any.every(v => !ans.includes(v));
            return !cond.not_includes_any.includes(ans);
        } else {
            if (Array.isArray(ans)) return !ans.includes(cond.not_includes_any);
            return ans !== cond.not_includes_any;
        }
    }
    if (cond.question_id && cond.not_in) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.not_in)) {
            if (Array.isArray(ans)) return cond.not_in.every(v => !ans.includes(v));
            return !cond.not_in.includes(ans);
        } else {
            if (Array.isArray(ans)) return !ans.includes(cond.not_in);
            return ans !== cond.not_in;
        }
    }
    if (cond.question_id && cond.equals !== undefined) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.equals)) {
            if (Array.isArray(ans)) return cond.equals.some(v => ans.includes(v));
            return cond.equals.includes(ans);
        } else {
            return ans === cond.equals;
        }
    }
    if (cond.question_id && typeof cond.at_least !== "undefined") {
        const ans = answers[cond.question_id];
        return typeof ans === "number" && ans >= cond.at_least;
    }
    if (cond.question_id && typeof cond.at_most !== "undefined") {
        const ans = answers[cond.question_id];
        return typeof ans === "number" && ans <= cond.at_most;
    }
    if (cond.all) {
        return cond.all.every(sub => isQuestionVisible({visible_if: sub}, answers));
    }
    if (cond.any) {
        return cond.any.some(sub => isQuestionVisible({visible_if: sub}, answers));
    }
    if (cond.question_id && cond.not_includes) {
        const ans = answers[cond.question_id];
        if (Array.isArray(ans)) return !ans.includes(cond.not_includes);
        return ans !== cond.not_includes;
    }
    if (cond.question_id && typeof cond.not_equals !== "undefined") {
        return answers[cond.question_id] !== cond.not_equals;
    }
    if (cond.missing) {
        return typeof answers[cond.missing] === "undefined";
    }
    return true;
}

function getNextVisibleQuestionIndex(fromIndex) {
    for (let i = fromIndex + 1; i < questionOrder.length; i++) {
        const qId = questionOrder[i];
        const q = getQuestionById(qId);
        if (isQuestionVisible(q, answers)) return i;
    }
    return -1;
}

function getPrevVisibleQuestionIndex(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const qId = questionOrder[i];
        const q = getQuestionById(qId);
        if (isQuestionVisible(q, answers)) return i;
    }
    return -1;
}

// Page navigation functions
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
};

window.startSurvey = function() {
    isProMode = false;
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    const proIndicator = document.getElementById('pro-mode-indicator');
    if (proIndicator) proIndicator.style.display = 'none';
    renderQuestion();
};

window.startProSurvey = function() {
    isProMode = true;
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    const proIndicator = document.getElementById('pro-mode-indicator');
    if (proIndicator) proIndicator.style.display = 'block';
    renderQuestion();
};

window.showWaitlist = function() {
    showPage('waitlist-page');
};

window.scrollToWaitlist = function() {
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
        waitlistSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
};

function renderQuestion() {
    let qId = questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);

    while (question && !isQuestionVisible(question, answers)) {
        const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
        if (nextIdx === -1) {
            finishSurvey();
            return;
        }
        currentQuestionIndex = nextIdx;
        qId = questionOrder[currentQuestionIndex];
        question = getQuestionById(qId);
    }

    if (!question) {
        finishSurvey();
        return;
    }

    const surveyContent = document.getElementById('survey-content');
    let optionsHtml = '';

    if (question.type === 'compound' || question.type === 'grouped') {
        let subQuestions = question.items || question.questions;
        optionsHtml = subQuestions.filter(subQ => isQuestionVisible(subQ, answers)).map((subQuestion) => {
            let subOptionsHtml = '';
            if (subQuestion.type === 'slider') {
                subOptionsHtml = `
                    <input type="range" min="${subQuestion.min}" max="${subQuestion.max}" step="${subQuestion.step}" 
                        value="${answers[subQuestion.id] || subQuestion.min}" 
                        id="slider-input-${subQuestion.id}"
                        oninput="selectSlider('${subQuestion.id}', this.value)">
                    <span id="slider-value-${subQuestion.id}">${answers[subQuestion.id] || subQuestion.min}</span>
                `;
            } else if (subQuestion.type === 'single_choice' || subQuestion.type === 'multi_select') {
                subOptionsHtml = subQuestion.options.map((option) => {
                    const isMultiSelect = subQuestion.type === 'multi_select';
                    const optionClass = isMultiSelect ? 'option multi-select' : 'option';
                    const selected = (answers[subQuestion.id] && (
                        (isMultiSelect && answers[subQuestion.id].includes(option.value)) ||
                        (!isMultiSelect && answers[subQuestion.id] === option.value)
                    )) ? 'selected' : '';
                    return `
                        <div class="${optionClass} ${selected}" data-value="${option.value}" onclick="selectOption('${option.value}', ${isMultiSelect}, '${subQuestion.id}')">
                            ${option.label}
                        </div>
                    `;
                }).join('');
            }
            return `
                <div class="sub-question">
                    <h4>${subQuestion.title}</h4>
                    ${subQuestion.help_text ? `<div class="help-text">${subQuestion.help_text}</div>` : ''}
                    <div class="options">${subOptionsHtml}</div>
                </div>
            `;
        }).join('');
    } else if (question.type === 'multi_select' || question.type === 'single_choice') {
        question.options.forEach((option, index) => {
            const isMultiSelect = question.type === 'multi_select';
            const optionClass = isMultiSelect ? 'option multi-select' : 'option';
            const selected = (answers[question.id] && (
                (isMultiSelect && answers[question.id].includes(option.value)) ||
                (!isMultiSelect && answers[question.id] === option.value)
            )) ? 'selected' : '';
            optionsHtml += `
                <div class="${optionClass} ${selected}" data-value="${option.value}" onclick="selectOption('${option.value}', ${isMultiSelect}, '${question.id}')">
                    ${option.label}
                </div>
            `;
        });
    } else if (question.type === 'slider') {
        optionsHtml = `
            <input type="range" min="${question.min}" max="${question.max}" step="${question.step}" 
                value="${answers[question.id] || question.min}" id="slider-input-${question.id}"
                oninput="selectSlider('${question.id}', this.value)">
            <span id="slider-value-${question.id}">${answers[question.id] || question.min}</span>
        `;
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
    `;

    updateProgress();
    updateNavigation();
}

window.selectOption = function(value, isMultiSelect, qIdOverride) {
    const qId = qIdOverride || questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);
    if (!question) return;

    if (question.type === 'multi_select') {
        if (!answers[qId]) {
            answers[qId] = [];
        }
        const currentAnswers = answers[qId];
        const index = currentAnswers.indexOf(value);

        if (index > -1) {
            currentAnswers.splice(index, 1);
        } else {
            if (question.validation && question.validation.max_selected && currentAnswers.length >= question.validation.max_selected) {
                currentAnswers.shift();
            }
            currentAnswers.push(value);
        }
    } else {
        answers[qId] = value;
    }

    renderQuestion();
    updateNavigation();
};

window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById('slider-value-' + qId);
    if (sliderValueSpan) sliderValueSpan.textContent = value;
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

function updateNavigation() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);
    let hasAnswer = false;

    if (question && (question.type === 'compound' || question.type === 'grouped')) {
        let subQuestions = question.items || question.questions;
        hasAnswer = subQuestions.filter(subQ => isQuestionVisible(subQ, answers)).every(subQ => {
            if (subQ.type === 'single_choice') {
                return !!answers[subQ.id];
            }
            if (subQ.type === 'multi_select') {
                return Array.isArray(answers[subQ.id]) && answers[subQ.id].length > 0;
            }
            if (subQ.type === 'slider') {
                return typeof answers[subQ.id] !== 'undefined';
            }
            return true;
        });
    } else if (question) {
        if (question.type === 'slider') {
            hasAnswer = typeof answers[question.id] !== 'undefined';
        } else if (question.type === 'single_choice') {
            hasAnswer = !!answers[question.id];
        } else if (question.type === 'multi_select') {
            hasAnswer = Array.isArray(answers[question.id]) && answers[question.id].length > 0;
        } else {
            hasAnswer = !!answers[question.id];
        }
    }

    document.getElementById('next-btn').disabled = !hasAnswer;
    document.getElementById('back-btn').style.display = getPrevVisibleQuestionIndex(currentQuestionIndex) > -1 ? 'block' : 'none';
}

window.nextQuestion = function() {
    const nextIdx = getNextVisibleQuestionIndex(currentQuestionIndex);
    if (nextIdx > -1) {
        currentQuestionIndex = nextIdx;
        renderQuestion();
    } else {
        finishSurvey();
    }
};

window.previousQuestion = function() {
    const prevIdx = getPrevVisibleQuestionIndex(currentQuestionIndex);
    if (prevIdx > -1) {
        currentQuestionIndex = prevIdx;
        renderQuestion();
    }
};

function calculateResults() {
    const scores = {
        tension: 0,
        calor: 0,
        frio: 0,
        humedad: 0,
        sequedad: 0
    };

    surveyQuestions.forEach(question => {
        if (question.type === 'compound' || question.type === 'grouped') {
            let subQuestions = question.items || question.questions;
            subQuestions.forEach(subQ => {
                const answer = answers[subQ.id];
                if (!answer) return;
                const answerArray = Array.isArray(answer) ? answer : [answer];
                if (subQ.options) {
                    answerArray.forEach(value => {
                        const option = subQ.options.find(opt => opt.value === value);
                        if (option && option.scores) {
                            Object.keys(option.scores).forEach(key => {
                                scores[key] += option.scores[key];
                            });
                        }
                    });
                }
            });
        } else {
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
            .insert([
                {
                    session_id: sessionId,
                    answers: answers,
                    result_pattern: dominantPattern,
                    is_pro_mode: isProMode,
                    created_at: new Date().toISOString()
                }
            ]);
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
    const characteristicsHtml = pattern.characteristics.map(char => `<li>${char}</li>`).join('');
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

// Waitlist form handler for all pages
document.addEventListener('DOMContentLoaded', async function() {
    showPage('landing-page');
    isProMode = false;
    try {
        await loadSurveyJSON();
        await loadDecisionMapping();
        await loadResultsTemplate();
    } catch (err) {
        alert('No se pudieron cargar las preguntas del quiz.');
        console.error(err);
    }
    // List of waitlist forms on all pages
    const waitlistForms = [
        document.getElementById('waitlist-form'),
        document.getElementById('main-waitlist-form'),
        document.getElementById('results-waitlist-form')
    ];
    waitlistForms.forEach(form => {
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                // Find the name/email input fields in the form
                const nameInput = form.querySelector('input[type="text"], input[name="name"]');
                const emailInput = form.querySelector('input[type="email"], input[name="email"]');
                const name = nameInput ? nameInput.value.trim() : '';
                const email = emailInput ? emailInput.value.trim() : '';
                if (!name || !email) {
                    alert('Por favor ingresa tu nombre y correo.');
                    return;
                }
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;
                try {
                    const resp = await fetch(WAITLIST_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email })
                    });
                    if (resp.ok) {
                        alert('¡Gracias por unirte a la lista de espera!');
                        form.reset();
                        // Do NOT reroute to landing page
                        // Optionally, show a thank you modal or keep user on same page
                    } else {
                        throw new Error('No se pudo enviar tu información.');
                    }
                } catch (err) {
                    alert('Error al enviar. Intenta de nuevo.');
                }
                if (submitBtn) submitBtn.disabled = false;
            });
        }
    });
});