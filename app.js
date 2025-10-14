// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://eithnnxevoqckkzhvnci.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig',
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/xldppdop',
    WAITLIST_WEBHOOK: 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20'
};

// Initialize Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Survey Questions
const SURVEY_QUESTIONS = [
    {
        id: 'P0_contraception',
        title: '¿Usas anticoncepción actualmente? 🛡️',
        type: 'single_choice',
        options: [
            { label: 'Píldora/anillo/parche', value: 'hormonal_sistemica' },
            { label: 'Implante/inyección', value: 'hormonal_larga' },
            { label: 'DIU hormonal', value: 'diu_hormonal' },
            { label: 'DIU de cobre', value: 'diu_cobre' },
            { label: 'Ninguna', value: 'ninguna' },
            { label: 'Otro', value: 'otro' }
        ]
    },
    {
        id: 'P1',
        title: '¿Cómo ha sido tu ciclo en los últimos 3 meses? ⏱️',
        type: 'single_choice',
        options: [
            { label: 'Regular (24–35 días)', value: 'Regular (24–35 días)' },
            { label: 'Irregular (varía >7 días entre ciclos)', value: 'Irregular (varía >7 días entre ciclos)' },
            { label: 'No tengo sangrado actualmente', value: 'No tengo sangrado actualmente' }
        ]
    },
    {
        id: 'P2',
        title: 'En los últimos 3 ciclos, ¿qué síntomas aplican? 🩸',
        type: 'multi_select',
        max_selected: 3,
        options: [
            { label: 'Manchado entre reglas (spotting)', value: 'Manchado entre reglas' },
            { label: 'Sangrado después de relaciones', value: 'Sangrado después de relaciones' },
            { label: 'Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)', value: 'Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)' },
            { label: 'Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)', value: 'Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)' },
            { label: 'Sangrado escaso o ausente', value: 'Sangrado escaso o ausente' },
            { label: 'Dolor o cólicos', value: 'Dolor o cólicos' },
            { label: 'Cambios de humor / ansiedad', value: 'Cambios de humor / ansiedad' },
            { label: 'Hinchazón o retención de líquidos', value: 'Hinchazón o retención de líquidos' },
            { label: 'Fatiga o cansancio extremo', value: 'Fatiga o cansancio extremo' },
            { label: 'Ninguna de las anteriores', value: 'Ninguna de las anteriores' }
        ]
    },
    {
        id: 'P3',
        title: '¿Cuáles de estas señales corporales notas? 🔍',
        type: 'multi_select',
        options: [
            { label: 'Calor, enrojecimiento', value: 'Calor, enrojecimiento' },
            { label: 'Frío en manos/pies', value: 'Frío en manos/pies' },
            { label: 'Lengua hinchada', value: 'Lengua hinchada' },
            { label: 'Lengua pálida', value: 'Lengua pálida' },
            { label: 'Punta de la lengua roja', value: 'Punta de la lengua roja' },
            { label: 'Hinchazón, pesadez, retención', value: 'Hinchazón, pesadez, retención' },
            { label: 'Sequedad (piel, mucosas)', value: 'Sequedad (piel, mucosas)' }
        ]
    }
];

// Element Patterns
const ELEMENT_PATTERNS = {
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
        element: 'Tierra/Agua 💧',
        pattern: 'Exceso de Humedad: pesadez, retención, coágulos',
        characteristics: [
            'Hinchazón/pesadez',
            'Coágulos o flujo espeso',
            'Digestión lenta de grasas',
            'Letargo postcomida',
            'Mejoría con movimiento suave'
        ]
    },
    sequedad: {
        element: 'Agua Deficiente 🌵',
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

// Application State
let currentQuestionIndex = 0;
let surveyResponses = {};
let calculatedElement = null;
let userId = null;

// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    survey: document.getElementById('survey-page'),
    results: document.getElementById('results-page'),
    email: document.getElementById('email-page'),
    waitlist: document.getElementById('waitlist-page'),
    loading: document.getElementById('loading-screen')
};

