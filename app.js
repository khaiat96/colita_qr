// Configuration
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xldppdop';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Survey questions data
const surveyQuestions = [
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
            { label: 'Regular (24–35 días)', value: 'regular' },
            { label: 'Irregular (varía >7 días entre ciclos)', value: 'irregular' },
            { label: 'No tengo sangrado actualmente', value: 'no_sangrado' }
        ]
    },
    {
        id: 'P2',
        title: 'En los últimos 3 ciclos, ¿qué síntomas aplican? 🩸',
        type: 'multi_select',
        max_selected: 3,
        options: [
            { label: 'Manchado entre reglas (spotting)', value: 'spotting', scores: { tension: 1 } },
            { label: 'Sangrado después de relaciones', value: 'sangrado_relaciones', scores: { calor: 1 } },
            { label: 'Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)', value: 'abundante_calor', scores: { calor: 3 } },
            { label: 'Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)', value: 'abundante_humedad', scores: { humedad: 3 } },
            { label: 'Sangrado escaso o ausente', value: 'escaso', scores: { sequedad: 3 } },
            { label: 'Dolor o cólicos', value: 'dolor', scores: { tension: 2 } },
            { label: 'Cambios de humor / ansiedad', value: 'ansiedad', scores: { tension: 2 } },
            { label: 'Hinchazón o retención de líquidos', value: 'hinchazon', scores: { humedad: 2 } },
            { label: 'Fatiga o cansancio extremo', value: 'fatiga', scores: { sequedad: 2 } },
            { label: 'Ninguna de las anteriores', value: 'ninguna', scores: {} }
        ]
    },
    {
        id: 'P3',
        title: '¿Cuáles de estas señales corporales notas? 🔍',
        type: 'multi_select',
        options: [
            { label: 'Calor, enrojecimiento', value: 'calor_enrojecimiento', scores: { calor: 2 } },
            { label: 'Frío en manos/pies', value: 'frio_extremidades', scores: { frio: 2 } },
            { label: 'Lengua hinchada', value: 'lengua_hinchada', scores: { humedad: 1 } },
            { label: 'Lengua pálida', value: 'lengua_palida', scores: { sequedad: 1 } },
            { label: 'Punta de la lengua roja', value: 'lengua_roja', scores: { calor: 1 } },
            { label: 'Hinchazón, pesadez, retención', value: 'hinchazon_pesadez', scores: { humedad: 2 } },
            { label: 'Sequedad (piel, mucosas)', value: 'sequedad_general', scores: { sequedad: 2 } }
        ]
    },
    {
        id: 'P4_energia',
        title: '¿Cómo describirías tu energía general? ⚡',
        type: 'single_choice',
        options: [
            { label: 'Variable/impredecible, como ráfagas', value: 'variable', scores: { tension: 2 } },
            { label: 'Alta/intensa, pero se quema rápido', value: 'intensa', scores: { calor: 2 } },
            { label: 'Estable pero lenta para arrancar', value: 'lenta', scores: { humedad: 2 } },
            { label: 'Baja/agotada, necesito descanso', value: 'baja', scores: { sequedad: 2 } }
        ]
    },
    {
        id: 'P5_digestion',
        title: '¿Cómo es tu digestión habitualmente? 🍽️',
        type: 'single_choice',
        options: [
            { label: 'Irregular, sensible al estrés', value: 'irregular', scores: { tension: 2 } },
            { label: 'Rápida, a veces acidez/hambre intensa', value: 'rapida', scores: { calor: 2 } },
            { label: 'Lenta, pesada después de comer', value: 'lenta', scores: { humedad: 2 } },
            { label: 'Débil, pierdo apetito fácilmente', value: 'debil', scores: { sequedad: 2 } }
        ]
    },
    {
        id: 'P6_sueno',
        title: '¿Cómo duermes normalmente? 😴',
        type: 'single_choice',
        options: [
            { label: 'Irregular, despierto con pensamientos', value: 'irregular', scores: { tension: 2 } },
            { label: 'Ligero, despierto con calor', value: 'ligero', scores: { calor: 2 } },
            { label: 'Profundo pero me cuesta despertar', value: 'pesado', scores: { humedad: 2 } },
            { label: 'Poco reparador, cansancio al despertar', value: 'no_reparador', scores: { sequedad: 2 } }
        ]
    },
    {
        id: 'P7_estres',
        title: '¿Cómo reaccionas ante el estrés? 😰',
        type: 'single_choice',
        options: [
            { label: 'Ansiedad, tensión muscular', value: 'ansiedad', scores: { tension: 3 } },
            { label: 'Irritabilidad, calor, impaciencia', value: 'irritabilidad', scores: { calor: 3 } },
            { label: 'Me vuelvo lenta, busco comodidad', value: 'lenta', scores: { humedad: 3 } },
            { label: 'Agotamiento, ganas de aislarme', value: 'agotamiento', scores: { sequedad: 3 } }
        ]
    }
];

// Element patterns for results
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

// Global state
let currentQuestionIndex = 0;
let answers = {};
let sessionId = generateSessionId();
let isProMode = false;

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Page navigation functions
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function startSurvey() {
    isProMode = false;
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    document.getElementById('pro-mode-indicator').style.display = 'none';
    renderQuestion();
}

