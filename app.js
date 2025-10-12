// Configuration constants
const DATA_PATH = './';
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xldppdop';
const GENERIC_WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Application state (in-memory storage)
let appState = {
    currentScreen: 'landing-page',
    surveyVersion: 'regular',
    currentQuestionIndex: 0,
    answers: {},
    userInfo: {},
    elementScores: {},
    finalResult: null,
    isLoading: true,
    error: null
};

// Data containers
let appData = {
    landingPage: null,
    questions: null,
    decisionMapping: null,
    resultsTemplate: null
};

// Sample JSON data structures (would be loaded from files)
const sampleData = {
    landingPage: {
        hero: {
            title: "Tu ciclo es único. Tu medicina también debería serlo.",
            subtitle: "Conoce los elementos que se mueven en tu cuerpo y cómo equilibrarlos con medicina herbolaria ancestral.",
            primary_cta: "Descubre tu tipo de ciclo"
        },
        value_prop: {
            title: "Medicina herbolaria personalizada, inspirada en los elementos",
            bullets: [
                "🌬️ Diagnóstico energético: identifica tu patrón (calor, frío, humedad, sequedad o tensión)",
                "💡 Explicación clara: por qué tus síntomas se agrupan y qué los equilibra",
                "📅 Guías por fase del ciclo: hábitos, descanso y alimentos que nutren tu tipo"
            ]
        },
        waitlist: {
            title: "🌟 ¡Sé la Primera en Recibir Tu Medicina Personalizada!",
            benefits: [
                "💰 20% de descuento como miembro fundador",
                "🔔 Notificaciones exclusivas de lanzamiento",
                "🎯 Acceso prioritario a tu fórmula personalizada",
                "📚 Guías gratuitas de salud menstrual"
            ],
            launch_date: "Lanzamiento previsto: Primavera 2026"
        }
    },
    
    questions: {
        regular: [
            {
                id: "contraception",
                type: "single",
                title: "¿Usas anticoncepción hormonal actualmente?",
                subtitle: "Esto nos ayuda a entender mejor tu patrón natural.",
                options: [
                    { id: "none", label: "No uso anticoncepción hormonal" },
                    { id: "pill", label: "Píldora anticonceptiva" },
                    { id: "iud_hormonal", label: "DIU hormonal (Mirena, etc.)" },
                    { id: "other_hormonal", label: "Otro método hormonal (parche, anillo, etc.)" }
                ],
                required: true
            },
            {
                id: "cycle_pattern",
                type: "single",
                title: "¿Cómo ha sido tu ciclo en los últimos 3 meses?",
                subtitle: "Piensa en la regularidad y duración general.",
                options: [
                    { id: "regular_normal", label: "Regular, 25-35 días" },
                    { id: "irregular_short", label: "Irregular, ciclos cortos (<25 días)" },
                    { id: "irregular_long", label: "Irregular, ciclos largos (>35 días)" },
                    { id: "very_irregular", label: "Muy irregular, impredecible" },
                    { id: "no_period", label: "No he tenido período" }
                ],
                required: true
            },
            {
                id: "symptoms",
                type: "multiple",
                title: "¿Cuáles son tus síntomas principales?",
                subtitle: "Marca todos los que hayas experimentado en los últimos 3 ciclos.",
                options: [
                    { id: "cramps_severe", label: "Cólicos intensos" },
                    { id: "cramps_mild", label: "Cólicos leves" },
                    { id: "bloating", label: "Hinchazón abdominal" },
                    { id: "mood_swings", label: "Cambios de humor" },
                    { id: "anxiety", label: "Ansiedad" },
                    { id: "fatigue", label: "Fatiga extrema" },
                    { id: "headaches", label: "Dolores de cabeza" },
                    { id: "breast_tenderness", label: "Sensibilidad en los senos" },
                    { id: "food_cravings", label: "Antojos intensos" },
                    { id: "insomnia", label: "Problemas para dormir" }
                ],
                required: true
            },
            {
                id: "flow_details",
                type: "single",
                title: "¿Cómo describirías tu sangrado menstrual?",
                subtitle: "Piensa en el flujo de tus últimos 2-3 períodos.",
                options: [
                    { id: "light_short", label: "Ligero y corto (1-3 días)" },
                    { id: "light_normal", label: "Ligero pero duración normal (4-5 días)" },
                    { id: "moderate", label: "Moderado, flujo normal" },
                    { id: "heavy_clots", label: "Abundante con coágulos" },
                    { id: "heavy_long", label: "Abundante y prolongado (>7 días)" },
                    { id: "spotting_irregular", label: "Sangrado irregular o manchado" }
                ],
                required: true
            },
            {
                id: "body_signs",
                type: "multiple",
                title: "¿Qué señales corporales has notado?",
                subtitle: "Pueden ocurrir en cualquier momento de tu ciclo.",
                options: [
                    { id: "cold_hands_feet", label: "Manos y pies fríos" },
                    { id: "feeling_hot", label: "Sensación de calor interno" },
                    { id: "dry_skin_hair", label: "Piel o cabello secos" },
                    { id: "oily_skin", label: "Piel grasa o con acné" },
                    { id: "water_retention", label: "Retención de líquidos" },
                    { id: "digestive_issues", label: "Problemas digestivos" },
                    { id: "muscle_tension", label: "Tensión muscular" },
                    { id: "joint_pain", label: "Dolor en articulaciones" }
                ]
            },
            {
                id: "emotions",
                type: "multiple",
                title: "¿Cómo te sientes emocionalmente durante tu ciclo?",
                subtitle: "Especialmente en la semana antes y durante tu período.",
                options: [
                    { id: "irritable_angry", label: "Irritable o enojada" },
                    { id: "sad_crying", label: "Triste, con ganas de llorar" },
                    { id: "anxious_worried", label: "Ansiosa o preocupada" },
                    { id: "scattered_unfocused", label: "Dispersa, sin concentración" },
                    { id: "overwhelmed", label: "Abrumada" },
                    { id: "withdrawn", label: "Retraída, quiero estar sola" },
                    { id: "emotionally_stable", label: "Generalmente estable" }
                ]
            },
            {
                id: "energy_pattern",
                type: "single",
                title: "¿Cómo es tu patrón de energía durante el ciclo?",
                subtitle: "Piensa en todo el mes, no solo en tu período.",
                options: [
                    { id: "consistent_good", label: "Energía consistente y buena" },
                    { id: "ups_downs", label: "Altibajos marcados" },
                    { id: "always_tired", label: "Siempre cansada" },
                    { id: "bursts_crashes", label: "Ráfagas de energía seguidas de colapsos" },
                    { id: "low_morning_better_evening", label: "Baja en la mañana, mejor en la noche" }
                ],
                required: true
            },
            {
                id: "timing",
                type: "single",
                title: "¿Cuándo se intensifican más tus síntomas?",
                subtitle: "Si tienes ciclos irregulares, piensa en cuándo fue la última vez.",
                options: [
                    { id: "week_before", label: "La semana antes del período" },
                    { id: "first_days_period", label: "Los primeros días del período" },
                    { id: "throughout_period", label: "Durante todo el período" },
                    { id: "ovulation_time", label: "Alrededor de la ovulación (mitad del ciclo)" },
                    { id: "random_unpredictable", label: "Es impredecible" }
                ],
                required: true
            }
        ],
        
        pro: [] // Additional pro questions would be added here
    },
    
    decisionMapping: {
        elements: ["tension", "calor", "frio", "humedad", "sequedad"],
        weights: {
            // Contraception patterns
            "contraception:none": { "tension": 0, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            "contraception:pill": { "tension": 1, "calor": -1, "frio": 1, "humedad": -1, "sequedad": 1 },
            
            // Cycle patterns
            "cycle_pattern:regular_normal": { "tension": 0, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            "cycle_pattern:irregular_short": { "tension": 2, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 1 },
            "cycle_pattern:irregular_long": { "tension": 1, "calor": 0, "frio": 2, "humedad": 1, "sequedad": 0 },
            "cycle_pattern:very_irregular": { "tension": 3, "calor": 1, "frio": 1, "humedad": 0, "sequedad": 0 },
            "cycle_pattern:no_period": { "tension": 1, "calor": -1, "frio": 2, "humedad": 0, "sequedad": 2 },
            
            // Symptoms
            "symptoms:cramps_severe": { "tension": 2, "calor": 1, "frio": 0, "humedad": 0, "sequedad": 0 },
            "symptoms:cramps_mild": { "tension": 1, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            "symptoms:bloating": { "tension": 0, "calor": 0, "frio": 1, "humedad": 2, "sequedad": 0 },
            "symptoms:mood_swings": { "tension": 2, "calor": 1, "frio": 0, "humedad": 0, "sequedad": 0 },
            "symptoms:anxiety": { "tension": 2, "calor": 1, "frio": 0, "humedad": 0, "sequedad": 1 },
            "symptoms:fatigue": { "tension": 1, "calor": 0, "frio": 2, "humedad": 1, "sequedad": 1 },
            "symptoms:headaches": { "tension": 2, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 1 },
            "symptoms:breast_tenderness": { "tension": 1, "calor": 1, "frio": 0, "humedad": 1, "sequedad": 0 },
            "symptoms:food_cravings": { "tension": 1, "calor": 1, "frio": 1, "humedad": 0, "sequedad": 0 },
            "symptoms:insomnia": { "tension": 2, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 1 },
            
            // Flow details
            "flow_details:light_short": { "tension": 1, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 2 },
            "flow_details:light_normal": { "tension": 0, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 1 },
            "flow_details:moderate": { "tension": 0, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            "flow_details:heavy_clots": { "tension": 0, "calor": 2, "frio": 0, "humedad": 2, "sequedad": 0 },
            "flow_details:heavy_long": { "tension": 1, "calor": 2, "frio": 0, "humedad": 1, "sequedad": 0 },
            "flow_details:spotting_irregular": { "tension": 2, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 1 },
            
            // Body signs
            "body_signs:cold_hands_feet": { "tension": 0, "calor": 0, "frio": 2, "humedad": 0, "sequedad": 1 },
            "body_signs:feeling_hot": { "tension": 0, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 1 },
            "body_signs:dry_skin_hair": { "tension": 1, "calor": 1, "frio": 1, "humedad": 0, "sequedad": 2 },
            "body_signs:oily_skin": { "tension": 0, "calor": 1, "frio": 0, "humedad": 1, "sequedad": 0 },
            "body_signs:water_retention": { "tension": 0, "calor": 0, "frio": 1, "humedad": 2, "sequedad": 0 },
            "body_signs:digestive_issues": { "tension": 1, "calor": 1, "frio": 1, "humedad": 1, "sequedad": 0 },
            "body_signs:muscle_tension": { "tension": 2, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 0 },
            "body_signs:joint_pain": { "tension": 1, "calor": 1, "frio": 1, "humedad": 0, "sequedad": 1 },
            
            // Emotions
            "emotions:irritable_angry": { "tension": 2, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 0 },
            "emotions:sad_crying": { "tension": 1, "calor": 0, "frio": 1, "humedad": 1, "sequedad": 0 },
            "emotions:anxious_worried": { "tension": 2, "calor": 1, "frio": 0, "humedad": 0, "sequedad": 1 },
            "emotions:scattered_unfocused": { "tension": 2, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 1 },
            "emotions:overwhelmed": { "tension": 2, "calor": 1, "frio": 1, "humedad": 1, "sequedad": 0 },
            "emotions:withdrawn": { "tension": 1, "calor": 0, "frio": 1, "humedad": 0, "sequedad": 1 },
            "emotions:emotionally_stable": { "tension": 0, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            
            // Energy patterns
            "energy_pattern:consistent_good": { "tension": 0, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 0 },
            "energy_pattern:ups_downs": { "tension": 2, "calor": 1, "frio": 0, "humedad": 0, "sequedad": 0 },
            "energy_pattern:always_tired": { "tension": 0, "calor": 0, "frio": 2, "humedad": 1, "sequedad": 1 },
            "energy_pattern:bursts_crashes": { "tension": 2, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 1 },
            "energy_pattern:low_morning_better_evening": { "tension": 1, "calor": 0, "frio": 1, "humedad": 1, "sequedad": 0 },
            
            // Timing
            "timing:week_before": { "tension": 1, "calor": 1, "frio": 0, "humedad": 1, "sequedad": 0 },
            "timing:first_days_period": { "tension": 2, "calor": 1, "frio": 1, "humedad": 0, "sequedad": 0 },
            "timing:throughout_period": { "tension": 1, "calor": 1, "frio": 1, "humedad": 1, "sequedad": 0 },
            "timing:ovulation_time": { "tension": 1, "calor": 2, "frio": 0, "humedad": 0, "sequedad": 0 },
            "timing:random_unpredictable": { "tension": 2, "calor": 0, "frio": 0, "humedad": 0, "sequedad": 1 }
        },
        thresholds: {
            tie_breaker: ["calor", "tension", "frio", "humedad", "sequedad"]
        }
    },
    
    resultsTemplate: {
        types: {
            tension: {
                element: "Viento/Aire 🌬️",
                name: "Patrón de Tensión",
                pattern: "Exceso de Viento con espasmo uterino y nervioso",
                summary: "Tu ciclo se caracteriza por variabilidad, espasmos y una energía que se mueve rápidamente. Como el viento, puedes sentirte dispersa y experimentar síntomas que cambian de intensidad.",
                why: "Desde la visión energética, el elemento Viento gobierna el movimiento y los cambios. Cuando está en exceso, puede crear espasmos uterinos (cólicos), irregularidades en el ciclo, y síntomas emocionales como ansiedad o irritabilidad que van y vienen como ráfagas.",
                lifestyle: {
                    folicular: ["Rutinas suaves y consistentes", "Meditación o yoga restaurativo", "Evitar exceso de estimulantes"],
                    ovulatoria: ["Actividades que te centren", "Evitar sobrecarga de actividades", "Mantener horarios regulares"],
                    lutea: ["Priorizar el descanso", "Técnicas de relajación", "Ambientes tranquilos"],
                    menstrual: ["Descanso profundo", "Calor en el abdomen", "Actividades muy suaves"]
                },
                nutrition: ["Alimentos tibios y nutritivos", "Evitar alimentos muy fríos o crudos", "Comidas regulares y no saltarse ninguna", "Grasas saludables para nutrir el sistema nervioso"],
                herbal_actions_preview: [
                    { action: "Antiespasmódica", explain: "Relaja los músculos uterinos y reduce cólicos" },
                    { action: "Nervina calmante", explain: "Calma y centra el sistema nervioso" },
                    { action: "Carminativa", explain: "Mejora la digestión y reduce la hinchazón" }
                ]
            },
            calor: {
                element: "Fuego 🔥",
                name: "Patrón de Calor", 
                pattern: "Exceso de Fuego: calor interno, sangrado abundante",
                summary: "Tu ciclo refleja un exceso de calor interno, que se manifiesta en sangrados abundantes, síntomas intensos y una tendencia al calor y la irritabilidad.",
                why: "El elemento Fuego gobierna la circulación y el metabolismo. En exceso, puede crear períodos muy abundantes, cólicos intensos, irritabilidad, sensación de calor interno y síntomas que aparecen de forma súbita e intensa.",
                lifestyle: {
                    folicular: ["Actividades refrescantes", "Evitar ejercicio muy intenso", "Ambientes frescos"],
                    ovulatoria: ["Moderar la actividad", "Evitar exposición excesiva al sol", "Hidratación abundante"],
                    lutea: ["Actividades calmantes", "Evitar alimentos muy picantes", "Descanso en lugares frescos"],
                    menstrual: ["Compresas frías si hay mucha inflamación", "Reposo", "Evitar baños muy calientes"]
                },
                nutrition: ["Alimentos frescos y hidratantes", "Frutas de temporada", "Evitar picantes y alcohol", "Vegetales de hoja verde", "Agua de coco o infusiones frías"],
                herbal_actions_preview: [
                    { action: "Refrescante", explain: "Reduce el calor interno excesivo" },
                    { action: "Astringente suave", explain: "Ayuda a moderar el sangrado abundante" },
                    { action: "Antiinflamatoria", explain: "Reduce la inflamación y el dolor" }
                ]
            },
            frio: {
                element: "Fuego deficiente ❄️",
                name: "Patrón de Frío",
                pattern: "Deficiencia de Fuego: circulación lenta y retrasos",
                summary: "Tu ciclo muestra signos de deficiencia de calor interno, con tendencia a ciclos largos, sangrado ligero y sensación de frío, especialmente en manos y pies.",
                why: "Cuando el Fuego interno es deficiente, la circulación se vuelve lenta, los ciclos pueden alargarse, el sangrado ser escaso, y puedes sentir frío, fatiga y una energía que tarda en activarse.",
                lifestyle: {
                    folicular: ["Ejercicio suave que genere calor", "Ambientes cálidos", "Actividades que estimulen suavemente"],
                    ovulatoria: ["Continuar con movimiento regular", "Baños tibios", "Exposición moderada al sol"],
                    lutea: ["Mantener el calor corporal", "Actividades reconfortantes", "Ambientes acogedores"],
                    menstrual: ["Calor en abdomen y espalda baja", "Bebidas calientes", "Descanso en ambiente cálido"]
                },
                nutrition: ["Alimentos tibios y cocidos", "Especias suaves (jengibre, canela)", "Evitar alimentos muy fríos", "Sopas y guisos nutritivos", "Tés de hierbas calientes"],
                herbal_actions_preview: [
                    { action: "Estimulante circulatorio", explain: "Mejora la circulación y genera calor interno" },
                    { action: "Tónica uterina", explain: "Fortalece y tonifica el útero" },
                    { action: "Digestiva caliente", explain: "Estimula la digestión y el metabolismo" }
                ]
            },
            humedad: {
                element: "Agua 💧",
                name: "Patrón de Humedad",
                pattern: "Exceso de Agua: pesadez, retención, coágulos",
                summary: "Tu ciclo refleja un exceso de humedad interna, que se manifiesta en retención de líquidos, sensación de pesadez, y posibles coágulos en el sangrado.",
                why: "El elemento Agua gobierna los fluidos corporales. En exceso, puede crear retención de líquidos, hinchazón, sangrados con coágulos, digestión lenta y una sensación general de pesadez y letargo.",
                lifestyle: {
                    folicular: ["Ejercicio que promueva la circulación", "Actividades que generen movimiento", "Evitar ambientes muy húmedos"],
                    ovulatoria: ["Continuar con actividad física regular", "Drenaje linfático suave", "Actividades al aire libre"],
                    lutea: ["Ejercicio suave pero consistente", "Técnicas de drenaje", "Evitar exceso de sal"],
                    menstrual: ["Movimiento muy suave", "Calor seco en abdomen", "Posiciones que favorezcan el drenaje"]
                },
                nutrition: ["Alimentos que drenen suavemente", "Evitar lácteos en exceso", "Vegetales diuréticos suaves", "Granos integrales", "Limitar sal y azúcar refinada"],
                herbal_actions_preview: [
                    { action: "Diurética suave", explain: "Ayuda a drenar el exceso de líquidos" },
                    { action: "Carminativa", explain: "Mejora la digestión y reduce la hinchazón" },
                    { action: "Circulatoria", explain: "Promueve la circulación y el movimiento de fluidos" }
                ]
            },
            sequedad: {
                element: "Agua deficiente 🌵",
                name: "Patrón de Sequedad",
                pattern: "Deficiencia de Agua: flujo escaso, piel/mucosas secas",
                summary: "Tu ciclo muestra signos de deficiencia de fluidos internos, con tendencia a sangrados ligeros, sequedad y síntomas relacionados con la falta de hidratación interna.",
                why: "Cuando el elemento Agua es deficiente, los fluidos corporales se reducen, el sangrado puede ser escaso, la piel y mucosas se resecan, y puede haber síntomas como estreñimiento o sensación de sequedad general.",
                lifestyle: {
                    folicular: ["Hidratación profunda", "Ambientes con humedad adecuada", "Evitar calor excesivo"],
                    ovulatoria: ["Continuar con hidratación", "Actividades suaves en ambientes húmedos", "Evitar sobrecalentamiento"],
                    lutea: ["Hidratación interna y externa", "Humectación de piel", "Ambientes no muy secos"],
                    menstrual: ["Hidratación constante", "Compresas tibias húmedas", "Evitar ambientes muy secos"]
                },
                nutrition: ["Alimentos hidratantes", "Grasas saludables (aguacate, frutos secos)", "Frutas jugosas", "Sopas y caldos", "Evitar alimentos muy salados o deshidratantes"],
                herbal_actions_preview: [
                    { action: "Demulcente", explain: "Suaviza y humecta los tejidos internos" },
                    { action: "Nutritiva", explain: "Nutre profundamente los fluidos corporales" },
                    { action: "Emoliente", explain: "Hidrata y suaviza las mucosas" }
                ]
            }
        }
    }
};

// DOM elements
let elements = {};

// Initialize application
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // Get DOM elements
        elements = {
            loadingScreen: document.getElementById('loading-screen'),
            errorMessage: document.getElementById('error-message'),
            errorText: document.getElementById('error-text'),
            app: document.getElementById('app'),
            progressBar: document.getElementById('progress-bar'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text')
        };

        // Load data (in a real app, these would be fetch calls)
        await loadAppData();
        
        // Initialize screens
        initializeScreens();
        
        // Setup event listeners
        setupEventListeners();
        
        // Render initial screen
        renderLandingPage();
        
        // Hide loading, show app
        hideLoading();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('No se pudo cargar la aplicación. Por favor, recarga la página.');
    }
}

async function loadAppData() {
    // Simulate loading JSON files
    // In a real app: appData.landingPage = await fetch(`${DATA_PATH}landing_page.json`).then(r => r.json());
    appData.landingPage = sampleData.landingPage;
    appData.questions = sampleData.questions;
    appData.decisionMapping = sampleData.decisionMapping;
    appData.resultsTemplate = sampleData.resultsTemplate;
}

function initializeScreens() {
    // Get all screen elements
    elements.screens = {
        landingPage: document.getElementById('landing-page'),
        versionSelection: document.getElementById('version-selection'),
        surveyScreen: document.getElementById('survey-screen'),
        emailCollection: document.getElementById('email-collection'),
        resultsScreen: document.getElementById('results-screen')
    };
}

function setupEventListeners() {
    // Landing page start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', showVersionSelection);
    }
    
    // Version selection
    const versionCards = document.querySelectorAll('.version-card');
    versionCards.forEach(card => {
        const button = card.querySelector('.btn');
        if (button) {
            button.addEventListener('click', (e) => {
                const version = card.dataset.version;
                startSurvey(version);
            });
        }
    });
    
    // Survey navigation
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (backBtn) {
        backBtn.addEventListener('click', goToPreviousQuestion);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextQuestion);
    }
    
    // Email form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmission);
    }
    
    // Retake survey
    const retakeBtn = document.getElementById('retake-survey');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            appState.surveyVersion = 'pro';
            resetSurvey();
            startSurvey('pro');
        });
    }
}