const elements = {
    startQuiz: document.getElementById('start-quiz'),
    surveyContent: document.getElementById('survey-content'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    resultsContent: document.getElementById('results-content'),
    emailForm: document.getElementById('email-form'),
    waitlistForm: document.getElementById('waitlist-form'),
    waitlistSuccess: document.getElementById('waitlist-success')
};

// Utility Functions
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showPage(pageName) {
    Object.values(pages).forEach(page => {
        if (page) page.classList.remove('active');
    });
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    }
}

function showLoading(show = true) {
    if (show) {
        pages.loading.classList.add('active');
    } else {
        pages.loading.classList.remove('active');
    }
}

// Survey Logic
function renderQuestion(questionIndex) {
    const question = SURVEY_QUESTIONS[questionIndex];
    if (!question) return;

    let optionsHtml = '';
    
    if (question.type === 'single_choice') {
        optionsHtml = question.options.map(option => `
            <div class="survey-option" data-value="${option.value}">
                <input type="radio" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}">${option.label}</label>
            </div>
        `).join('');
    } else if (question.type === 'multi_select') {
        optionsHtml = question.options.map(option => `
            <div class="survey-option" data-value="${option.value}">
                <input type="checkbox" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}">${option.label}</label>
            </div>
        `).join('');
    }

    elements.surveyContent.innerHTML = `
        <div class="survey-question">
            <h2 class="question-title">${question.title}</h2>
            <div class="survey-options">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Add click handlers to options
    const optionElements = elements.surveyContent.querySelectorAll('.survey-option');
    optionElements.forEach(option => {
        option.addEventListener('click', (e) => {
            const input = option.querySelector('input');
            if (question.type === 'single_choice') {
                // Clear other selections
                optionElements.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                input.checked = true;
            } else if (question.type === 'multi_select') {
                // Handle max selection limit
                if (question.max_selected) {
                    const checkedCount = elements.surveyContent.querySelectorAll('input[type="checkbox"]:checked').length;
                    if (!input.checked && checkedCount >= question.max_selected) {
                        e.preventDefault();
                        return;
                    }
                }
                option.classList.toggle('selected');
                input.checked = !input.checked;
            }
            updateNextButtonState();
        });
    });

    updateProgressBar();
    updateNavigationButtons();
    updateNextButtonState();
}

function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / SURVEY_QUESTIONS.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `Pregunta ${currentQuestionIndex + 1} de ${SURVEY_QUESTIONS.length}`;
}

function updateNavigationButtons() {
    elements.prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    elements.nextBtn.textContent = currentQuestionIndex === SURVEY_QUESTIONS.length - 1 ? 'Finalizar' : 'Siguiente';
}

function updateNextButtonState() {
    const question = SURVEY_QUESTIONS[currentQuestionIndex];
    const inputs = elements.surveyContent.querySelectorAll('input');
    const hasSelection = Array.from(inputs).some(input => input.checked);
    elements.nextBtn.disabled = !hasSelection;
}

function collectCurrentResponse() {
    const question = SURVEY_QUESTIONS[currentQuestionIndex];
    const inputs = elements.surveyContent.querySelectorAll('input:checked');
    
    if (question.type === 'single_choice') {
        surveyResponses[question.id] = inputs[0]?.value || null;
    } else if (question.type === 'multi_select') {
        surveyResponses[question.id] = Array.from(inputs).map(input => input.value);
    }
}

// Element Calculation Logic
function calculateElement() {
    let scores = {
        tension: 0,
        calor: 0,
        humedad: 0,
        sequedad: 0
    };

    // Scoring based on responses
    const responses = surveyResponses;

    // P2 symptoms scoring
    if (responses.P2 && Array.isArray(responses.P2)) {
        responses.P2.forEach(symptom => {
            if (symptom.includes('Dolor o cólicos') || symptom.includes('Cambios de humor / ansiedad')) {
                scores.tension += 2;
            }
            if (symptom.includes('rojo brillante') || symptom.includes('calor/sed/irritabilidad')) {
                scores.calor += 3;
            }
            if (symptom.includes('coágulos/espeso') || symptom.includes('Hinchazón') || symptom.includes('pesadez')) {
                scores.humedad += 3;
            }
            if (symptom.includes('escaso o ausente')) {
                scores.sequedad += 3;
            }
            if (symptom.includes('Fatiga')) {
                scores.sequedad += 1;
                scores.tension += 1;
            }
        });
    }

    // P3 physical signs scoring
    if (responses.P3 && Array.isArray(responses.P3)) {
        responses.P3.forEach(sign => {
            if (sign.includes('Calor, enrojecimiento') || sign.includes('Punta de la lengua roja')) {
                scores.calor += 2;
            }
            if (sign.includes('Frío') || sign.includes('Lengua pálida') || sign.includes('Sequedad')) {
                scores.sequedad += 2;
            }
            if (sign.includes('Lengua hinchada') || sign.includes('Hinchazón, pesadez, retención')) {
                scores.humedad += 2;
            }
        });
    }

    // Determine dominant element
    const maxScore = Math.max(...Object.values(scores));
    const dominantElements = Object.keys(scores).filter(key => scores[key] === maxScore);
    
    // If tie, use priority order: calor > humedad > sequedad > tension
    const priority = ['calor', 'humedad', 'sequedad', 'tension'];
    for (const element of priority) {
        if (dominantElements.includes(element)) {
            return element;
        }
    }
    
    return 'tension'; // default
}

function renderResults() {
    const elementKey = calculatedElement;
    const elementData = ELEMENT_PATTERNS[elementKey];
    
    if (!elementData) {
        console.error('Element data not found for:', elementKey);
        return;
    }

    const characteristicsList = elementData.characteristics
        .map(char => `<li>${char}</li>`)
        .join('');

    elements.resultsContent.innerHTML = `
        <div class="element-result">
            <div class="result-element">${elementData.element}</div>
            <h3 class="result-pattern">${elementData.pattern}</h3>
            <ul class="characteristics-list">
                ${characteristicsList}
            </ul>
            <div class="results-actions">
                <button id="get-full-results" class="btn btn--primary btn--lg">
                    Obtener resultados completos por email
                </button>
                <button id="join-waitlist" class="btn btn--secondary btn--lg" style="margin-top: 16px;">
                    Toma la versión PRO
                </button>
            </div>
        </div>
        
        <div class="disclaimer">
            <p><strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional. Consulta siempre con un profesional de la salud para cualquier problema menstrual.</p>
        </div>
    `;

    // Add event listeners
    document.getElementById('get-full-results').addEventListener('click', () => {
        showPage('email');
    });
    
    document.getElementById('join-waitlist').addEventListener('click', () => {
        showPage('waitlist');
    });
}

// Data Persistence
async function saveToSupabase(data) {
    try {
        const { error } = await supabase
            .from('survey_responses')
            .insert([{
                user_id: userId,
                responses: surveyResponses,
                calculated_element: calculatedElement,
                timestamp: new Date().toISOString(),
                ...data
            }]);
        
        if (error) {
            console.error('Supabase error:', error);
        } else {
            console.log('Data saved to Supabase successfully');
        }
    } catch (error) {
        console.error('Error saving to Supabase:', error);
    }
}

// Email Functions
async function sendResultsEmail(name, email) {
    const elementData = ELEMENT_PATTERNS[calculatedElement];
    
    const emailContent = `
        <h2>Tu Perfil Energético - ${elementData.element}</h2>
        <h3>${elementData.pattern}</h3>
        
        <h4>Características de tu patrón:</h4>
        <ul>
            ${elementData.characteristics.map(char => `<li>${char}</li>`).join('')}
        </ul>
        
        <h4>Recomendaciones personalizadas:</h4>
        <p>Basado en tu perfil ${elementData.element}, te recomendamos:</p>
        <ul>
            <li>Observar tus patrones durante los próximos 2-3 ciclos</li>
            <li>Llevar un diario de síntomas y emociones</li>
            <li>Considerar prácticas que equilibren tu elemento dominante</li>
        </ul>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
            <h4>🌟 Únete a la lista de espera</h4>
            <p>Recibe acceso temprano al primer sistema de herbolaria personalizada para tu ciclo menstrual en México.</p>
            <ul>
                <li>💰 Descuento de miembro fundador</li>
                <li>🔔 Notificaciones de lanzamiento</li>
                <li>🎯 Acceso prioritario a tu kit personalizado</li>
                <li>📚 Guías gratuitas de salud menstrual</li>
            </ul>
            <p><strong>Lanzamiento previsto: Primavera 2026</strong></p>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
            <strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional.
        </p>
    `;

    try {
        const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                subject: `Tu Perfil Energético - ${elementData.element}`,
                message: emailContent,
                element: elementData.element,
                pattern: elementData.pattern
            })
        });
        
        if (response.ok) {
            console.log('Email sent successfully');
            return true;
        } else {
            console.error('Email sending failed:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

async function joinWaitlist(name, email) {
    try {
        const response = await fetch(CONFIG.WAITLIST_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                timestamp: new Date().toISOString(),
                source: 'survey_app',
                element_type: calculatedElement
            })
        });
        
        if (response.ok) {
            console.log('Waitlist signup successful');
            return true;
        } else {
            console.error('Waitlist signup failed:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error joining waitlist:', error);
        return false;
    }
}

// Event Listeners
function initializeEventListeners() {
    // Start Quiz
    elements.startQuiz.addEventListener('click', () => {
        userId = generateUserId();
        currentQuestionIndex = 0;
        surveyResponses = {};
        showPage('survey');
        renderQuestion(currentQuestionIndex);
    });

    // Navigation
    elements.nextBtn.addEventListener('click', async () => {
        collectCurrentResponse();
        
        if (currentQuestionIndex < SURVEY_QUESTIONS.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuestionIndex);
        } else {
            // Survey complete
            showLoading(true);
            
            // Calculate element
            calculatedElement = calculateElement();
            
            // Save to Supabase
            await saveToSupabase();
            
            // Show results after delay
            setTimeout(() => {
                showLoading(false);
                renderResults();
                showPage('results');
            }, 2000);
        }
    });

    elements.prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion(currentQuestionIndex);
        }
    });

    // Email Form
    elements.emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        
        if (!name || !email) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        showLoading(true);
        
        // Send email and save user data
        const emailSent = await sendResultsEmail(name, email);
        await saveToSupabase({ name, email, email_sent: emailSent });
        
        showLoading(false);
        
        if (emailSent) {
            alert('¡Resultados enviados! Revisa tu bandeja de entrada.');
            showPage('waitlist');
        } else {
            alert('Hubo un problema al enviar el email. Por favor, intenta de nuevo.');
        }
    });

    // Waitlist Form
    elements.waitlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        
        if (!name || !email) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        showLoading(true);
        
        const success = await joinWaitlist(name, email);
        await saveToSupabase({ waitlist_name: name, waitlist_email: email, waitlist_joined: success });
        
        showLoading(false);
        
        if (success) {
            elements.waitlistForm.style.display = 'none';
            elements.waitlistSuccess.style.display = 'block';
        } else {
            alert('Hubo un problema al unirte a la lista de espera. Por favor, intenta de nuevo.');
        }
    });
}

// Initialize Application
function initializeApp() {
    // Show landing page by default
    showPage('landing');
    
    // Initialize event listeners
    initializeEventListeners();
    
    console.log('Colita de Rana Survey App initialized');
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);