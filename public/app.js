// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy[...]
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

// Helper: Check visible_if logic
function isQuestionVisible(question, answers) {
    if (!question || !question.visible_if) return true;
    const cond = question.visible_if;
    if (isDebug()) console.log(`Checking visible_if for ${question.id}`, {answers, cond});

    // equals (strict string match)
    if (cond.question_id && typeof cond.equals !== "undefined") {
        if (isDebug()) console.log(`Comparing answer: "${answers[cond.question_id]}" with expected: "${cond.equals}"`);
        return answers[cond.question_id] === cond.equals;
    }
    // includes (array or single)
    if (cond.question_id && cond.includes) {
        const ans = answers[cond.question_id];
        if (Array.isArray(cond.includes)) {
            if (Array.isArray(ans)) return cond.includes.some(val => ans.includes(val));
            return cond.includes.includes(ans);
        } else {
            if (Array.isArray(ans)) return ans.includes(cond.includes);
            return ans === cond.includes;
        }
    }
    // includes_any (array)
    if (cond.question_id && cond.includes_any) {
        const ans = answers[cond.question_id];
        if (Array.isArray(ans)) return cond.includes_any.some(val => ans.includes(val));
        return cond.includes_any.includes(ans);
    }
    // not_includes_any (array)
    if (cond.question_id && cond.not_includes_any) {
        const ans = answers[cond.question_id];
        if (Array.isArray(ans)) return cond.not_includes_any.every(val => !ans.includes(val));
        return !cond.not_includes_any.includes(ans);
    }
    // not_in (array)
    if (cond.question_id && cond.not_in) {
        const ans = answers[cond.question_id];
        if (Array.isArray(ans)) return cond.not_in.every(val => !ans.includes(val));
        return !cond.not_in.includes(ans);
    }
    // all: array of visible_if conditions (for compound cases)
    if (cond.all && Array.isArray(cond.all)) {
        return cond.all.every(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }
    // any: array of visible_if conditions (for compound cases)
    if (cond.any && Array.isArray(cond.any)) {
        return cond.any.some(subCond => isQuestionVisible({visible_if: subCond}, answers));
    }
    // Default: show
    return true;
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
      if (isDebug()) console.log(`Skipping hidden question at ${idx} (${window.questionOrder[idx]})`);
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

async function fetchWaitlist() {
    let { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching waitlist:', error);
        return [];
    }
    return data; // An array of waitlist entries
}

// Main render function
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
        if (isDebug()) console.log(`renderQuestion: Skipping hidden question idx=${currentIndex}, id=${qId}`);
        currentIndex++;
    }

    window.currentQuestionIndex = currentIndex;

    if (currentIndex >= questionOrder.length) {
        document.getElementById('survey-content').innerHTML = "<div>Encuesta completada.</div>";
        return;
    }

    const qId = questionOrder[currentIndex];
    const question = surveyQuestions.find(q => q.id === qId);

    if (isDebug()) {
        console.log(`Rendering question idx=${currentIndex}, id=${qId}, answers=`, window.answers);
    }

    let optionsHtml = "";

    if (question.type === 'multi_select' || question.type === 'single_choice') {
        question.options.forEach(option => {
            optionsHtml += `
                <div class="option" data-value="${option.value}" onclick="selectOption('${option.value}', ${question.type === 'multi_select'})">
                    ${option.label}
                </div>
            `;
        });
    } else if (question.type === 'slider') {
        optionsHtml = `
            <input type="range" min="${question.min}" max="${question.max}" step="${question.step}" 
                value="${answers[question.id] || question.min}" id="slider-input"
                oninput="document.getElementById('slider-value').innerText = this.value"
                onchange="selectSlider('${question.id}', this.value)">
            <span id="slider-value">${answers[question.id] || question.min}</span>
        `;
    } else {
        optionsHtml = `<div>No options for this question type.</div>`;
    }

    document.getElementById('survey-content').innerHTML = `
        <div class="question">
            <h3>${question.title}</h3>
            ${question.help_text ? `<div class="help-text">${question.help_text}</div>` : ""}
            <div class="options">${optionsHtml}</div>
        </div>
    `;

    // Navigation
    document.getElementById('next-btn').onclick = nextQuestion;
    document.getElementById('back-btn').onclick = previousQuestion;
    document.getElementById('back-btn').style.display = getPrevVisibleIndex(currentIndex) >= 0 ? 'block' : 'none';
    document.getElementById('next-btn').disabled = !(window.answers[qId]);
}

// Handles single/multi-select answers and always skips to next visible
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

    // Move to next visible question!
    window.currentQuestionIndex = getNextVisibleIndex(currentIndex);
    renderQuestion();
};

window.selectSlider = function(qId, value) {
    window.answers[qId] = Number(value);
    if (isDebug()) console.log(`selectSlider: Saved slider for ${qId}:`, window.answers[qId]);
    // Jump to next visible question!
    window.currentQuestionIndex = getNextVisibleIndex(window.currentQuestionIndex);
    renderQuestion();
};

function nextQuestion() {
    window.currentQuestionIndex = getNextVisibleIndex(window.currentQuestionIndex);
    renderQuestion();
}
function previousQuestion() {
    window.currentQuestionIndex = getPrevVisibleIndex(window.currentQuestionIndex);
    renderQuestion();
}

// Waitlist Form Logic
document.addEventListener('DOMContentLoaded', async function() {
    showPage('landing-page');
    window.isProMode = false;

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