function showScreen(screenId) {
    // Hide all screens
    Object.values(elements.screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = elements.screens[screenId];
    if (targetScreen) {
        targetScreen.classList.add('active');
        appState.currentScreen = screenId;
    }
    
    // Update progress
    updateProgress();
}

function renderLandingPage() {
    const data = appData.landingPage;
    
    // Hero section
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    const startBtnText = document.getElementById('start-btn-text');
    
    if (heroTitle) heroTitle.textContent = data.hero.title;
    if (heroSubtitle) heroSubtitle.textContent = data.hero.subtitle;
    if (startBtnText) startBtnText.textContent = data.hero.primary_cta;
    
    // Value proposition
    const valuePropTitle = document.getElementById('value-prop-title');
    const benefitsGrid = document.getElementById('benefits-grid');
    
    if (valuePropTitle) valuePropTitle.textContent = data.value_prop.title;
    
    if (benefitsGrid) {
        benefitsGrid.innerHTML = data.value_prop.bullets.map(bullet => `
            <div class="benefit-card">
                <p>${bullet}</p>
            </div>
        `).join('');
    }
    
    // Waitlist section
    renderWaitlistSection();
}

function renderWaitlistSection() {
    const data = appData.landingPage.waitlist;
    
    const waitlistTitle = document.getElementById('waitlist-title');
    const waitlistBenefits = document.getElementById('waitlist-benefits');
    const launchDate = document.getElementById('launch-date');
    
    if (waitlistTitle) waitlistTitle.textContent = data.title;
    if (launchDate) launchDate.textContent = data.launch_date;
    
    if (waitlistBenefits) {
        waitlistBenefits.innerHTML = data.benefits.map(benefit => `
            <div class="waitlist-benefit">
                <span>${benefit}</span>
            </div>
        `).join('');
    }
}

function showVersionSelection() {
    showScreen('versionSelection');
}

function startSurvey(version) {
    appState.surveyVersion = version;
    appState.currentQuestionIndex = 0;
    appState.answers = {};
    
    showScreen('surveyScreen');
    renderCurrentQuestion();
}

function renderCurrentQuestion() {
    const questions = appData.questions[appState.surveyVersion];
    const currentQuestion = questions[appState.currentQuestionIndex];
    
    if (!currentQuestion) {
        // No more questions, go to email collection
        showScreen('emailCollection');
        return;
    }
    
    // Update question header
    const questionTitle = document.getElementById('question-title');
    const questionSubtitle = document.getElementById('question-subtitle');
    const questionContent = document.getElementById('question-content');
    const questionHelp = document.getElementById('question-help');
    
    if (questionTitle) questionTitle.textContent = currentQuestion.title;
    if (questionSubtitle) {
        questionSubtitle.textContent = currentQuestion.subtitle || '';
        questionSubtitle.style.display = currentQuestion.subtitle ? 'block' : 'none';
    }
    
    if (questionHelp) {
        questionHelp.textContent = currentQuestion.help || '';
        questionHelp.style.display = currentQuestion.help ? 'block' : 'none';
    }
    
    // Render question content based on type
    if (questionContent) {
        questionContent.innerHTML = renderQuestionByType(currentQuestion);
        
        // Setup question-specific event listeners
        setupQuestionEventListeners(currentQuestion);
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

function renderQuestionByType(question) {
    switch (question.type) {
        case 'single':
            return renderSingleChoiceQuestion(question);
        case 'multiple':
            return renderMultipleChoiceQuestion(question);
        case 'slider':
            return renderSliderQuestion(question);
        default:
            return '<p>Tipo de pregunta no soportado</p>';
    }
}

function renderSingleChoiceQuestion(question) {
    const currentAnswer = appState.answers[question.id];
    
    return `
        <div class="options-grid">
            ${question.options.map(option => `
                <div class="option-card ${currentAnswer === option.id ? 'selected' : ''}" 
                     data-question-id="${question.id}" 
                     data-option-id="${option.id}"
                     tabindex="0"
                     role="button"
                     aria-pressed="${currentAnswer === option.id}">
                    <input type="radio" 
                           name="${question.id}" 
                           value="${option.id}" 
                           id="${question.id}_${option.id}"
                           ${currentAnswer === option.id ? 'checked' : ''}>
                    <label for="${question.id}_${option.id}">${option.label}</label>
                </div>
            `).join('')}
        </div>
    `;
}

function renderMultipleChoiceQuestion(question) {
    const currentAnswers = appState.answers[question.id] || [];
    
    return `
        <div class="options-grid">
            ${question.options.map(option => `
                <div class="option-card ${currentAnswers.includes(option.id) ? 'selected' : ''}" 
                     data-question-id="${question.id}" 
                     data-option-id="${option.id}"
                     tabindex="0"
                     role="button"
                     aria-pressed="${currentAnswers.includes(option.id)}">
                    <input type="checkbox" 
                           name="${question.id}" 
                           value="${option.id}" 
                           id="${question.id}_${option.id}"
                           ${currentAnswers.includes(option.id) ? 'checked' : ''}>
                    <label for="${question.id}_${option.id}">${option.label}</label>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSliderQuestion(question) {
    const currentAnswer = appState.answers[question.id] || question.default || 5;
    
    return `
        <div class="slider-container">
            <input type="range" 
                   class="slider" 
                   id="${question.id}" 
                   min="${question.min || 1}" 
                   max="${question.max || 10}" 
                   value="${currentAnswer}"
                   step="1">
            <div class="slider-labels">
                <span>${question.min_label || 'Mínimo'}</span>
                <span id="${question.id}_value">${currentAnswer}</span>
                <span>${question.max_label || 'Máximo'}</span>
            </div>
        </div>
    `;
}

function setupQuestionEventListeners(question) {
    // Option card clicks
    const optionCards = document.querySelectorAll(`[data-question-id="${question.id}"]`);
    optionCards.forEach(card => {
        card.addEventListener('click', handleOptionSelect);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOptionSelect(e);
            }
        });
    });
    
    // Slider input
    if (question.type === 'slider') {
        const slider = document.getElementById(question.id);
        const valueDisplay = document.getElementById(`${question.id}_value`);
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                valueDisplay.textContent = value;
                appState.answers[question.id] = value;
            });
        }
    }
}

