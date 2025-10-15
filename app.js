// Configuration
const CONFIG = {
    DATA_PATH: "./",
    SUPABASE: {
        URL: "https://eithnnxevoqckkzhvnci.supabase.co",
        ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig"
    },
    FORMSPREE: {
        ENDPOINT: "https://formspree.io/f/xldppdop"
    },
    WAITLIST_WEBHOOK: "https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20"
};

// Global State
let appState = {
    currentScreen: 'loading',
    surveyMode: 'regular',
    currentQuestionIndex: 0,
    answers: {},
    surveyData: null,
    decisionMapping: null,
    resultsTemplate: null,
    filteredQuestions: [],
    userName: '',
    userEmail: '',
    results: null
};

// Screen Management
class ScreenManager {
    static showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        appState.currentScreen = screenId;

        // Add fade-in animation
        const activeScreen = document.getElementById(screenId);
        activeScreen.classList.add('fade-in');
        setTimeout(() => activeScreen.classList.remove('fade-in'), 500);
    }

    static showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showScreen('error-screen');
    }
}

// Data Loader
class DataLoader {
    static async loadJSON(filename) {
        try {
            const response = await fetch(CONFIG.DATA_PATH + filename);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            throw error;
        }
    }

    static async loadAllData() {
        try {
            const [surveyData, decisionMapping, resultsTemplate] = await Promise.all([
                this.loadJSON('survey_questions-combined.json'),
                this.loadJSON('decision_mapping-combined.json'),
                this.loadJSON('results_template.json')
            ]);

            appState.surveyData = surveyData;
            appState.decisionMapping = decisionMapping;
            appState.resultsTemplate = resultsTemplate;

            return true;
        } catch (error) {
            throw new Error('Failed to load survey data: ' + error.message);
        }
    }
}

// Question Manager
class QuestionManager {
    static filterQuestionsForMode(mode) {
        const questions = appState.surveyData.questions;
        const questionOrder = appState.surveyData.question_order;

        // Filter questions based on mode and visibility
        const filteredQuestions = questionOrder
            .map(qId => questions.find(q => q.id === qId))
            .filter(q => q && this.isQuestionAvailable(q, mode));

        return filteredQuestions;
    }

    static isQuestionAvailable(question, mode) {
        // Check if question is available for current mode
        if (question.modes && !question.modes.includes(mode)) {
            return false;
        }

        // Check visibility conditions
        if (question.visible_if) {
            return this.evaluateVisibilityCondition(question.visible_if);
        }

        return true;
    }

    static evaluateVisibilityCondition(condition) {
        if (condition.question_id && condition.equals) {
            const answer = appState.answers[condition.question_id];
            return answer === condition.equals;
        }

        if (condition.question_id && condition.includes) {
            const answer = appState.answers[condition.question_id];
            if (Array.isArray(answer)) {
                return condition.includes.some(val => answer.includes(val));
            }
            return condition.includes.includes(answer);
        }

        if (condition.any) {
            return condition.any.some(cond => this.evaluateVisibilityCondition(cond));
        }

        if (condition.all) {
            return condition.all.every(cond => this.evaluateVisibilityCondition(cond));
        }

        return true;
    }

    static getCurrentQuestion() {
        // Recalculate filtered questions to handle conditional visibility
        appState.filteredQuestions = this.filterQuestionsForMode(appState.surveyMode);

        if (appState.currentQuestionIndex < appState.filteredQuestions.length) {
            return appState.filteredQuestions[appState.currentQuestionIndex];
        }
        return null;
    }
}

