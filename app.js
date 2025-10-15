// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xldppdop';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MAJOR CHANGE 1: REMOVE HARDCODED QUESTIONS AND LOAD FROM JSON =====
// Global data variables (loaded from JSON files)
let surveyData = null;
let surveyQuestions = [];
let questionOrder = [];
let answers = {};
let currentQuestionIndex = 0;


// REPLACED: Hardcoded surveyQuestions object with JSON loading
async function loadSurveyData() {
    const resp = await fetch('survey_questions-combined.json');
    surveyData = await resp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;
}

function isQuestionVisible(question, answers) {
    if (!question.visible_if) return true;
    // Example: visible_if: { question_id: "P1", equals: "No tengo sangrado actualmente" }
    const cond = question.visible_if;
    if (cond.question_id && cond.equals !== undefined) {
        return answers[cond.question_id] === cond.equals;
    }
    // Extend for other types, e.g., includes, all, any
    return true;
}

function showError(message) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; color: red; font-family: Arial;">
            <h2>Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">Reintentar</button>
        </div>
    `;
}

function showLoadingState() {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h2>Cargando datos del quiz...</h2>
            <div style="margin: 20px;">⏳</div>
        </div>
    `;
}

// Element patterns for results (fallback - will be replaced by resultsTemplate)
const elementPatterns = {
    tension: {
        element: 'Viento/Aire 🌬️',
        pattern: 'Exceso de Viento con espasmo uterino y nervioso',
        characteristics: [
            'Dolor cólico o punzante (espasmos)',
            'Síntomas irregulares/cambiantes',
            'Ansiedad, hipervigilancia',
            'Sensibilidad al estrés'
        ]
    },
    calor: {
        element: 'Fuego 🔥',
        pattern: 'Exceso de Fuego: calor interno, sangrado abundante, irritabilidad',
        characteristics: [
            'Flujo rojo brillante/abundante',
            'Sensación de calor/sed/enrojecimiento',
            'Irritabilidad premenstrual',
            'Sueño ligero'
        ]
    },
    humedad: {
        element: 'Tierra ⛰️',
        pattern: 'Exceso de Tierra: pesadez, retención, coágulos',
        characteristics: [
            'Hinchazón/pesadez',
            'Coágulos o flujo espeso',
            'Digestión lenta',
            'Mejora con movimiento suave'
        ]
    },
    sequedad: {
        element: 'Agua 💧',
        pattern: 'Deficiencia de Agua: flujo escaso, piel/mucosas secas, fatiga',
        characteristics: [
            'Sangrado muy escaso o ausente',
            'Sed y sequedad',
            'Cansancio, sueño no reparador',
            'Rigidez articular'
        ]
    }
};

// Global state
let currentQuestionIndex = 0;
let answers = {};
let sessionId = generateSessionId();
let isProMode = false;
let currentMode = null;
let visibleQuestions = [];

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Page navigation functions
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

function startSurvey() {
    if (!allQuestions || allQuestions.length === 0) {
        alert('Los datos del quiz no están listos. Por favor espera un momento.');
        return;
    }
    
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    isProMode = false;
    currentMode = 'regular';
    visibleQuestions = [];
    const indicator = document.getElementById('pro-mode-indicator');
    if (indicator) indicator.style.display = 'none';
    
    // Initialize survey flow
    initializeSurveyFlow('regular');
    renderQuestion();
}

function startProSurvey() {
    if (!allQuestions || allQuestions.length === 0) {
        alert('Los datos del quiz no están listos. Por favor espera un momento.');
        return;
    }
    
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    isProMode = true;
    currentMode = 'pro';
    visibleQuestions = [];
    const indicator = document.getElementById('pro-mode-indicator');
    if (indicator) indicator.style.display = 'block';
    
    // Initialize survey flow
    initializeSurveyFlow('pro');
    renderQuestion();
}

function showWaitlist() {
    showPage('waitlist-page');
}