function handleOptionSelect(e) {
    const card = e.currentTarget;
    const questionId = card.dataset.questionId;
    const optionId = card.dataset.optionId;
    const questions = appData.questions[appState.surveyVersion];
    const question = questions.find(q => q.id === questionId);
    
    if (!question) return;
    
    if (question.type === 'single') {
        // Single choice: replace answer
        appState.answers[questionId] = optionId;
        
        // Update UI
        const allCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
        allCards.forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
            const radio = c.querySelector('input[type="radio"]');
            if (radio) radio.checked = false;
        });
        
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        
    } else if (question.type === 'multiple') {
        // Multiple choice: toggle answer
        if (!appState.answers[questionId]) {
            appState.answers[questionId] = [];
        }
        
        const answers = appState.answers[questionId];
        const index = answers.indexOf(optionId);
        
        if (index > -1) {
            // Remove answer
            answers.splice(index, 1);
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        } else {
            // Add answer
            answers.push(optionId);
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = true;
        }
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const questions = appData.questions[appState.surveyVersion];
    const currentQuestion = questions[appState.currentQuestionIndex];
    
    // Back button
    if (backBtn) {
        backBtn.style.display = appState.currentQuestionIndex > 0 ? 'block' : 'none';
    }
    
    // Next button
    if (nextBtn && currentQuestion) {
        const hasAnswer = validateCurrentQuestion(currentQuestion);
        nextBtn.disabled = !hasAnswer;
        nextBtn.textContent = appState.currentQuestionIndex === questions.length - 1 ? 'Terminar' : 'Continuar →';
    }
}

