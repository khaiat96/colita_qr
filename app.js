/*
 * Colita de rana – Menstrual Health Survey
 *
 * This vanilla JS file powers a single‑page survey application. It reads all
 * display strings and questions from JSON files in the `data/` folder so
 * translations or copy changes can be made without touching code. The
 * application flows from a welcome screen into a multi‑step survey,
 * collects name/email at the end, calculates a personalized elemental
 * “tipo de ciclo”, saves the response to Supabase and Formspree, and
 * finally displays results along with gentle lifestyle/nutrition tips.
 *
 * Accessibility features include keyboard navigable options (chips), focus
 * outlines, and semantic form elements. No medical claims are made.
 */

// Define endpoints and constants. Supabase and webhook keys are public anon
// keys suitable for client‑side use. Do not expose any secret keys here.
const DATA_PATH = './data/';
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xldppdop';
const GENERIC_WAITLIST_WEBHOOK = 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20';

// Global state
let copyData = null;        // Strings for UI
let questionsData = null;    // Questions for current survey
let scoringData = null;      // Weights for scoring
let resultsData = null;      // Texts for results
let currentMode = 'regular'; // 'regular' or 'pro'
let currentQuestionIndex = 0;
let answers = {};            // Stores answers keyed by question id
let elementScores = {};       // Accumulates scores for each element

// Cached DOM reference
const appRoot = document.getElementById('app');

/**
 * Fetch a JSON file from the data directory. If the file cannot be read
 * (e.g. missing or malformed), the promise will reject with a helpful error.
 * @param {string} filename Name of the JSON file under DATA_PATH
 */