// Survey Renderer
class SurveyRenderer {
    static renderQuestion(question) {
        if (!question) {
            SurveyController.finishSurvey();
            return;
        }

        // Update progress
        const progress = ((appState.currentQuestionIndex + 1) / appState.filteredQuestions.length) * 100;
        document.querySelector('.progress-fill').style.width = progress + '%';
        document.getElementById('current-question').textContent = appState.currentQuestionIndex + 1;
        document.getElementById('total-questions').textContent = appState.filteredQuestions.length;

        // Update question content
        document.getElementById('question-title').textContent = question.title || '';
        document.getElementById('question-help').textContent = question.help_text || '';

        // Render options based on question type
        const optionsContainer = document.getElementById('question-options');
        optionsContainer.innerHTML = '';

        switch (question.type) {
            case 'single_choice':
                this.renderSingleChoice(question, optionsContainer);
                break;
            case 'multi_select':
                this.renderMultiSelect(question, optionsContainer);
                break;
            case 'slider':
                this.renderSlider(question, optionsContainer);
                break;
            case 'compound':
                this.renderCompound(question, optionsContainer);
                break;
            case 'grouped':
                this.renderGrouped(question, optionsContainer);
                break;
            default:
                console.warn('Unknown question type:', question.type);
        }

        // Update navigation
        document.getElementById('prev-btn').disabled = appState.currentQuestionIndex === 0;

        // Update mode switch button
        const modeSwitchBtn = document.getElementById('mode-switch-btn');
        modeSwitchBtn.textContent = appState.surveyMode === 'regular' ? 'Cambiar a Pro' : 'Cambiar a rápida';
    }

    static renderSingleChoice(question, container) {
        question.options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.innerHTML = `
                <input type="radio" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}" class="option-text">${option.label}</label>
            `;

            // Set selected state
            if (appState.answers[question.id] === option.value) {
                optionEl.classList.add('selected');
                optionEl.querySelector('input').checked = true;
            }

            optionEl.addEventListener('click', () => {
                // Remove previous selection
                container.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));

                // Add selection to clicked option
                optionEl.classList.add('selected');
                optionEl.querySelector('input').checked = true;

                // Store answer
                appState.answers[question.id] = option.value;
            });

            container.appendChild(optionEl);
        });
    }

    static renderMultiSelect(question, container) {
        question.options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.innerHTML = `
                <input type="checkbox" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}" class="option-text">${option.label}</label>
            `;

            // Set selected state
            const currentAnswers = appState.answers[question.id] || [];
            if (currentAnswers.includes(option.value)) {
                optionEl.classList.add('selected');
                optionEl.querySelector('input').checked = true;
            }

            optionEl.addEventListener('click', () => {
                const checkbox = optionEl.querySelector('input');
                const isChecked = !checkbox.checked;

                checkbox.checked = isChecked;
                optionEl.classList.toggle('selected', isChecked);

                // Update answers array
                let answers = appState.answers[question.id] || [];
                if (isChecked) {
                    answers.push(option.value);
                } else {
                    answers = answers.filter(a => a !== option.value);
                }
                appState.answers[question.id] = answers;

                // Check validation limits
                const validation = question.validation;
                if (validation && validation.max_selected && answers.length > validation.max_selected) {
                    // Remove oldest selection
                    const firstChecked = container.querySelector('.option.selected input');
                    if (firstChecked) {
                        firstChecked.closest('.option').click();
                    }
                }
            });

            container.appendChild(optionEl);
        });
    }

    static renderSlider(question, container) {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.min = question.min || 0;
        slider.max = question.max || 10;
        slider.step = question.step || 1;
        slider.value = appState.answers[question.id] || question.min || 0;

        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'slider-value';
        valueDisplay.textContent = slider.value;

        const labels = document.createElement('div');
        labels.className = 'slider-labels';
        labels.innerHTML = `<span>${slider.min}</span><span>${slider.max}</span>`;

        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
            appState.answers[question.id] = parseInt(e.target.value);
        });

        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        sliderContainer.appendChild(labels);
        container.appendChild(sliderContainer);

        // Store initial value
        appState.answers[question.id] = parseInt(slider.value);
    }

    static renderCompound(question, container) {
        // Handle compound questions by rendering each item
        question.items.forEach((item, index) => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'compound-item';

            const title = document.createElement('h4');
            title.textContent = item.title;
            itemContainer.appendChild(title);

            if (item.help_text) {
                const help = document.createElement('p');
                help.className = 'help-text';
                help.textContent = item.help_text;
                itemContainer.appendChild(help);
            }

            // Render based on item type
            const itemQuestion = { ...item, id: item.id };
            const itemOptionsContainer = document.createElement('div');

            switch (item.type) {
                case 'slider':
                    this.renderSlider(itemQuestion, itemOptionsContainer);
                    break;
                case 'single_choice':
                    this.renderSingleChoice(itemQuestion, itemOptionsContainer);
                    break;
                case 'multi_select':
                    this.renderMultiSelect(itemQuestion, itemOptionsContainer);
                    break;
            }

            itemContainer.appendChild(itemOptionsContainer);
            container.appendChild(itemContainer);
        });
    }

    static renderGrouped(question, container) {
        // Similar to compound, but with grouped styling
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = question.title;
        container.appendChild(groupTitle);

        question.questions.forEach(subQuestion => {
            this.renderCompound({ items: [subQuestion] }, container);
        });
    }
}