function scrollToWaitlist() {
    const waitlistSection = document.getElementById('waitlist-section');
    if (waitlistSection) {
        waitlistSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ===== MAJOR CHANGE 2: COMPLETE CONDITIONAL LOGIC ENGINE =====
function evaluateCondition(condition, answers) {
    if (!condition) return true;
    
    console.log('🔍 Evaluating condition:', condition, 'with answers:', answers);
    
    // Handle different condition formats from JSON
    if (condition.question_id || condition.questionid) {
        const questionId = condition.question_id || condition.questionid;
        const answer = answers[questionId];
        
        // Handle 'equals' condition
        if (condition.equals !== undefined || condition.value !== undefined) {
            const expectedValue = condition.equals !== undefined ? condition.equals : condition.value;
            const result = answer === expectedValue;
            console.log(`  📝 Equals check: ${answer} === ${expectedValue} = ${result}`);
            return result;
        }
        
        // Handle 'not_equals' condition
        if (condition.not_equals !== undefined) {
            const result = answer !== condition.not_equals;
            console.log(`  📝 Not equals check: ${answer} !== ${condition.not_equals} = ${result}`);
            return result;
        }
        
        // Handle 'includes' condition (for multi-select)
        if (condition.includes !== undefined) {
            if (Array.isArray(answer)) {
                const result = answer.includes(condition.includes);
                console.log(`  📝 Includes check: ${JSON.stringify(answer)} includes ${condition.includes} = ${result}`);
                return result;
            }
            const result = answer === condition.includes;
            console.log(`  📝 Includes (single) check: ${answer} === ${condition.includes} = ${result}`);
            return result;
        }
        
        // Handle 'not_includes' condition
        if (condition.not_includes !== undefined) {
            if (Array.isArray(answer)) {
                const result = !answer.includes(condition.not_includes);
                console.log(`  📝 Not includes check: ${JSON.stringify(answer)} not includes ${condition.not_includes} = ${result}`);
                return result;
            }
            const result = answer !== condition.not_includes;
            console.log(`  📝 Not includes (single) check: ${answer} !== ${condition.not_includes} = ${result}`);
            return result;
        }
    }
    
    // Handle compound conditions
    if (condition.all) {
        const result = condition.all.every(subCondition => evaluateCondition(subCondition, answers));
        console.log(`  📝 ALL condition result: ${result}`);
        return result;
    }
    
    if (condition.any) {
        const result = condition.any.some(subCondition => evaluateCondition(subCondition, answers));
        console.log(`  📝 ANY condition result: ${result}`);
        return result;
    }
    
    console.log('  📝 Unknown condition format, defaulting to visible');
    return true; // Default to visible if condition not understood
}

// ===== MAJOR CHANGE 3: DYNAMIC QUESTION FILTERING =====
function updateVisibleQuestions() {
    if (!currentMode || !allQuestions.length) {
        console.log('⚠️ Cannot update visible questions: mode or questions not ready');
        return;
    }
    
    console.log(`🔄 Updating visible questions for mode: ${currentMode}`);
    console.log('📊 Current answers:', answers);
    
    visibleQuestions = allQuestions.filter(question => {
        // Check if question supports current mode
        if (question.modes && !question.modes.includes(currentMode)) {
            console.log(`  ❌ Question ${question.id} not available in ${currentMode} mode`);
            return false;
        }
        
        // Check visibility conditions
        if (question.visible_if) {
            const isVisible = evaluateCondition(question.visible_if, answers);
            if (!isVisible) {
                console.log(`  ❌ Question ${question.id} not visible due to conditions`);
                return false;
            }
        }
        
        console.log(`  ✅ Question ${question.id} is visible`);
        return true;
    });
    
    console.log(`📋 Updated visible questions: ${visibleQuestions.length} total`);
    console.log('📝 Question IDs:', visibleQuestions.map(q => q.id));
}

function initializeSurveyFlow(mode) {
    console.log('🚀 Initializing survey flow for mode:', mode);
    currentMode = mode;
    isProMode = (mode === 'pro');
    updateVisibleQuestions();
    currentQuestionIndex = 0;
}

// ===== MAJOR CHANGE 4: DYNAMIC QUESTION RENDERING =====
function renderQuestion() {
    console.log(`🎨 Rendering question ${currentQuestionIndex + 1} of ${visibleQuestions.length}`);
    
    if (!visibleQuestions.length) {
        console.log('⚠️ No visible questions, cannot render');
        finishSurvey();
        return;
    }
    
    if (currentQuestionIndex >= visibleQuestions.length) {
        console.log('✅ All questions completed, finishing survey');
        finishSurvey();
        return;
    }
    
    const question = visibleQuestions[currentQuestionIndex];
    const surveyContent = document.getElementById('survey-content');
    
    if (!question || !surveyContent) {
        console.error('❌ Question or survey content not found');
        return;
    }
    
    console.log(`📄 Rendering question: ${question.id} - ${question.title}`);
    
    let questionHtml = '';
    
    // Handle different question types from JSON
    switch (question.type) {
        case 'single_choice':
        case 'singlechoice':
            questionHtml = renderChoiceQuestion(question, false);
            break;
        case 'multi_select':
        case 'multiselect':
            questionHtml = renderChoiceQuestion(question, true);
            break;
        case 'slider':
            questionHtml = renderSliderQuestion(question);
            break;
        case 'compound':
            questionHtml = renderCompoundQuestion(question);
            break;
        default:
            console.log(`⚠️ Unknown question type: ${question.type}, treating as single choice`);
            questionHtml = renderChoiceQuestion(question, false);
    }
    
    surveyContent.innerHTML = questionHtml;
    
    // Restore previous answers if they exist
    restorePreviousAnswers(question);
    updateProgress();
    updateNavigation();
}

function renderChoiceQuestion(question, isMultiSelect) {
    let optionsHtml = '';
    
    if (!question.options || !Array.isArray(question.options)) {
        console.error('❌ Question has no valid options:', question);
        return '<div class="error">Error: Question options not found</div>';
    }
    
    question.options.forEach((option) => {
        const optionClass = isMultiSelect ? 'option multi-select' : 'option';
        optionsHtml += `
            <div class="${optionClass}" data-value="${option.value}" onclick="selectOption('${option.value}', ${isMultiSelect})">
                ${option.label}
            </div>
        `;
    });
    
    const helpText = question.helptext ? `<p class="help-text">${question.helptext}</p>` : '';
    
    return `
        <div class="question">
            <h3>${question.title}</h3>
            ${helpText}
            <div class="options">
                ${optionsHtml}
            </div>
        </div>
    `;
}

function renderSliderQuestion(question) {
    if (!question.sliders || !Array.isArray(question.sliders)) {
        console.error('❌ Slider question has no sliders:', question);
        return '<div class="error">Error: Slider data not found</div>';
    }
    
    let slidersHtml = '';
    
    question.sliders.forEach((slider) => {
        const currentValue = answers[question.id]?.[slider.id] || slider.min;
        slidersHtml += `
            <div class="slider-group">
                <label class="slider-label">${slider.label}</label>
                <div class="slider-container">
                    <span class="slider-min">${slider.min}</span>
                    <input type="range" class="slider" 
                           id="${slider.id}"
                           min="${slider.min}" 
                           max="${slider.max}" 
                           value="${currentValue}"
                           oninput="updateSliderValue('${slider.id}', this.value)">
                    <span class="slider-max">${slider.max}</span>
                </div>
                <div class="slider-value" id="${slider.id}_value">${currentValue}</div>
            </div>
        `;
    });
    
    return `
        <div class="question">
            <h3>${question.title}</h3>
            <div class="sliders">
                ${slidersHtml}
            </div>
        </div>
    `;
}

function renderCompoundQuestion(question) {
    if (!question.sub_questions || !Array.isArray(question.sub_questions)) {
        console.error('❌ Compound question has no sub_questions:', question);
        return '<div class="error">Error: Sub-questions not found</div>';
    }
    
    let subQuestionsHtml = '';
    
    question.sub_questions.forEach((subQ) => {
        if (!subQ.options) {
            console.error('❌ Sub-question has no options:', subQ);
            return;
        }
        
        const isMulti = subQ.type === 'multi_select' || subQ.type === 'multiselect';
        const subOptionsHtml = subQ.options.map(option =>
            `<div class="option sub-option ${isMulti ? 'multi-select' : ''}" 
                  data-value="${option.value}" 
                  data-sub-id="${subQ.id}" 
                  onclick="selectSubOption('${subQ.id}', '${option.value}', ${isMulti})">
                ${option.label}
            </div>`
        ).join('');
        
        subQuestionsHtml += `
            <div class="sub-question">
                <h4>${subQ.title}</h4>
                <div class="sub-options">
                    ${subOptionsHtml}
                </div>
            </div>
        `;
    });
    
    return `
        <div class="question compound-question">
            <h3>${question.title}</h3>
            <div class="sub-questions">
                ${subQuestionsHtml}
            </div>
        </div>
    `;
}

function restorePreviousAnswers(question) {
    const answer = answers[question.id];
    if (!answer) return;
    
    console.log('🔄 Restoring previous answers for:', question.id, answer);
    
    // Handle different question types
    switch (question.type) {
        case 'single_choice':
        case 'singlechoice':
            const singleOption = document.querySelector(`[data-value="${answer}"]:not([data-sub-id])`);
            if (singleOption) singleOption.classList.add('selected');
            break;
            
        case 'multi_select':
        case 'multiselect':
            if (Array.isArray(answer)) {
                answer.forEach(value => {
                    const option = document.querySelector(`[data-value="${value}"]:not([data-sub-id])`);
                    if (option) option.classList.add('selected');
                });
            }
            break;
            
        case 'slider':
            if (typeof answer === 'object') {
                Object.keys(answer).forEach(sliderId => {
                    const slider = document.getElementById(sliderId);
                    const valueDisplay = document.getElementById(`${sliderId}_value`);
                    if (slider) slider.value = answer[sliderId];
                    if (valueDisplay) valueDisplay.textContent = answer[sliderId];
                });
            }
            break;
            
        case 'compound':
            if (typeof answer === 'object') {
                Object.keys(answer).forEach(subQuestionId => {
                    const subAnswer = answer[subQuestionId];
                    if (Array.isArray(subAnswer)) {
                        subAnswer.forEach(value => {
                            const option = document.querySelector(`[data-sub-id="${subQuestionId}"][data-value="${value}"]`);
                            if (option) option.classList.add('selected');
                        });
                    } else {
                        const option = document.querySelector(`[data-sub-id="${subQuestionId}"][data-value="${subAnswer}"]`);
                        if (option) option.classList.add('selected');
                    }
                });
            }
            break;
    }
}

// ===== MAJOR CHANGE 5: DYNAMIC ANSWER HANDLING =====
function selectOption(value, isMultiSelect) {
    const question = visibleQuestions[currentQuestionIndex];
    
    console.log(`✏️ Selecting option: ${value} (multi: ${isMultiSelect}) for question: ${question.id}`);
    
    if (isMultiSelect) {
        if (!answers[question.id]) {
            answers[question.id] = [];
        }
        
        const currentAnswers = answers[question.id];
        const index = currentAnswers.indexOf(value);
        
        if (index > -1) {
            // Remove if already selected
            currentAnswers.splice(index, 1);
        } else {
            // Add if not selected, check max limit
            const maxSelected = question.max_selected || question.maxselected;
            if (maxSelected && currentAnswers.length >= maxSelected) {
                // Remove first selected option
                const firstSelected = currentAnswers.shift();
                const firstOption = document.querySelector(`[data-value="${firstSelected}"]:not([data-sub-id])`);
                if (firstOption) firstOption.classList.remove('selected');
            }
            currentAnswers.push(value);
        }
        
        // Update visual selection
        const option = document.querySelector(`[data-value="${value}"]:not([data-sub-id])`);
        if (option) option.classList.toggle('selected');
        
    } else {
        answers[question.id] = value;
        
        // Update visual selection
        document.querySelectorAll('.option:not([data-sub-id])').forEach(option => {
            option.classList.remove('selected');
        });
        const selectedOption = document.querySelector(`[data-value="${value}"]:not([data-sub-id])`);
        if (selectedOption) selectedOption.classList.add('selected');
    }
    
    console.log('📊 Updated answers:', answers);
    
    // CRITICAL: Update visible questions after answer changes
    updateVisibleQuestions();
    updateNavigation();
}

function selectSubOption(subQuestionId, value, isMultiSelect) {
    const question = visibleQuestions[currentQuestionIndex];
    
    if (!answers[question.id]) {
        answers[question.id] = {};
    }
    
    if (isMultiSelect) {
        if (!answers[question.id][subQuestionId]) {
            answers[question.id][subQuestionId] = [];
        }
        
        const currentAnswers = answers[question.id][subQuestionId];
        const index = currentAnswers.indexOf(value);
        
        if (index > -1) {
            currentAnswers.splice(index, 1);
        } else {
            currentAnswers.push(value);
        }
        
        const option = document.querySelector(`[data-sub-id="${subQuestionId}"][data-value="${value}"]`);
        if (option) option.classList.toggle('selected');
        
    } else {
        answers[question.id][subQuestionId] = value;
        
        // Clear other selections in this sub-question
        document.querySelectorAll(`[data-sub-id="${subQuestionId}"]`).forEach(option => {
            option.classList.remove('selected');
        });
        const selectedOption = document.querySelector(`[data-sub-id="${subQuestionId}"][data-value="${value}"]`);
        if (selectedOption) selectedOption.classList.add('selected');
    }
    
    console.log('📊 Updated compound answers:', answers);
    updateNavigation();
}

function updateSliderValue(sliderId, value) {
    const question = visibleQuestions[currentQuestionIndex];
    
    if (!answers[question.id]) {
        answers[question.id] = {};
    }
    
    answers[question.id][sliderId] = parseInt(value);
    
    const valueDisplay = document.getElementById(`${sliderId}_value`);
    if (valueDisplay) {
        valueDisplay.textContent = value;
    }
    
    console.log('📊 Updated slider answers:', answers);
    updateNavigation();
}

function updateProgress() {
    const totalQuestions = visibleQuestions.length;
    const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) {
        progressText.textContent = `Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`;
    }
}

function updateNavigation() {
    if (!visibleQuestions.length) return;
    
    const question = visibleQuestions[currentQuestionIndex];
    let hasAnswer = false;
    
    // Check if question has an answer based on type
    const answer = answers[question.id];
    
    switch (question.type) {
        case 'single_choice':
        case 'singlechoice':
            hasAnswer = !!answer;
            break;
        case 'multi_select':
        case 'multiselect':
            hasAnswer = Array.isArray(answer) && answer.length > 0;
            break;
        case 'slider':
            hasAnswer = answer && typeof answer === 'object' && Object.keys(answer).length > 0;
            break;
        case 'compound':
            hasAnswer = answer && typeof answer === 'object' && 
                       question.sub_questions.some(subQ => answer[subQ.id]);
            break;
        default:
            hasAnswer = !!answer;
    }
    
    // For non-required questions, allow proceeding without answer
    if (!question.required) {
        hasAnswer = true;
    }
    
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    
    if (nextBtn) {
        nextBtn.disabled = !hasAnswer;
        nextBtn.style.display = 'block';
    }
    if (backBtn) {
        backBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    }
}

function nextQuestion() {
    console.log(`➡️ Next question (current: ${currentQuestionIndex}, total: ${visibleQuestions.length})`);
    
    if (currentQuestionIndex < visibleQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        finishSurvey();
    }
}

function previousQuestion() {
    console.log(`⬅️ Previous question (current: ${currentQuestionIndex})`);
    
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

// ===== MAJOR CHANGE 6: USE DECISION MAPPING FOR SCORING =====
function calculateResults() {
    console.log('🧮 Calculating results using decision mapping...');
    
    const scores = {
        tension: 0,
        calor: 0,
        frio: 0,
        humedad: 0,
        sequedad: 0
    };

    // Use decision mapping if available, otherwise fallback to hardcoded scoring
    if (decisionMapping && decisionMapping.scoring) {
        console.log('📊 Using decision mapping for scoring');
        
        // Apply scoring rules from decision_mapping
        Object.keys(answers).forEach(questionId => {
            const answer = answers[questionId];
            const questionScoring = decisionMapping.scoring[questionId];
            
            if (!questionScoring || !answer) return;
            
            // Handle different answer types
            if (Array.isArray(answer)) {
                // Multi-select answers
                answer.forEach(value => {
                    const scoreRule = questionScoring.find(rule => rule.value === value);
                    if (scoreRule && scoreRule.scores) {
                        Object.keys(scoreRule.scores).forEach(axis => {
                            scores[axis] += scoreRule.scores[axis];
                        });
                    }
                });
            } else if (typeof answer === 'object') {
                // Compound or slider answers
                Object.keys(answer).forEach(subKey => {
                    const subAnswer = answer[subKey];
                    if (Array.isArray(subAnswer)) {
                        subAnswer.forEach(value => {
                            const scoreRule = questionScoring.find(rule => rule.value === value);
                            if (scoreRule && scoreRule.scores) {
                                Object.keys(scoreRule.scores).forEach(axis => {
                                    scores[axis] += scoreRule.scores[axis];
                                });
                            }
                        });
                    } else {
                        const scoreRule = questionScoring.find(rule => rule.value === subAnswer);
                        if (scoreRule && scoreRule.scores) {
                            Object.keys(scoreRule.scores).forEach(axis => {
                                scores[axis] += scoreRule.scores[axis];
                            });
                        }
                    }
                });
            } else {
                // Single answers
                const scoreRule = questionScoring.find(rule => rule.value === answer);
                if (scoreRule && scoreRule.scores) {
                    Object.keys(scoreRule.scores).forEach(axis => {
                        scores[axis] += scoreRule.scores[axis];
                    });
                }
            }
        });
    } else {
        console.log('⚠️ Using fallback hardcoded scoring');
        
        // Fallback to hardcoded scoring for questions with scores in options
        visibleQuestions.forEach(question => {
            const answer = answers[question.id];
            if (!answer) return;

            const answerArray = Array.isArray(answer) ? answer : [answer];
            answerArray.forEach(value => {
                const option = question.options?.find(opt => opt.value === value);
                if (option?.scores) {
                    Object.keys(option.scores).forEach(key => {
                        scores[key] += option.scores[key];
                    });
                }
            });
        });
    }

    console.log('📊 Calculated scores:', scores);

    // Find dominant pattern
    const patterns = ['tension', 'calor', 'humedad', 'sequedad'];
    let dominantPattern = 'sequedad';
    let maxScore = 0;

    patterns.forEach(pattern => {
        if (scores[pattern] > maxScore) {
            maxScore = scores[pattern];
            dominantPattern = pattern;
        }
    });

    console.log('🎯 Dominant pattern:', dominantPattern);
    return { dominantPattern, scores };
}

// ===== MAJOR CHANGE 7: USE RESULTS TEMPLATE =====
function getResultData(dominantPattern) {
    // Try to use results template first
    if (resultsTemplate && resultsTemplate.bypattern && resultsTemplate.bypattern[dominantPattern]) {
        const templateData = resultsTemplate.bypattern[dominantPattern];
        return {
            element: templateData.element || elementPatterns[dominantPattern]?.element,
            pattern: templateData.patternexplainer || elementPatterns[dominantPattern]?.pattern,
            characteristics: templateData.characteristics || elementPatterns[dominantPattern]?.characteristics || []
        };
    }
    
    // Fallback to hardcoded patterns
    return elementPatterns[dominantPattern] || elementPatterns.sequedad;
}

async function finishSurvey() {
    console.log('🏁 Finishing survey...');
    
    // Show loading
    const loadingModal = document.getElementById('loading-modal');
    if (loadingModal) loadingModal.classList.add('show');

    // Calculate results
    const results = calculateResults();
    const dominantPattern = results.dominantPattern;
    const patternData = getResultData(dominantPattern);
    const scores = results.scores;

    // Save to Supabase
    try {
        await supabase
            .from('survey_responses')
            .insert([{
                session_id: sessionId,
                answers: answers,
                result_pattern: dominantPattern,
                element_scores: scores,
                is_pro_mode: isProMode,
                survey_mode: currentMode,
                total_questions: visibleQuestions.length,
                created_at: new Date().toISOString()
            }]);
        console.log('✅ Results saved to Supabase');
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
    }

    // Hide loading
    setTimeout(() => {
        if (loadingModal) loadingModal.classList.remove('show');
        showResults(patternData, results);
    }, 2000);
}

function showResults(patternData, results) {
    const resultsCard = document.getElementById('results-card');
    if (!resultsCard) return;
    
    const characteristicsHtml = patternData.characteristics
        .map(char => `<li>${char}</li>`)
        .join('');

    const modeTitle = isProMode ? '✨ Resultados PRO - ' : '';

    resultsCard.innerHTML = `
        <h2>${modeTitle}${patternData.element}</h2>
        <h3>${patternData.pattern}</h3>
        <ul class="characteristics">
            ${characteristicsHtml}
        </ul>
        <div class="disclaimer">
            <strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional. 
            Consulta siempre con un profesional de la salud para cualquier problema menstrual.
        </div>
    `;

    showPage('results-page');
}

// Email form handling (keeping existing code)
document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('user-name').value;
            const email = document.getElementById('user-email').value;

            if (!name || !email) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                const response = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        session_id: sessionId,
                        is_pro_mode: isProMode,
                        survey_mode: currentMode,
                        total_questions: visibleQuestions.length,
                        answers_summary: JSON.stringify(answers),
                        message: `Solicitud de resultados completos del quiz Colita de Rana ${isProMode ? '(Versión PRO)' : ''} - ${visibleQuestions.length} preguntas respondidas`
                    })
                });

                if (response.ok) {
                    alert('¡Resultados enviados! Revisa tu email en unos minutos.');
                    
                    await supabase
                        .from('survey_responses')
                        .update({ 
                            user_name: name, 
                            user_email: email,
                            email_sent: true,
                            is_pro_mode: isProMode
                        })
                        .eq('session_id', sessionId);
                        
                    emailForm.reset();
                } else {
                    throw new Error('Error sending email');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error al enviar el email. Por favor intenta de nuevo.');
            }
        });
    }

    // Waitlist form handlers (keeping existing code)
    const setupWaitlistForm = (formId, nameId, emailId, source) => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const name = document.getElementById(nameId).value;
                const email = document.getElementById(emailId).value;

                if (!name || !email) {
                    alert('Por favor completa todos los campos');
                    return;
                }

                try {
                    const response = await fetch(WAITLIST_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: name,
                            email: email,
                            source: source,
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (response.ok) {
                        alert('¡Te has unido a la lista de espera! Te contactaremos pronto.');
                        
                        await supabase
                            .from('waitlist_signups')
                            .insert([{
                                name: name,
                                email: email,
                                source: source,
                                created_at: new Date().toISOString()
                            }]);

                        form.reset();
                    } else {
                        throw new Error('Error joining waitlist');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Hubo un error. Por favor intenta de nuevo.');
                }
            });
        }
    };

    setupWaitlistForm('main-waitlist-form', 'main-waitlist-name', 'main-waitlist-email', 'main_landing');
    setupWaitlistForm('waitlist-form', 'waitlist-name', 'waitlist-email', 'survey_app');
    setupWaitlistForm('results-waitlist-form', 'results-waitlist-name', 'results-waitlist-email', 'results_page');
});

// ===== MAJOR CHANGE 8: INITIALIZE WITH JSON LOADING =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Colita de Rana survey app...');
    
    // Show loading state
    showLoadingState();
    
    // Load all data from JSON files
    const dataLoaded = await loadAllData();
    
    if (!dataLoaded) {
        // Error already shown by loadAllData
        return;
    }
    
    // Restore original HTML by reloading (this preserves the original page structure)
    setTimeout(() => {
        location.reload();
    }, 1000);
    
    // After reload, this will run again but data will be cached
    if (allQuestions.length > 0) {
        showPage('landing-page');
        console.log('✅ App initialized successfully with JSON data');
        console.log(`📊 Loaded ${allQuestions.length} questions from JSON`);
    }
});