async function fetchJSON(filename) {
  const url = DATA_PATH + filename;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Error al cargar ${filename}: ${response.status}`);
  }
  return response.json();
}

/**
 * Initialise the application by loading UI copy. On success the landing
 * screen is rendered. If copy cannot be loaded the user is informed.
 */
async function init() {
  try {
    copyData = await fetchJSON('copy.json');
    scoringData = await fetchJSON('scoring.json');
    resultsData = await fetchJSON('results.json');
    renderLanding();
  } catch (err) {
    console.error(err);
    appRoot.innerHTML = `<p>No se pudo cargar el contenido. Intenta recargar la página.</p>`;
  }
}

/**
 * Render the landing/welcome screen with a CTA to start the quiz. All text
 * comes from copy.json (app.title, app.subtitle, app.disclaimer and CTA).
 */
function renderLanding() {
  // Reset state
  currentQuestionIndex = 0;
  answers = {};
  currentMode = 'regular';

  const { app, cta, footer } = copyData;
  appRoot.innerHTML = '';
  const container = document.createElement('div');
  container.classList.add('landing');
  const titleEl = document.createElement('h1');
  titleEl.textContent = app.title || 'Haz el quiz';
  container.appendChild(titleEl);
  if (app.subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.textContent = app.subtitle;
    subtitleEl.style.marginBottom = '1rem';
    container.appendChild(subtitleEl);
  }
  // Disclaimer note
  if (app.disclaimer) {
    const disclaimerEl = document.createElement('p');
    disclaimerEl.classList.add('disclaimer');
    disclaimerEl.textContent = app.disclaimer;
    container.appendChild(disclaimerEl);
  }
  // Primary CTA
  const startBtn = document.createElement('button');
  startBtn.classList.add('btn-primary');
  startBtn.textContent = cta.start || 'Comenzar';
  startBtn.addEventListener('click', () => startSurvey('regular'));
  container.appendChild(startBtn);
  // Offer Pro upgrade
  const proBtn = document.createElement('button');
  proBtn.classList.add('btn-secondary');
  proBtn.textContent = cta.upgrade || 'Versión Pro';
  proBtn.style.marginLeft = '0.5rem';
  proBtn.addEventListener('click', () => startSurvey('pro'));
  container.appendChild(proBtn);
  // Footer invitation block appears on landing
  if (footer) {
    const footerBlock = renderFooter(footer);
    container.appendChild(footerBlock);
  }
  appRoot.appendChild(container);
  // Move focus to container for accessibility
  container.setAttribute('tabindex', '-1');
  container.focus();
}

/**
 * Render the questions from the selected survey (regular or pro). Questions
 * are defined in their respective JSON file under data/. The function
 * preloads all questions then displays the first one.
 * @param {string} mode 'regular' or 'pro'
 */
async function startSurvey(mode) {
  currentMode = mode;
  try {
    const filename = mode === 'pro' ? 'questions_pro.json' : 'questions.json';
    const qdata = await fetchJSON(filename);
    questionsData = qdata.sections.reduce((acc, section) => {
      section.questions.forEach(q => acc.push(q));
      return acc;
    }, []);
    // Reset answers/state
    currentQuestionIndex = 0;
    answers = {};
    renderQuestion();
  } catch (err) {
    console.error(err);
    appRoot.innerHTML = `<p>No se pudieron cargar las preguntas. Intenta de nuevo.</p>`;
  }
}

/**
 * Render a single question at the current index. Displays progress,
 * question text, options as selectable chips, and navigation buttons.
 */
function renderQuestion() {
  const total = questionsData.length;
  if (currentQuestionIndex < 0 || currentQuestionIndex >= total) {
    return;
  }
  const q = questionsData[currentQuestionIndex];
  appRoot.innerHTML = '';
  const container = document.createElement('div');
  // Progress bar
  const progressContainer = document.createElement('div');
  progressContainer.classList.add('progress-container');
  const progressBar = document.createElement('div');
  progressBar.classList.add('progress-bar');
  const progressPercent = ((currentQuestionIndex) / total) * 100;
  progressBar.style.width = `${progressPercent}%`;
  progressContainer.appendChild(progressBar);
  container.appendChild(progressContainer);
  // Question label
  const label = document.createElement('div');
  label.classList.add('question-label');
  label.textContent = q.label;
  container.appendChild(label);
  // Options container
  const optionsDiv = document.createElement('div');
  optionsDiv.classList.add('options');
  q.options.forEach(opt => {
    const chip = document.createElement('button');
    chip.setAttribute('type', 'button');
    chip.classList.add('option-chip');
    chip.setAttribute('data-option-id', opt.id);
    chip.textContent = opt.label;
    // Mark as selected if previously answered
    const selected = answers[q.id];
    if (selected) {
      if (q.type === 'single' && selected === opt.id) chip.classList.add('selected');
      if (q.type === 'multi' && selected.includes(opt.id)) chip.classList.add('selected');
    }
    // Click handler
    chip.addEventListener('click', () => {
      if (q.type === 'single') {
        // Clear previous selection
        answers[q.id] = opt.id;
        // update UI
        Array.from(optionsDiv.children).forEach(node => node.classList.remove('selected'));
        chip.classList.add('selected');
      } else if (q.type === 'multi') {
        // Toggle selection in array
        if (!Array.isArray(answers[q.id])) answers[q.id] = [];
        const idx = answers[q.id].indexOf(opt.id);
        if (idx >= 0) {
          answers[q.id].splice(idx, 1);
          chip.classList.remove('selected');
        } else {
          answers[q.id].push(opt.id);
          chip.classList.add('selected');
        }
      }
    });
    optionsDiv.appendChild(chip);
  });
  container.appendChild(optionsDiv);
  // Navigation buttons
  const nav = document.createElement('div');
  nav.style.display = 'flex';
  nav.style.justifyContent = 'space-between';
  // Back button
  const backBtn = document.createElement('button');
  backBtn.classList.add('btn-back');
  backBtn.textContent = copyData.cta.back || 'Atrás';
  backBtn.disabled = currentQuestionIndex === 0;
  backBtn.addEventListener('click', () => {
    currentQuestionIndex--;
    renderQuestion();
  });
  nav.appendChild(backBtn);
  // Next/Submit button
  const nextBtn = document.createElement('button');
  nextBtn.classList.add('btn-primary');
  nextBtn.textContent = currentQuestionIndex === total - 1 ? (copyData.cta.submit || 'Ver resultados') : (copyData.cta.continue || 'Continuar');
  nextBtn.addEventListener('click', () => {
    // Validate answer presence for current question
    if (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)) {
      alert('Selecciona una opción para continuar.');
      return;
    }
    if (currentQuestionIndex === total - 1) {
      renderCompletionForm();
    } else {
      currentQuestionIndex++;
      renderQuestion();
    }
  });
  nav.appendChild(nextBtn);
  container.appendChild(nav);
  appRoot.appendChild(container);
  // Focus container for screen readers
  container.setAttribute('tabindex', '-1');
  container.focus();
}

/**
 * Render the completion form. Prompts for name, email and optional waitlist
 * opt‑in. Once submitted, scores are computed and results displayed.
 */
function renderCompletionForm() {
  appRoot.innerHTML = '';
  const formContainer = document.createElement('div');
  formContainer.classList.add('completion-form');
  // Title
  const header = document.createElement('h2');
  header.textContent = 'Ingresa tus datos para ver tus resultados';
  formContainer.appendChild(header);
  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.classList.add('form-group');
  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', 'name');
  nameLabel.textContent = 'Nombre:';
  const nameInput = document.createElement('input');
  nameInput.setAttribute('type', 'text');
  nameInput.setAttribute('id', 'name');
  nameInput.setAttribute('required', '');
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  formContainer.appendChild(nameGroup);
  // Email field
  const emailGroup = document.createElement('div');
  emailGroup.classList.add('form-group');
  const emailLabel = document.createElement('label');
  emailLabel.setAttribute('for', 'email');
  emailLabel.textContent = 'Correo electrónico:';
  const emailInput = document.createElement('input');
  emailInput.setAttribute('type', 'email');
  emailInput.setAttribute('id', 'email');
  emailInput.setAttribute('required', '');
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  formContainer.appendChild(emailGroup);
  // Waitlist opt‑in
  const waitGroup = document.createElement('div');
  waitGroup.classList.add('form-group');
  const waitCheckbox = document.createElement('input');
  waitCheckbox.setAttribute('type', 'checkbox');
  waitCheckbox.setAttribute('id', 'waitlist');
  const waitLabel = document.createElement('label');
  waitLabel.setAttribute('for', 'waitlist');
  waitLabel.textContent = 'Deseo unirme a la lista de espera para medicina personalizada';
  waitGroup.appendChild(waitCheckbox);
  waitGroup.appendChild(waitLabel);
  formContainer.appendChild(waitGroup);
  // Disclaimer
  const disclaimer = document.createElement('p');
  disclaimer.classList.add('disclaimer');
  disclaimer.textContent = copyData.app.disclaimer || 'Este contenido es educativo y no sustituye atención médica.';
  formContainer.appendChild(disclaimer);
  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.classList.add('btn-primary');
  submitBtn.textContent = copyData.cta.submit || 'Ver resultados';
  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // Validation
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name || !email) {
      alert('Por favor ingresa tu nombre y correo.');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando…';
    try {
      // Compute scores and determine final type
      const { finalType, scores } = await calculateResult();
      // Persist submission
      await persistSubmission({ name, email, finalType, scores, waitlistOptIn: waitCheckbox.checked });
      // Render results
      renderResults(finalType, scores, name);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al procesar tus respuestas. Intenta de nuevo.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = copyData.cta.submit || 'Ver resultados';
    }
  });
  formContainer.appendChild(submitBtn);
  appRoot.appendChild(formContainer);
  formContainer.setAttribute('tabindex', '-1');
  formContainer.focus();
}

/**
 * Calculate elemental scores from the answers using scoring.json. It sums
 * weights for each selected option and returns both the scores and the
 * element with the highest score (tie broken by threshold order).
 */
async function calculateResult() {
  // Initialize scores
  const elements = scoringData.elements;
  const scores = {};
  elements.forEach(el => { scores[el] = 0; });
  // Apply weights
  for (const [qId, ans] of Object.entries(answers)) {
    if (Array.isArray(ans)) {
      ans.forEach(optId => addWeights(`${qId}:${optId}`));
    } else {
      addWeights(`${qId}:${ans}`);
    }
  }
  // Helper to accumulate weights
  function addWeights(key) {
    const weightObj = scoringData.weights[key];
    if (weightObj) {
      Object.entries(weightObj).forEach(([el, val]) => {
        if (typeof scores[el] === 'number') {
          scores[el] += val;
        }
      });
    }
  }
  // Determine final type – element with highest score; tiebreaker list
  let finalType = null;
  let maxScore = -Infinity;
  Object.entries(scores).forEach(([el, val]) => {
    if (val > maxScore) {
      maxScore = val;
      finalType = el;
    } else if (val === maxScore) {
      // tie – use thresholds order
      const tieOrder = scoringData.thresholds.tie_breaker || [];
      if (tieOrder.indexOf(el) < tieOrder.indexOf(finalType)) {
        finalType = el;
      }
    }
  });
  return { finalType, scores };
}

/**
 * Persist the survey response to Supabase and Formspree. If either request
 * fails, the errors are swallowed and logged; the application continues
 * offline gracefully. Supabase stores the raw answers and scoring.
 * Formspree sends a nicely formatted email to the user.
 * @param {object} param0 Response data
 */
async function persistSubmission({ name, email, finalType, scores, waitlistOptIn }) {
  const payload = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    version: currentMode,
    name,
    email,
    answers: JSON.stringify(answers),
    element_scores: JSON.stringify(scores),
    final_type: finalType,
    consent_waitlist: waitlistOptIn,
    source: 'qr',
    meta: JSON.stringify({ userAgent: navigator.userAgent, locale: navigator.language }),
  };
  // Save to Supabase
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Error al guardar en Supabase:', err);
    // fallback: save to localStorage for retry later
    try {
      const local = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
      local.push(payload);
      localStorage.setItem('pending_submissions', JSON.stringify(local));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage');
    }
  }
  // Send email via Formspree
  try {
    const emailBody = renderEmailTemplate(name, finalType, scores);
    await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, mensaje: emailBody, version: currentMode })
    });
  } catch (err) {
    console.warn('Error al enviar email:', err);
  }
  // Waitlist webhook
  if (waitlistOptIn) {
    try {
      await fetch(GENERIC_WAITLIST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'quiz', final_type: finalType })
      });
    } catch (err) {
      console.warn('Error al notificar waitlist:', err);
    }
  }
}

/**
 * Compose a simple plain‑text email body summarising the results. In a
 * production environment this should match the HTML template used by
 * marketing emails, but here we assemble a concise summary with tips.
 * @param {string} name User's name
 * @param {string} finalType Element id (aire/fuego/agua/tierra)
 * @param {object} scores Score breakdown
 */
function renderEmailTemplate(name, finalType, scores) {
  const result = resultsData.types[finalType];
  let body = `Hola ${name},\n\n`;
  body += `Gracias por completar el quiz de Colita de rana. Tu tipo de ciclo es: ${result.name}.\n\n`;
  body += `${result.summary}\n\n`;
  body += `Por qué: ${result.why}\n\n`;
  body += `Recomendaciones por fase:\n`;
  for (const phase in result.lifestyle) {
    const tips = result.lifestyle[phase];
    body += `- ${phase}: ${tips.join(', ')}\n`;
  }
  body += `\nAcciones herbales recomendadas: `;
  body += result.herbal_actions_preview.map(a => `${a.action} – ${a.explain}`).join('; ');
  body += '\n\nEste contenido es informativo y no sustituye atención médica.\n\n';
  return body;
}

/**
 * Render the results page with information pulled from results.json. It
 * presents the user's elemental type, a summary, why explanation, and
 * detailed recommendations. Also includes the footer block from copy.json.
 * @param {string} finalType Element id
 * @param {object} scores Score breakdown
 * @param {string} name User's name to personalise the message
 */
function renderResults(finalType, scores, name) {
  const result = resultsData.types[finalType];
  appRoot.innerHTML = '';
  const container = document.createElement('div');
  container.classList.add('results-container');
  // Greeting
  const greet = document.createElement('h2');
  greet.textContent = `¡Gracias, ${name}! Aquí están tus resultados:`;
  container.appendChild(greet);
  // Type badge
  const typeEl = document.createElement('div');
  typeEl.classList.add('results-type');
  typeEl.textContent = `${result.name}`;
  container.appendChild(typeEl);
  // Summary
  const summaryEl = document.createElement('div');
  summaryEl.classList.add('results-summary');
  summaryEl.textContent = result.summary;
  container.appendChild(summaryEl);
  // Why explanation
  const whyEl = document.createElement('div');
  whyEl.classList.add('results-why');
  whyEl.textContent = result.why;
  container.appendChild(whyEl);
  // Lifestyle tips by phase
  const lifestyleSection = document.createElement('div');
  lifestyleSection.classList.add('results-section');
  const lifestyleTitle = document.createElement('h3');
  lifestyleTitle.textContent = 'Estilo de vida por fase:';
  lifestyleSection.appendChild(lifestyleTitle);
  for (const phase in result.lifestyle) {
    const phaseHeader = document.createElement('h4');
    // Capitalise first letter
    phaseHeader.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
    lifestyleSection.appendChild(phaseHeader);
    const ul = document.createElement('ul');
    result.lifestyle[phase].forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    lifestyleSection.appendChild(ul);
  }
  container.appendChild(lifestyleSection);
  // Nutrition tips
  const nutritionSection = document.createElement('div');
  nutritionSection.classList.add('results-section');
  const nutritionTitle = document.createElement('h3');
  nutritionTitle.textContent = 'Nutrición recomendada:';
  nutritionSection.appendChild(nutritionTitle);
  const nutritionList = document.createElement('ul');
  result.nutrition.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    nutritionList.appendChild(li);
  });
  nutritionSection.appendChild(nutritionList);
  container.appendChild(nutritionSection);
  // Herbal actions preview
  const herbalSection = document.createElement('div');
  herbalSection.classList.add('results-section');
  const herbalTitle = document.createElement('h3');
  herbalTitle.textContent = 'Acciones herbales:';
  herbalSection.appendChild(herbalTitle);
  const herbalList = document.createElement('ul');
  result.herbal_actions_preview.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.action}: ${item.explain}`;
    herbalList.appendChild(li);
  });
  herbalSection.appendChild(herbalList);
  container.appendChild(herbalSection);
  // Footer block
  const footerBlock = renderFooter(copyData.footer);
  container.appendChild(footerBlock);
  // Retake button for pro version
  const retakeBtn = document.createElement('button');
  retakeBtn.classList.add('btn-secondary');
  retakeBtn.style.marginTop = '1rem';
  retakeBtn.textContent = '¿Quieres la versión Pro?';
  retakeBtn.addEventListener('click', () => startSurvey('pro'));
  container.appendChild(retakeBtn);
  // Back to start
  const homeBtn = document.createElement('button');
  homeBtn.classList.add('btn-back');
  homeBtn.style.marginLeft = '0.5rem';
  homeBtn.textContent = 'Volver al inicio';
  homeBtn.addEventListener('click', () => renderLanding());
  container.appendChild(homeBtn);
  appRoot.appendChild(container);
  container.setAttribute('tabindex', '-1');
  container.focus();
}

/**
 * Render the footer block using copy.json.footer. This helper creates a
 * consistent footer for the landing and results pages.
 * @param {object} footerData Footer content from copy.json
 */
function renderFooter(footerData) {
  const footer = document.createElement('div');
  footer.classList.add('footer');
  if (footerData.title) {
    const h4 = document.createElement('h4');
    h4.textContent = footerData.title;
    footer.appendChild(h4);
  }
  if (footerData.description) {
    const p = document.createElement('p');
    p.textContent = footerData.description;
    footer.appendChild(p);
  }
  if (Array.isArray(footerData.benefits)) {
    const ul = document.createElement('ul');
    footerData.benefits.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    footer.appendChild(ul);
  }
  if (footerData.launch_date) {
    const launch = document.createElement('p');
    launch.textContent = footerData.launch_date;
    footer.appendChild(launch);
  }
  return footer;
}

// Kick off the app once the DOM is ready
document.addEventListener('DOMContentLoaded', init);