// Scoring Engine
class ScoringEngine {
    static calculateScores() {
        const scores = {
            tension: 0,
            calor: 0,
            frio: 0,
            humedad: 0,
            sequedad: 0
        };

        const mapping = appState.decisionMapping;

        // Apply basic scoring rules
        Object.entries(appState.answers).forEach(([questionId, answer]) => {
            const questionScoring = mapping.scoring[questionId];
            if (!questionScoring) return;

            questionScoring.forEach(rule => {
                if (this.matchesRule(rule, answer)) {
                    Object.entries(rule.scores).forEach(([axis, points]) => {
                        if (scores.hasOwnProperty(axis)) {
                            scores[axis] += points;
                        }
                    });
                }
            });
        });

        // Apply additive scoring for sliders
        if (mapping.additive_scoring) {
            mapping.additive_scoring.forEach(rule => {
                const value = appState.answers[rule.question_id];
                if (typeof value === 'number') {
                    const range = rule.range_map.find(r => value >= r.min && value <= r.max);
                    if (range) {
                        Object.entries(range.scores).forEach(([axis, points]) => {
                            scores[axis] += points;
                        });
                    }
                }
            });
        }

        return scores;
    }

    static matchesRule(rule, answer) {
        if (rule.value === answer) return true;
        if (Array.isArray(answer) && answer.includes(rule.value)) return true;
        return false;
    }

    static determinePattern(scores) {
        // Find top scoring axes
        const sortedAxes = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .filter(([,score]) => score > 0);

        if (sortedAxes.length === 0) {
            return { primary: 'calor', secondary: null, mixed: false, confidence: 'low' };
        }

        const [primary, primaryScore] = sortedAxes[0];
        const confidence = this.calculateConfidence(scores, sortedAxes);

        // Check for mixed patterns
        if (sortedAxes.length > 1) {
            const [secondary, secondaryScore] = sortedAxes[1];
            const margin = primaryScore - secondaryScore;

            if (margin <= 2 && secondaryScore >= 3) {
                return {
                    primary,
                    secondary,
                    mixed: true,
                    confidence,
                    scores
                };
            }
        }

        return {
            primary,
            secondary: null,
            mixed: false,
            confidence,
            scores
        };
    }

    static calculateConfidence(scores, sortedAxes) {
        if (sortedAxes.length < 2) return 'low';

        const margin = sortedAxes[0][1] - sortedAxes[1][1];
        if (margin >= 4) return 'high';
        if (margin >= 2) return 'medium';
        return 'low';
    }
}

