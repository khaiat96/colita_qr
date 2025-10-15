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

// Utility function to get question by id
function getQuestionById(qId) {
    return surveyQuestions.find(q => q.id === qId);
}

// Utility for visible_if logic
function isQuestionVisible(question, answers) {
    if (!question) return false;
    if (question.id === "P0_contraception" || question.id === "P1") return true;

    // AGGRESSIVE: Hide ALL P1_* questions unless P1 = "No tengo sangrado actualmente"
    if (question.id.startsWith("P1_")) {
        const p1Answer = answers["P1"];
        const shouldShow = p1Answer === "No tengo sangrado actualmente";
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
    if (!question.visible_if) return true;
    const cond = question.visible_if;
    if (cond.question_id && typeof cond.equals !== "undefined") {
        return answers[cond.question_id] === cond.equals;
    }
    if (cond.question_id && cond.includes) {
        const ans = answers[cond.question_id];
        const inclArr = Array.isArray(cond.includes) ? cond.includes : [cond.includes];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return inclArr.some(val => ansArr.includes(val));
    }
    if (cond.question_id && cond.includes_any) {
        const ans = answers[cond.question_id];
        const inclAnyArr = Array.isArray(cond.includes_any) ? cond.includes_any : [cond.includes_any];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return inclAnyArr.some(val => ansArr.includes(val));
    }
    if (cond.question_id && cond.not_includes) {
        const ans = answers[cond.question_id];
        const notInclArr = Array.isArray(cond.not_includes) ? cond.not_includes : [cond.not_includes];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInclArr.every(val => !ansArr.includes(val));
    }
    if (cond.question_id && cond.not_in) {
        const ans = answers[cond.question_id];
        const notInArr = Array.isArray(cond.not_in) ? cond.not_in : [cond.not_in];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInArr.every(val => !ansArr.includes(val));
    }
    if (cond.question_id && cond.not_includes_any) {
        const ans = answers[cond.question_id];
        const notInclArr = Array.isArray(cond.not_includes_any) ? cond.not_includes_any : [cond.not_includes_any];
        const ansArr = Array.isArray(ans) ? ans : [ans];
        return notInclArr.every(val => !ansArr.includes(val));
    }
    if (cond.question_id && typeof cond.at_least !== "undefined") {
        const ans = Number(answers[cond.question_id]) || 0;
        return ans >= cond.at_least;
    }
    if (cond.all && Array.isArray(cond.all)) {
        return cond.all.every(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }
    if (cond.any && Array.isArray(cond.any)) {
        return cond.any.some(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }
    return true;
}

// Navigation helpers: skip hidden questions!
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
    for (let i = currentIndex - 1; i >= 0; i--) {
        const qId = questionOrder[i];
        const question = getQuestionById(qId);
        if (isQuestionVisible(question, answers)) {
            return i;
        }
    }
    return -1;
}

// Survey rendering
function renderQuestion() {
    // Skip hidden questions
    let qId = questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);

    // If not visible, auto-skip to next
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

    // Defensive patch for multi_select answer initialization
    if (question.type === "multi_select" && !answers[qId]) {
        answers[qId] = [];
    }

    // Defensive check: Ensure survey-content exists
    const surveyContent = document.getElementById('survey-content');
    if (!surveyContent) return; // Prevent error if DOM not ready

    let optionsHtml = '';

    // Handle multi_select, single_choice, slider, etc.
    if (question.type === 'multi_select' || question.type === 'single_choice') {
        question.options.forEach((option, index) => {
            const isMultiSelect = question.type === 'multi_select';
            const optionClass = isMultiSelect ? 'option multi-select' : 'option';
            const selected = isMultiSelect 
                ? (answers[question.id] && answers[question.id].includes(option.value)) 
                : answers[question.id] === option.value;
            optionsHtml += `
                <div class="${optionClass}${selected ? " selected":""}" data-value="${option.value}" onclick="selectOption('${option.value}', ${isMultiSelect})">
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
window.selectOption = function(value, isMultiSelect) {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);

    if (isMultiSelect) {
        if (!answers[question.id]) {
            answers[question.id] = [];
        }
        const currentAnswers = answers[question.id];
        const index = currentAnswers.indexOf(value);

        if (index > -1) {
            currentAnswers.splice(index, 1);
        } else {
            // If max_selected, enforce
            if (question.validation && question.validation.max_selected && currentAnswers.length >= question.validation.max_selected) {
                currentAnswers.shift();
            }
            currentAnswers.push(value);
        }

        // Update visual selection
        document.querySelectorAll('.option').forEach(option => {
            if (option.dataset.value === value) {
                option.classList.toggle('selected');
            }
        });
    } else {
        answers[question.id] = value;
        // Update visual selection
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
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
    // Count only visible questions
    let visibleCount = 0;
    for (let i = 0; i <= currentQuestionIndex; i++) {
        const q = getQuestionById(questionOrder[i]);
        if (isQuestionVisible(q, answers)) visibleCount++;
    }
    // Total visible questions (up to this point)
    const totalVisible = questionOrder.filter(qId => isQuestionVisible(getQuestionById(qId), answers)).length;
    const progress = ((visibleCount) / totalVisible) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// PATCH: Navigation logic to handle optional multi_select and always skip hidden questions!
function updateNavigation() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);

    let hasAnswer;
    if (question.type === "multi_select" && question.validation && question.validation.min_selected === 0) {
        hasAnswer = true;
    } else if (question.type === "multi_select") {
        hasAnswer = answers[question.id] && answers[question.id].length >= (question.validation?.min_selected ?? 0);
    } else if (question.type === "single_choice") {
        hasAnswer = !!answers[question.id];
    } else if (question.type === "slider") {
        hasAnswer = typeof answers[question.id] === "number";
    } else {
        hasAnswer = !!answers[question.id];
    }

    // Enable/disable next button accordingly
    document.getElementById('next-btn').disabled = !hasAnswer;

    // Show/hide back button
    document.getElementById('back-btn').style.display = getPrevVisibleQuestionIndex(currentQuestionIndex) > -1 ? 'block' : 'none';
}

// Navigation
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

// Results calculation (same as before, you can adapt for dynamic scoring)
function calculateResults() {
    const scores = {
        tension: 0,
        calor: 0,
        frio: 0,
        humedad: 0,
        sequedad: 0
    };

    // Calculate scores based on answers
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

    // Find dominant pattern
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
    // Show loading
    document.getElementById('loading-modal').classList.add('show');

    // Calculate results
    const dominantPattern = calculateResults();

    // Save to Supabase
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

    // Hide loading
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
// Email and waitlist forms: unchanged from before—ensure any fetches/IDs match your HTML!

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function startSurvey() {
    if (!surveyQuestions.length || !questionOrder.length) {
        alert('Las preguntas del quiz no se han cargado aún. Intenta de nuevo en unos segundos.');
        return;
    }
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    renderQuestion();
}

document.addEventListener('DOMContentLoaded', async function() {
    showPage('landing-page');
    isProMode = false;

    try {
        const resp = await fetch('survey_questions-combined.json');
        if (!resp.ok) throw new Error("survey_questions-combined.json not found");
        const surveyData = await resp.json();
        surveyQuestions = surveyData.questions;
        questionOrder = surveyData.question_order;
    } catch (err) {
        alert('No se pudieron cargar las preguntas del quiz.');
        console.error(err);
    }

    // All button handlers are attached to window above so inline onclick works.
    // Your waitlist & email form logic can remain as before.
});