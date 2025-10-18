// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg5MzYzMjMsImV4cCI6MjA0NDUxMjMyM30.DRXn5VV5LKxcLl0eLvUPnhfWb0OfJBGzJJ0b4L_Ui5Q';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';
const EMAIL_REPORT_WEBHOOK = 'https://hook.us2.make.com/er23s3ieomte4jue36f4v4o0g3mrtsdl';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let questionOrder = [];
let surveyQuestions = [];
let decisionMapping = {};
let answers = {};
let currentQuestionIndex = 0;
let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let resultsTemplate = null;
window.surveyLoaded = false;

console.log('🚀 APP.JS LOADED - VERSION 2.2 FINAL');

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL FUNCTIONS (accessible from HTML onclick)
// ═══════════════════════════════════════════════════════════════════════

window.scrollToWaitlist = function() {
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.startSurvey = function() {
    currentQuestionIndex = 0;
    answers = {};
    showPage('survey-page');
    renderQuestion();
};

window.selectOption = function(questionId, value, isMultiSelect) {
    if (isMultiSelect) {
        if (!answers[questionId]) answers[questionId] = [];
        const idx = answers[questionId].indexOf(value);
        if (idx > -1) {
            answers[questionId].splice(idx, 1);
        } else {
            answers[questionId].push(value);
        }
        console.log(`✅ Multi-select ${questionId}: ${answers[questionId]}`);
    } else {
        answers[questionId] = value;
        console.log(`✅ Selected ${questionId} = ${value}`);
    }
    updateNavigation();
};

window.selectSlider = function(questionId, value) {
    answers[questionId] = parseInt(value, 10);
    const display = document.getElementById('slider-value-' + questionId) || document.getElementById('slider-value');
    if (display) display.textContent = value;
    console.log(`✅ Slider ${questionId} = ${value}`);
    updateNavigation();
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

window.previousQuestion = function() {
    const prevIdx = getPrevVisibleQuestionIndex(currentQuestionIndex);
    if (prevIdx > -1) {
        currentQuestionIndex = prevIdx;
        renderQuestion();
    }
};

// ═══════════════════════════════════════════════════════════════════════
// INITIALIZE ON PAGE LOAD
// ═══════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, initializing survey...');

    try {
        // Load survey questions
        const questionsResp = await fetch('survey_questions.json');
        const questionsData = await questionsResp.json();
        surveyQuestions = questionsData.questions || [];
        questionOrder = surveyQuestions.map(q => q.id);
        console.log(`✅ Loaded ${surveyQuestions.length} questions`);

        // Load decision mapping
        const mappingResp = await fetch('decision_mapping.json');
        decisionMapping = await mappingResp.json();
        console.log('✅ Loaded decision mapping:', Object.keys(decisionMapping));

        // Load results template
        const templateResp = await fetch('results_template.json');
        resultsTemplate = await templateResp.json();
        console.log('✅ Loaded results template');

        window.surveyLoaded = true;

        // Set up waitlist forms
        const mainForm = document.getElementById('main-waitlist-form');
        if (mainForm) {
            mainForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('main-waitlist-email').value;
                await submitWaitlist(email, 'landing');
            });
        }

        const resultsForm = document.getElementById('results-waitlist-form');
        if (resultsForm) {
            resultsForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('results-waitlist-email').value;
                await submitWaitlist(email, 'results');
            });
        }

        showPage('landing-page');

    } catch (error) {
        console.error('❌ Error loading survey:', error);
        alert('No se pudieron cargar las preguntas del quiz: ' + error.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════

function showPage(pageId) {
    const pages = ['landing-page', 'survey-page', 'results-page'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === pageId) ? 'flex' : 'none';
    });
    console.log(`📄 Showing: ${pageId}`);
}

// ═══════════════════════════════════════════════════════════════════════
// QUESTION RENDERING
// ═══════════════════════════════════════════════════════════════════════