// Results Generator
class ResultsGenerator {
    static generateResults(pattern) {
        const template = appState.resultsTemplate;
        const patternKey = pattern.mixed ? 
            `${pattern.primary}_${pattern.secondary}` : 
            pattern.primary;

        // Build results object
        const results = {
            pattern: patternKey,
            primary: pattern.primary,
            secondary: pattern.secondary,
            mixed: pattern.mixed,
            confidence: pattern.confidence,
            scores: pattern.scores,
            content: this.buildResultsContent(patternKey, template)
        };

        return results;
    }

    static buildResultsContent(patternKey, template) {
        const content = {
            header: template.header,
            summary: this.buildSummary(patternKey, template),
            element: this.getElement(patternKey, template),
            pattern_card: this.getPatternCard(patternKey, template),
            why_cluster: this.getWhyCluster(patternKey, template),
            phase_tips: this.getPhaseTips(patternKey, template),
            care_tips: this.getCareTips(patternKey, template)
        };

        return content;
    }

    static buildSummary(patternKey, template) {
        const labels = template.labels;
        const parts = patternKey.split('_');

        if (parts.length > 1) {
            return `Tu tipo de ciclo: ${labels[parts[0]]} + ${labels[parts[1]]}`;
        } else {
            return `Tu tipo de ciclo: ${labels[patternKey]}`;
        }
    }

    static getElement(patternKey, template) {
        return template.element.by_pattern[patternKey] || 
               template.element.by_pattern[patternKey.split('_')[0]] || 
               ['Elemento no definido'];
    }

    static getPatternCard(patternKey, template) {
        const patterns = template.pattern_card;

        if (patternKey.includes('_')) {
            return patterns.mixed_pairs[patternKey];
        } else {
            return patterns.single[patternKey];
        }
    }

    static getWhyCluster(patternKey, template) {
        return template.why_cluster.by_pattern[patternKey] || 
               template.why_cluster.by_pattern[patternKey.split('_')[0]] || 
               ['Explicación no disponible'];
    }

    static getPhaseTips(patternKey, template) {
        // Return phase-specific tips based on pattern
        return template.phase || {};
    }

    static getCareTips(patternKey, template) {
        // Return care tips based on pattern
        return [];
    }
}

// Survey Controller
class SurveyController {
    static nextQuestion() {
        const currentQuestion = QuestionManager.getCurrentQuestion();

        // Validate current question if required
        if (currentQuestion && !this.validateCurrentQuestion(currentQuestion)) {
            return;
        }

        appState.currentQuestionIndex++;
        const nextQuestion = QuestionManager.getCurrentQuestion();

        if (nextQuestion) {
            SurveyRenderer.renderQuestion(nextQuestion);
        } else {
            this.finishSurvey();
        }
    }

    static prevQuestion() {
        if (appState.currentQuestionIndex > 0) {
            appState.currentQuestionIndex--;
            const prevQuestion = QuestionManager.getCurrentQuestion();
            SurveyRenderer.renderQuestion(prevQuestion);
        }
    }

    static validateCurrentQuestion(question) {
        const answer = appState.answers[question.id];

        // Check required fields
        if (question.required && (!answer || answer === '')) {
            alert('Por favor responde esta pregunta antes de continuar.');
            return false;
        }

        // Check validation rules
        if (question.validation) {
            const validation = question.validation;

            if (Array.isArray(answer)) {
                if (validation.min_selected && answer.length < validation.min_selected) {
                    alert(`Selecciona al menos ${validation.min_selected} opciones.`);
                    return false;
                }
                if (validation.max_selected && answer.length > validation.max_selected) {
                    alert(`Selecciona máximo ${validation.max_selected} opciones.`);
                    return false;
                }
            }
        }

        return true;
    }

    static finishSurvey() {
        ScreenManager.showScreen('contact-screen');
    }