function startProSurvey() {
    isProMode = true;
    showPage('survey-page');
    currentQuestionIndex = 0;
    answers = {};
    document.getElementById('pro-mode-indicator').style.display = 'block';
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

// Survey functions
function renderQuestion() {
    const question = surveyQuestions[currentQuestionIndex];
    const surveyContent = document.getElementById('survey-content');

    let optionsHtml = '';

    question.options.forEach((option, index) => {
        const isMultiSelect = question.type === 'multi_select';
        const optionClass = isMultiSelect ? 'option multi-select' : 'option';

        optionsHtml += `
            <div class="${optionClass}" data-value="${option.value}" onclick="selectOption('${option.value}', ${isMultiSelect})">
                ${option.label}
            </div>
        `;
    });

    surveyContent.innerHTML = `
        <div class="question">
            <h3>${question.title}</h3>
            <div class="options">
                ${optionsHtml}
            </div>
        </div>
    `;

    updateProgress();
    updateNavigation();
}

function selectOption(value, isMultiSelect) {
    const question = surveyQuestions[currentQuestionIndex];

    if (isMultiSelect) {
        if (!answers[question.id]) {
            answers[question.id] = [];
        }

        const currentAnswers = answers[question.id];
        const index = currentAnswers.indexOf(value);

        if (index > -1) {
            currentAnswers.splice(index, 1);
        } else {
            if (question.max_selected && currentAnswers.length >= question.max_selected) {
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
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / surveyQuestions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Pregunta ${currentQuestionIndex + 1} de ${surveyQuestions.length}`;
}

function updateNavigation() {
    const question = surveyQuestions[currentQuestionIndex];
    const hasAnswer = answers[question.id] && (
        question.type === 'single_choice' ? 
        answers[question.id] : 
        answers[question.id].length > 0
    );

    document.getElementById('next-btn').disabled = !hasAnswer;
    document.getElementById('back-btn').style.display = currentQuestionIndex > 0 ? 'block' : 'none';
}

function nextQuestion() {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        finishSurvey();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

// Results calculation
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

        answerArray.forEach(value => {
            const option = question.options.find(opt => opt.value === value);
            if (option && option.scores) {
                Object.keys(option.scores).forEach(key => {
                    scores[key] += option.scores[key];
                });
            }
        });
    });

    // Find dominant pattern
    let maxScore = 0;
    let dominantPattern = 'sequedad';

    // Check for main patterns (not frio as it's not a main category)
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
    const pattern = elementPatterns[dominantPattern];

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
        showResults(pattern);
    }, 2000);
}

function showResults(pattern) {
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

// Email form handling
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
                // Send email via Formspree
                const response = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        session_id: sessionId,
                        is_pro_mode: isProMode,
                        message: `Solicitud de resultados completos del quiz Colita de Rana ${isProMode ? '(Versión PRO)' : ''}`
                    })
                });

                if (response.ok) {
                    alert('¡Resultados enviados! Revisa tu email en unos minutos.');
                    // Update Supabase with email info
                    await supabase
                        .from('survey_responses')
                        .update({ 
                            user_name: name, 
                            user_email: email,
                            email_sent: true,
                            is_pro_mode: isProMode
                        })
                        .eq('session_id', sessionId);
                } else {
                    throw new Error('Error sending email');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error al enviar el email. Por favor intenta de nuevo.');
            }
        });
    }

    // Main waitlist form handling (on landing page)
    const mainWaitlistForm = document.getElementById('main-waitlist-form');
    if (mainWaitlistForm) {
        mainWaitlistForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('main-waitlist-name').value;
            const email = document.getElementById('main-waitlist-email').value;

            if (!name || !email) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                // Send to webhook
                const response = await fetch(WAITLIST_WEBHOOK, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        source: 'main_landing',
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    alert('¡Te has unido a la lista de espera! Te contactaremos pronto.');

                    // Save to Supabase
                    await supabase
                        .from('waitlist_signups')
                        .insert([
                            {
                                name: name,
                                email: email,
                                source: 'main_landing',
                                created_at: new Date().toISOString()
                            }
                        ]);

                    // Reset form
                    mainWaitlistForm.reset();
                } else {
                    throw new Error('Error joining waitlist');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error. Por favor intenta de nuevo.');
            }
        });
    }

    // Waitlist form handling (separate page)
    const waitlistForm = document.getElementById('waitlist-form');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('waitlist-name').value;
            const email = document.getElementById('waitlist-email').value;

            if (!name || !email) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                // Send to webhook
                const response = await fetch(WAITLIST_WEBHOOK, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        source: 'survey_app',
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    alert('¡Te has unido a la lista de espera! Te contactaremos pronto.');

                    // Save to Supabase
                    await supabase
                        .from('waitlist_signups')
                        .insert([
                            {
                                name: name,
                                email: email,
                                source: 'survey_app',
                                created_at: new Date().toISOString()
                            }
                        ]);

                    // Reset form
                    waitlistForm.reset();
                } else {
                    throw new Error('Error joining waitlist');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error. Por favor intenta de nuevo.');
            }
        });
    }

    // Results page waitlist form handling
    const resultsWaitlistForm = document.getElementById('results-waitlist-form');
    if (resultsWaitlistForm) {
        resultsWaitlistForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('results-waitlist-name').value;
            const email = document.getElementById('results-waitlist-email').value;

            if (!name || !email) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                // Send to webhook
                const response = await fetch(WAITLIST_WEBHOOK, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        source: 'results_page',
                        is_pro_user: isProMode,
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    alert('¡Te has unido a la lista de espera! Te contactaremos pronto.');

                    // Save to Supabase
                    await supabase
                        .from('waitlist_signups')
                        .insert([
                            {
                                name: name,
                                email: email,
                                source: 'results_page',
                                is_pro_user: isProMode,
                                created_at: new Date().toISOString()
                            }
                        ]);

                    // Reset form
                    resultsWaitlistForm.reset();
                } else {
                    throw new Error('Error joining waitlist');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error. Por favor intenta de nuevo.');
            }
        });
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    showPage('landing-page');
    // Reset pro mode on page load
    isProMode = false;
});