function validateCurrentQuestion(question) {
    const answer = appState.answers[question.id];
    
    if (!question.required) return true;
    
    if (question.type === 'single') {
        return !!answer;
    } else if (question.type === 'multiple') {
        return Array.isArray(answer) && answer.length > 0;
    } else if (question.type === 'slider') {
        return answer !== null && answer !== undefined;
    }
    
    return false;
}

function goToPreviousQuestion() {
    if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--;
        renderCurrentQuestion();
    }
}

function goToNextQuestion() {
    const questions = appData.questions[appState.surveyVersion];
    const currentQuestion = questions[appState.currentQuestionIndex];
    
    if (!validateCurrentQuestion(currentQuestion)) {
        return;
    }
    
    if (appState.currentQuestionIndex < questions.length - 1) {
        appState.currentQuestionIndex++;
        renderCurrentQuestion();
    } else {
        // Finished survey
        showScreen('emailCollection');
    }
}

async function handleEmailSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const consentResults = formData.get('consent-results') === 'on';
    const consentWaitlist = formData.get('consent-waitlist') === 'on';
    
    if (!name || !email || !consentResults) {
        alert('Por favor, completa todos los campos requeridos.');
        return;
    }
    
    // Store user info
    appState.userInfo = { name, email, consentResults, consentWaitlist };
    
    // Calculate results
    calculateResults();
    
    // Show results
    showScreen('resultsScreen');
    renderResults();
    
    // Save to database and send email (async)
    try {
        await saveResponseToDatabase();
        await sendResultsEmail();
        
        if (consentWaitlist) {
            await addToWaitlist();
        }
        
        showSuccessModal();
    } catch (error) {
        console.error('Error saving/sending results:', error);
        // Continue to results screen anyway
    }
}