    static switchMode() {
        const newMode = appState.surveyMode === 'regular' ? 'pro' : 'regular';
        appState.surveyMode = newMode;

        // Reset question index and refilter questions
        appState.currentQuestionIndex = 0;
        appState.filteredQuestions = QuestionManager.filterQuestionsForMode(newMode);

        // Render first question of new mode
        const firstQuestion = QuestionManager.getCurrentQuestion();
        SurveyRenderer.renderQuestion(firstQuestion);

        // Show toast notification
        const message = newMode === 'pro' ? 
            'Listo. Guardamos tus respuestas y cambiamos a Survey Pro.' :
            'Listo. Guardamos tus respuestas y cambiamos a la encuesta rápida.';
        this.showToast(message);
    }

    static showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-green);
            color: white;
            padding: 1rem;
            border-radius: var(--border-radius);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// API Manager
class APIManager {
    static async saveToSupabase(data) {
        try {
            const response = await fetch(`${CONFIG.SUPABASE.URL}/rest/v1/survey_responses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE.ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
                },
                body: JSON.stringify({
                    user_name: data.name,
                    user_email: data.email,
                    survey_mode: data.mode,
                    answers: data.answers,
                    results: data.results,
                    created_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Supabase error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase save error:', error);
            // Don't throw - continue with email sending even if DB save fails
        }
    }

    static async sendEmail(data) {
        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('email', data.email);
            formData.append('results_html', data.resultsHtml);
            formData.append('pattern', data.results.pattern);

            const response = await fetch(CONFIG.FORMSPREE.ENDPOINT, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Email error: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Email send error:', error);
            throw error;
        }
    }

    static async joinWaitlist(email) {
        try {
            const response = await fetch(CONFIG.WAITLIST_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error(`Waitlist error: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Waitlist error:', error);
            throw error;
        }
    }
}

// Initialize App
class App {
    static async init() {
        try {
            // Load survey data
            await DataLoader.loadAllData();

            // Setup event listeners
            this.setupEventListeners();

            // Show welcome screen
            ScreenManager.showScreen('welcome-screen');

        } catch (error) {
            console.error('App initialization error:', error);
            ScreenManager.showError('Error al cargar el quiz. Por favor intenta de nuevo.');
        }
    }

    static setupEventListeners() {
        // Mode selection
        document.getElementById('regular-mode').addEventListener('click', () => {
            appState.surveyMode = 'regular';
            this.startSurvey();
        });

        document.getElementById('pro-mode').addEventListener('click', () => {
            appState.surveyMode = 'pro';
            this.startSurvey();
        });

        // Survey navigation
        document.getElementById('next-btn').addEventListener('click', () => {
            SurveyController.nextQuestion();
        });

        document.getElementById('prev-btn').addEventListener('click', () => {
            SurveyController.prevQuestion();
        });

        // Mode switching
        document.getElementById('mode-switch-btn').addEventListener('click', () => {
            SurveyController.switchMode();
        });

        // Contact form
        document.getElementById('contact-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleContactSubmission();
        });

        // Waitlist form
        document.getElementById('waitlist-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleWaitlistSubmission(e);
        });

