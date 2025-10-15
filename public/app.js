// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------------------------------
// ADD THESE GLOBAL FUNCTIONS SO BUTTONS WILL WORK
// ----------------------------------------------------

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

// ----------------------------------------------------
// Survey Data Loading Functions
// ----------------------------------------------------

async function loadSurveyJSON() {
    const resp = await fetch('data/survey_questions-combined.json');
    if (!resp.ok) throw new Error("survey_questions-combined.json not found");
    const surveyData = await resp.json();
    window.surveyQuestions = surveyData.questions;
    window.questionOrder = surveyData.question_order;
}

async function loadDecisionMapping() {
    const resp = await fetch('data/decision_mapping-combined.json');
    if (!resp.ok) throw new Error("decision_mapping-combined.json not found");
    window.decisionMapping = await resp.json();
}

async function loadResultsTemplate() {
    const resp = await fetch('data/results_template.json');
    if (!resp.ok) throw new Error("results_template.json not found");
    window.resultsTemplate = await resp.json();
}

// ----------------------------------------------------
// Survey Rendering and Option Selection
// ----------------------------------------------------

function renderQuestion() {
    const currentIndex = window.currentQuestionIndex || 0;
    const questionOrder = window.questionOrder || [];
    const surveyQuestions = window.surveyQuestions || [];
    const answers = window.answers || {};

    if (!questionOrder.length || !surveyQuestions.length) {
        document.getElementById('survey-content').innerHTML = "<div>No hay preguntas disponibles.</div>";
        return;
    }

    const qId = questionOrder[currentIndex];
    const question = surveyQuestions.find(q => q.id === qId);

    if (!question) {
        document.getElementById('survey-content').innerHTML = "<div>Encuesta completada.</div>";
        return;
    }

    // Build options HTML
    let optionsHtml = "";
    if (question.options && Array.isArray(question.options)) {
        question.options.forEach(option => {
            optionsHtml += `
                <div class="option" data-value="${option.value}" onclick="selectOption('${option.value}', ${question.type === 'multi_select'})">
                    ${option.label}
                </div>
            `;
        });
    }

    document.getElementById('survey-content').innerHTML = `
        <div class="question">
            <h3>${question.title}</h3>
            ${question.help_text ? `<div class="help-text">${question.help_text}</div>` : ""}
            <div class="options">${optionsHtml}</div>
        </div>
    `;
}

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

    // Move to next question
    window.currentQuestionIndex = currentIndex + 1;
    renderQuestion();
};

// ----------------------------------------------------
// Waitlist Form Logic
// ----------------------------------------------------

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

                // Find the name/email input fields in the form
                const nameInput = form.querySelector('input[type="text"], input[name="name"]');
                const emailInput = form.querySelector('input[type="email"], input[name="email"]');
                const name = nameInput ? nameInput.value.trim() : '';
                const email = emailInput ? emailInput.value.trim() : '';

                if (!name || !email) {
                    alert('Por favor ingresa tu nombre y correo.');
                    return;
                }

                // Optionally disable button to prevent double submit
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