function calculateResults() {
    const decisionMapping = appData.decisionMapping;
    const elementScores = {};
    
    // Initialize scores
    decisionMapping.elements.forEach(element => {
        elementScores[element] = 0;
    });
    
    // Calculate scores based on answers
    Object.entries(appState.answers).forEach(([questionId, answer]) => {
        if (Array.isArray(answer)) {
            // Multiple choice answers
            answer.forEach(optionId => {
                const key = `${questionId}:${optionId}`;
                const weights = decisionMapping.weights[key];
                if (weights) {
                    Object.entries(weights).forEach(([element, weight]) => {
                        elementScores[element] += weight;
                    });
                }
            });
        } else {
            // Single choice answers
            const key = `${questionId}:${answer}`;
            const weights = decisionMapping.weights[key];
            if (weights) {
                Object.entries(weights).forEach(([element, weight]) => {
                    elementScores[element] += weight;
                });
            }
        }
    });
    
    // Find dominant element
    const maxScore = Math.max(...Object.values(elementScores));
    const dominantElements = Object.entries(elementScores)
        .filter(([element, score]) => score === maxScore)
        .map(([element]) => element);
    
    // Tie breaker
    let finalElement;
    if (dominantElements.length === 1) {
        finalElement = dominantElements[0];
    } else {
        // Use tie breaker order
        for (const element of decisionMapping.thresholds.tie_breaker) {
            if (dominantElements.includes(element)) {
                finalElement = element;
                break;
            }
        }
    }
    
    appState.elementScores = elementScores;
    appState.finalResult = finalElement;
}