        // Action buttons
        document.getElementById('pro-upgrade-btn').addEventListener('click', () => {
            if (appState.surveyMode === 'regular') {
                appState.surveyMode = 'pro';
                appState.currentQuestionIndex = 0;
                appState.filteredQuestions = QuestionManager.filterQuestionsForMode('pro');
                const firstQuestion = QuestionManager.getCurrentQuestion();
                SurveyRenderer.renderQuestion(firstQuestion);
                ScreenManager.showScreen('survey-screen');
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    static startSurvey() {
        // Filter questions for selected mode
        appState.filteredQuestions = QuestionManager.filterQuestionsForMode(appState.surveyMode);
        appState.currentQuestionIndex = 0;

        // Show first question
        const firstQuestion = QuestionManager.getCurrentQuestion();
        SurveyRenderer.renderQuestion(firstQuestion);

        ScreenManager.showScreen('survey-screen');
    }

    static async handleContactSubmission() {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();

        if (!name || !email) {
            alert('Por favor completa todos los campos.');
            return;
        }

        appState.userName = name;
        appState.userEmail = email;

        // Calculate results
        const scores = ScoringEngine.calculateScores();
        const pattern = ScoringEngine.determinePattern(scores);
        const results = ResultsGenerator.generateResults(pattern);

        appState.results = results;

        // Show results
        this.displayResults(results);

        // Save data and send email in background
        this.saveAndSendData({
            name,
            email,
            mode: appState.surveyMode,
            answers: appState.answers,
            results
        });
    }

    static displayResults(results) {
        const container = document.getElementById('results-content');
        const content = results.content;

        container.innerHTML = `
            <div class="results-header">
                <h1>${content.header.title}</h1>
                <div class="cycle-type">${content.summary}</div>
                <div class="element-badge">${content.element[0]}</div>
            </div>

            <div class="results-section">
                <h3>Tu Patrón Menstrual</h3>
                <p><strong>${content.pattern_card?.pattern_explainer || 'Descripción del patrón'}</strong></p>
                <ul class="characteristics-list">
                    ${content.pattern_card?.characteristics?.map(char => `<li>${char}</li>`).join('') || ''}
                </ul>
            </div>

            <div class="results-section">
                <h3>¿Por qué se agrupan tus síntomas?</h3>
                <p>${content.why_cluster[0] || 'Explicación no disponible'}</p>
            </div>

            <div class="results-section">
                <h3>Tips de Cuidado</h3>
                <div class="tips-grid">
                    <div class="tip-card">
                        <h4>🌙 Durante tu periodo</h4>
                        <ul>
                            <li>Descanso y nutrición profunda</li>
                            <li>Caldos minerales y proteína fácil</li>
                            <li>Calor local si hay dolor</li>
                        </ul>
                    </div>
                    <div class="tip-card">
                        <h4>🌱 Entre periodos</h4>
                        <ul>
                            <li>Movimiento suave regular</li>
                            <li>Alimentos según tu patrón</li>
                            <li>Manejo de estrés personalizado</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Hide pro upgrade button if already in pro mode
        const proBtn = document.getElementById('pro-upgrade-btn');
        if (appState.surveyMode === 'pro') {
            proBtn.style.display = 'none';
        }

        ScreenManager.showScreen('results-screen');
    }

    static async saveAndSendData(data) {
        try {
            // Save to Supabase
            await APIManager.saveToSupabase(data);

            // Generate results HTML for email
            const resultsHtml = this.generateResultsHTML(data.results);

            // Send email
            await APIManager.sendEmail({
                ...data,
                resultsHtml
            });

        } catch (error) {
            console.error('Error saving/sending data:', error);
            // Don't show error to user - results are already displayed
        }
    }

    static generateResultsHTML(results) {
        // Generate a simple HTML version of results for email
        return `
            <h2>Tus Resultados - Colita de Rana</h2>
            <h3>${results.content.summary}</h3>
            <p><strong>Elemento:</strong> ${results.content.element[0]}</p>
            <p>${results.content.why_cluster[0]}</p>
            <p>¡Gracias por usar nuestro quiz! Únete a nuestra lista de espera para acceso temprano.</p>
        `;
    }

    static async handleWaitlistSubmission(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email');

        if (!email) {
            alert('Por favor ingresa tu email.');
            return;
        }

        try {
            await APIManager.joinWaitlist(email);
            alert('¡Te has unido a la lista de espera! Te contactaremos pronto.');
            e.target.reset();
        } catch (error) {
            alert('Error al unirse a la lista. Intenta de nuevo.');
        }
    }

    static restart() {
        // Reset app state
        appState.currentQuestionIndex = 0;
        appState.answers = {};
        appState.userName = '';
        appState.userEmail = '';
        appState.results = null;

        // Show welcome screen
        ScreenManager.showScreen('welcome-screen');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});