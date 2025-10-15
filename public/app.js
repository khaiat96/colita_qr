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
    if (question.id === "P0_contraception" || question.id === "P1") return true;

    if (question.id.startsWith("P1_")) {
        const p1Answer = answers["P1"];
        const shouldShow = p1Answer === "No tengo sangrado actualmente";
        return shouldShow;
    }

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

function renderQuestion() {
    let qId = questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);

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

    if (question.type === 'multiselect' || question.type === 'single_choice') {
        question.options.forEach((option, index) => {
            const isMultiSelect = question.type === 'multiselect';
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
            if (question.validation && question.validation.maxselected && currentAnswers.length >= question.validation.maxselected) {
                currentAnswers.shift();
            }
            currentAnswers.push(value);
        }

        document.querySelectorAll('.option').forEach(option => {
            if (option.dataset.value === value) {
                option.classList.toggle('selected');
            }
        });
    } else {
        answers[question.id] = value;
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
function updateNavigation() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);
    let hasAnswer = false;

    console.log('📍 Navigation Check:', qId, 'type:', question.type);

    if (question.type === 'multiselect') {
        const selected = Array.isArray(answers[qId]) ? answers[qId] : [];
        const minSelected = question.validation?.minselected ?? 1;

        console.log('🔍 Multiselect:', {
            qId,
            selected,
            selectedLength: selected.length,
            minSelected,
            validation: question.validation
        });

        // ✅ CRITICAL: If minselected is 0, always enable Next
        if (minSelected === 0) {
            hasAnswer = true;
            console.log('✅✅✅ minselected=0: OPTIONAL QUESTION - ENABLING NEXT BUTTON');
        } else {
            hasAnswer = selected.length >= minSelected;
            console.log(`${hasAnswer ? '✅' : '❌'} Need ${minSelected}, have ${selected.length}`);
        }
    } else if (question.type === 'single_choice') {
        hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
        console.log('Single choice:', hasAnswer ? '✅ has answer' : '❌ no answer');
    } else if (question.type === 'slider') {
        hasAnswer = typeof answers[qId] === 'number';
        console.log('Slider:', hasAnswer ? '✅ has value' : '❌ no value');
    } else {
        hasAnswer = !!answers[qId];
    }

    console.log('🎯 Final hasAnswer:', hasAnswer);

    // Enable/disable next button
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.disabled = !hasAnswer;
        console.log('🔘 Next button disabled:', nextBtn.disabled);
    }

    // Show/hide back button  
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = getPrevVisibleQuestionIndex(currentQuestionIndex) !== -1 ? 'block' : 'none';
    }
}

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