function renderResults() {
    const resultData = appData.resultsTemplate.types[appState.finalResult];
    
    if (!resultData) {
        console.error('No result data found for:', appState.finalResult);
        return;
    }
    
    // Element badge
    const elementIcon = document.getElementById('element-icon');
    const elementName = document.getElementById('element-name');
    
    if (elementIcon && elementName) {
        // Extract emoji and name from element string
        const [emoji] = resultData.element.match(/\p{Emoji}/gu) || ['🌿'];
        const name = resultData.element.replace(/\p{Emoji}/gu, '').trim();
        
        elementIcon.textContent = emoji;
        elementName.textContent = name;
    }
    
    // Results header
    const resultsTitle = document.getElementById('results-title');
    const resultsSummary = document.getElementById('results-summary');
    
    if (resultsTitle) resultsTitle.textContent = `Tu patrón: ${resultData.name}`;
    if (resultsSummary) resultsSummary.textContent = resultData.summary;
    
    // Explanation
    const resultsExplanation = document.getElementById('results-explanation');
    if (resultsExplanation) resultsExplanation.textContent = resultData.why;
    
    // Cycle phases
    const cyclePhases = document.getElementById('cycle-phases');
    if (cyclePhases && resultData.lifestyle) {
        cyclePhases.innerHTML = Object.entries(resultData.lifestyle).map(([phase, recommendations]) => `
            <div class="cycle-phase">
                <div class="phase-name">${getPhaseDisplayName(phase)}</div>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }
    
    // Herbal actions
    const herbalActions = document.getElementById('herbal-actions');
    if (herbalActions && resultData.herbal_actions_preview) {
        herbalActions.innerHTML = resultData.herbal_actions_preview.map(action => `
            <div class="herbal-action">
                <div class="action-name">${action.action}</div>
                <div class="action-explanation">${action.explain}</div>
            </div>
        `).join('');
    }
}

function getPhaseDisplayName(phase) {
    const phaseNames = {
        folicular: 'Fase Folicular',
        ovulatoria: 'Fase Ovulatoria', 
        lutea: 'Fase Lútea',
        menstrual: 'Fase Menstrual'
    };
    return phaseNames[phase] || phase;
}

async function saveResponseToDatabase() {
    const payload = {
        timestamp: new Date().toISOString(),
        version: appState.surveyVersion,
        name: appState.userInfo.name,
        email: appState.userInfo.email,
        answers: appState.answers,
        element_scores: appState.elementScores,
        final_type: appState.finalResult,
        consent_waitlist: appState.userInfo.consentWaitlist,
        source: 'quiz',
        meta: {
            user_agent: navigator.userAgent,
            locale: navigator.language
        }
    };
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Supabase save failed');
        }
        
    } catch (error) {
        console.error('Database save error:', error);
        // Fallback: store in memory (could also use IndexedDB)
        console.log('Stored response locally:', payload);
    }
}

async function sendResultsEmail() {
    const resultData = appData.resultsTemplate.types[appState.finalResult];
    const emailContent = generateEmailContent(resultData);
    
    const payload = {
        email: appState.userInfo.email,
        name: appState.userInfo.name,
        subject: `Tus resultados: ${resultData.name}`,
        message: emailContent,
        version: appState.surveyVersion,
        result_type: appState.finalResult
    };
    
    try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Email send failed');
        }
        
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

function generateEmailContent(resultData) {
    return `
¡Hola ${appState.userInfo.name}!

Aquí están los resultados de tu evaluación menstrual personalizada:

🌿 TU PATRÓN: ${resultData.name}
${resultData.element}

📋 RESUMEN:
${resultData.summary}

🔍 ¿POR QUÉ ESTE RESULTADO?
${resultData.why}

📅 RECOMENDACIONES POR FASE:
${Object.entries(resultData.lifestyle || {}).map(([phase, recs]) => 
    `\n${getPhaseDisplayName(phase)}:\n${recs.map(rec => `• ${rec}`).join('\n')}`
).join('\n')}

🌿 ACCIONES HERBALES QUE PODRÍAN AYUDARTE:
${(resultData.herbal_actions_preview || []).map(action => 
    `• ${action.action}: ${action.explain}`
).join('\n')}

${appData.landingPage.waitlist.title}
${appData.landingPage.waitlist.benefits.join('\n')}

${appData.landingPage.waitlist.launch_date}

---
⚠️ AVISO MÉDICO IMPORTANTE:
Este contenido es informativo y no sustituye atención médica. Consulta siempre con un profesional de la salud.

🔒 Tus respuestas se guardan de forma segura y puedes darte de baja en cualquier momento.

¿Sientes que faltaron detalles en tu evaluación? Retoma el quiz en modo Pro para obtener una evaluación más completa.

Con amor,
Equipo colita de rana 🌿
`;
}

async function addToWaitlist() {
    const payload = {
        name: appState.userInfo.name,
        email: appState.userInfo.email,
        source: 'quiz',
        final_type: appState.finalResult
    };
    
    try {
        const response = await fetch(GENERIC_WAITLIST_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Waitlist signup failed');
        }
        
    } catch (error) {
        console.error('Waitlist error:', error);
    }
}

function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function resetSurvey() {
    appState.currentQuestionIndex = 0;
    appState.answers = {};
    appState.elementScores = {};
    appState.finalResult = null;
}

function updateProgress() {
    let progress = 0;
    
    switch (appState.currentScreen) {
        case 'landingPage':
            progress = 0;
            break;
        case 'versionSelection':
            progress = 5;
            break;
        case 'surveyScreen':
            const totalQuestions = appData.questions[appState.surveyVersion].length;
            progress = 10 + ((appState.currentQuestionIndex + 1) / totalQuestions) * 70;
            break;
        case 'emailCollection':
            progress = 85;
            break;
        case 'resultsScreen':
            progress = 100;
            break;
    }
    
    if (elements.progressFill) {
        elements.progressFill.style.width = `${progress}%`;
    }
    if (elements.progressText) {
        elements.progressText.textContent = `${Math.round(progress)}%`;
    }
}

function hideLoading() {
    if (elements.loadingScreen) {
        elements.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    if (elements.app) {
        elements.app.classList.remove('hidden');
        elements.app.classList.add('loaded');
    }
}

function showError(message) {
    if (elements.errorText) {
        elements.errorText.textContent = message;
    }
    
    if (elements.loadingScreen) {
        elements.loadingScreen.style.display = 'none';
    }
    
    if (elements.errorMessage) {
        elements.errorMessage.classList.remove('hidden');
    }
}

// Accessibility enhancements
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeSuccessModal();
    }
});

// Expose global functions for HTML onclick handlers
window.closeSuccessModal = closeSuccessModal;

// Console info for developers
console.log('🌿 Colita de Rana - Menstrual Health Survey App');
console.log('Built with vanilla HTML, CSS, and JavaScript');
console.log('All UI text loaded from JSON data');
console.log('Accessible, responsive, and privacy-focused');