function renderQuestion() {
    let qId = questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);

    if (!question) {
        finishSurvey();
        return;
    }

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

    if (question.type === "multiselect" && !answers[qId]) {
        answers[qId] = [];
        console.log(`✅ Initialized ${qId} as empty array`);
    }

    const surveyContent = document.getElementById('survey-content');
    if (!surveyContent) return;

    let optionsHtml = '';

    if ((question.type === 'multiselect' || question.type === 'single' || question.type === 'single_choice') && Array.isArray(question.options)) {
        question.options.forEach((option) => {
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
    } else if (question.type === 'text') {
        optionsHtml = `
            <input type="text" class="text-input" value="${answers[qId] || ''}" 
                oninput="answers['${qId}'] = this.value; updateNavigation();">
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
        optionsHtml = `<div class="no-options">Tipo de pregunta no soportado: ${question.type}</div>`;
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

// ═══════════════════════════════════════════════════════════════════════
// QUESTION HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getQuestionById(id) {
    return surveyQuestions.find(q => q.id === id);
}

function isQuestionVisible(question, answers) {
    if (!question.visible_if) return true;
    const vif = question.visible_if;

    if (vif.any) {
        return vif.any.some(cond => checkCondition(cond, answers));
    } else if (vif.all) {
        return vif.all.every(cond => checkCondition(cond, answers));
    } else {
        return checkCondition(vif, answers);
    }
}

function checkCondition(cond, answers) {
    const qId = cond.question_id;
    const answer = answers[qId];

    if (cond.equals !== undefined) {
        return answer === cond.equals;
    } else if (cond.includes !== undefined) {
        if (Array.isArray(answer)) {
            return cond.includes.some(val => answer.includes(val));
        } else {
            return cond.includes.includes(answer);
        }
    }
    return false;
}

function getNextVisibleQuestionIndex(fromIndex) {
    for (let i = fromIndex + 1; i < questionOrder.length; i++) {
        const q = getQuestionById(questionOrder[i]);
        if (q && isQuestionVisible(q, answers)) {
            return i;
        }
    }
    return -1;
}

function getPrevVisibleQuestionIndex(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const q = getQuestionById(questionOrder[i]);
        if (q && isQuestionVisible(q, answers)) {
            return i;
        }
    }
    return -1;
}

// ═══════════════════════════════════════════════════════════════════════
// SCORING & RESULTS
// ═══════════════════════════════════════════════════════════════════════

function calculateScores() {
    const scores = {
        tension: 0,
        calor: 0,
        frio: 0,
        humedad: 0,
        sequedad: 0
    };

    console.log('🔢 Calculating scores from answers:', answers);

    if (!decisionMapping || !decisionMapping.scoring) {
        console.error('❌ decisionMapping.scoring not found');
        return scores;
    }

    for (const [qId, answer] of Object.entries(answers)) {
        const mappingList = decisionMapping.scoring[qId];
        if (!mappingList) continue;

        if (Array.isArray(answer)) {
            answer.forEach(val => {
                const entry = mappingList.find(m => m.value === val);
                if (entry && entry.scores) {
                    for (const [key, points] of Object.entries(entry.scores)) {
                        if (scores[key] !== undefined) {
                            scores[key] += points;
                        }
                    }
                }
            });
        } else {
            const entry = mappingList.find(m => m.value === answer);
            if (entry && entry.scores) {
                for (const [key, points] of Object.entries(entry.scores)) {
                    if (scores[key] !== undefined) {
                        scores[key] += points;
                    }
                }
            }
        }
    }

    console.log('✅ Final scores:', scores);
    return scores;
}

function getTopPatterns(scores, n = 3) {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, n).map(([pattern, score]) => ({ pattern, score }));
}

async function finishSurvey() {
    console.log('🏁 Survey finished');

    const scores = calculateScores();
    const topPatterns = getTopPatterns(scores, 3);

    console.log('📊 Top patterns:', topPatterns);

    await sendResponsesToGoogleSheet();

    displayResults(topPatterns, scores);
    showPage('results-page');
}

function displayResults(topPatterns, scores) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;

    let html = '<h2>Tus Resultados</h2>';
    html += '<div class="top-patterns">';
    
    topPatterns.forEach((item, idx) => {
        const pattern = item.pattern;
        const score = item.score;
        const template = resultsTemplate && resultsTemplate.patterns ? resultsTemplate.patterns[pattern] : null;

        if (template) {
            html += `
                <div class="pattern-card">
                    <h3>${idx + 1}. ${template.name || pattern}</h3>
                    <p class="score">Puntuación: ${score}</p>
                    <p>${template.description || ''}</p>
                    ${template.recommendations ? `<p><strong>Recomendaciones:</strong> ${template.recommendations}</p>` : ''}
                </div>
            `;
        } else {
            html += `
                <div class="pattern-card">
                    <h3>${idx + 1}. ${pattern}</h3>
                    <p class="score">Puntuación: ${score}</p>
                </div>
            `;
        }
    });

    html += '</div>';
    resultsContainer.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════
// WAITLIST & DATA SUBMISSION
// ═══════════════════════════════════════════════════════════════════════

async function submitWaitlist(email, source) {
    if (!email) {
        alert('Por favor ingresa tu email.');
        return;
    }

    try {
        const response = await fetch(WAITLIST_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                source: source,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            alert('¡Gracias! Te hemos agregado a la lista de espera.');
            if (source === 'landing') {
                document.getElementById('main-waitlist-email').value = '';
            } else {
                document.getElementById('results-waitlist-email').value = '';
            }
        } else {
            alert('Hubo un problema. Por favor intenta de nuevo.');
        }
    } catch (error) {
        console.error('Error submitting waitlist:', error);
        alert('Error al enviar. Por favor intenta más tarde.');
    }
}

async function sendResponsesToGoogleSheet() {
    try {
        const payload = {
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            answers: answers
        };

        const response = await fetch(EMAIL_REPORT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ Responses sent to webhook');
        } else {
            console.error('❌ Failed to send responses');
        }
    } catch (error) {
        console.error('❌ Error sending responses:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// PROGRESS & NAVIGATION
// ═══════════════════════════════════════════════════════════════════════

function updateProgress() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        const progress = ((currentQuestionIndex + 1) / questionOrder.length) * 100;
        progressBar.style.width = progress + '%';
    }

    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `${currentQuestionIndex + 1} / ${questionOrder.length}`;
    }
}

function updateNavigation() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);
    if (!question) return;

    let hasAnswer = false;

    if (question.type === 'compound' && Array.isArray(question.items)) {
        hasAnswer = question.items.every(item => {
            if (item.type === 'multiselect') {
                return Array.isArray(answers[item.id]) && answers[item.id].length > 0;
            } else if (item.type === 'single_choice') {
                return !!answers[item.id];
            } else if (item.type === 'slider') {
                return typeof answers[item.id] === 'number';
            } else {
                return true;
            }
        });
    } else if (question.type === 'grouped' && Array.isArray(question.questions)) {
        hasAnswer = question.questions.every(group => {
            if (group.type === 'multiselect') {
                return Array.isArray(answers[group.id]) && answers[group.id].length > 0;
            } else if (group.type === 'single_choice') {
                return !!answers[group.id];
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
}

console.log('✅ All functions loaded and ready');