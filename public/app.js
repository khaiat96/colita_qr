// Enhanced PDF-Friendly Survey App - Version 7.1
// This version includes proper PDF generation with print-optimized styling

// Configuration  
const SUPABASE_URL = 'https://eithnnxevoqckkzhvnci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImFwcCI6ImRlbW8iLCJlZmYiOiJlaXRobm54ZXZvcWNra3podm5jaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwMTg0ODI2LCJleHAiOjIwNzU3NjA4MjZ9.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig';
const WAITLIST_WEBHOOK = 'https://hook.us2.make.com/3zh4bd36iwjcy6qgrcf4psyryfg7kucv';
const EMAIL_REPORT_WEBHOOK = 'https://hook.us2.make.com/er23s3ieomte4jue36f4v4o0g3mrtsdl';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let questionOrder = [];
let surveyQuestions = [];
let answers = {};
let currentQuestionIndex = 0;
let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let resultsTemplate = null;
window.surveyLoaded = false;

console.log('🚀 ENHANCED APP.JS LOADED - PDF OPTIMIZED VERSION 2.0 - CACHE BUSTED');

// ==================== PDF GENERATION FUNCTIONS ====================

/**
 * Enhanced PDF generation with print-optimized styling
 */
window.generatePDF = async function() {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard) {
    alert('No results found to generate PDF.');
    return;
  }

  try {
    // Create a new window for PDF generation
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      alert('Please allow popups for PDF generation.');
      return;
    }

    // Get all CSS for the PDF
    const allCSS = await getAllCSS();
    const printCSS = getPrintCSS();
    
    // Create the HTML content for PDF
    const pdfHTML = createPDFHTML(resultsCard.innerHTML, allCSS, printCSS);
    
    // Write to the new window
    pdfWindow.document.write(pdfHTML);
    pdfWindow.document.close();
    
    // Wait for content to load then generate PDF
    pdfWindow.onload = function() {
      setTimeout(() => {
        pdfWindow.print();
      }, 500);
    };

  } catch (error) {
    console.error('PDF Generation Error:', error);
    alert('Error generating PDF. Please try again.');
  }
};

/**
 * Generate PDF using HTML to Canvas method (more reliable)
 */
window.generatePDFCanvas = async function() {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard) {
    alert('No results found to generate PDF.');
    return;
  }

  try {
    // Create a temporary container for PDF content
    const pdfContainer = createPDFContainer();
    document.body.appendChild(pdfContainer);

    // Generate PDF using html2canvas-like approach
    await generatePDFContent(pdfContainer);
    
    // Clean up
    document.body.removeChild(pdfContainer);

  } catch (error) {
    console.error('Canvas PDF Generation Error:', error);
    alert('Error generating PDF. Please try again.');
  }
};

/**
 * Create print-optimized HTML for PDF generation
 */
function createPDFHTML(content, allCSS, printCSS) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resultados Colita de Rana - Tu Medicina Personalizada</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          font-size: 14px;
        }
        
        /* Print-optimized container */
        .pdf-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        /* Header */
        .pdf-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #00D4AA;
        }
        
        .pdf-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #00D4AA;
          margin-bottom: 10px;
        }
        
        .pdf-header .subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .pdf-header .date {
          font-size: 12px;
          color: #999;
        }
        
        /* Results card styling for PDF */
        .pdf-results-card {
          background: #f9f9f9;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
        }
        
        .pdf-results-card h2 {
          font-size: 24px;
          font-weight: 700;
          color: #00D4AA;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .pdf-results-card h3 {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .pdf-results-card h4 {
          font-size: 16px;
          font-weight: 600;
          color: #00D4AA;
          margin: 20px 0 10px 0;
        }
        
        .pdf-results-card p {
          margin-bottom: 15px;
          line-height: 1.6;
          color: #444;
        }
        
        /* Lists */
        .pdf-results-card ul {
          margin: 15px 0;
          padding-left: 20px;
        }
        
        .pdf-results-card li {
          margin-bottom: 8px;
          line-height: 1.5;
          color: #444;
        }
        
        /* Pattern sections */
        .pattern-description {
          background: #f0f8f6;
          border-left: 4px solid #00D4AA;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        
        .characteristics li {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px 15px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        /* Recommendations */
        .recommendations {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .recommendations h4 {
          color: #00D4AA;
          margin-bottom: 15px;
        }
        
        .recommendations-list li {
          background: white;
          border-left: 3px solid #00D4AA;
          border-radius: 0 6px 6px 0;
          padding: 12px 15px;
          margin-bottom: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        /* Phase sections */
        .phase-section {
          margin-top: 30px;
        }
        
        .phase-section h2 {
          color: #00D4AA;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: left;
        }
        
        .phase-block {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .phase-block h5 {
          color: #00D4AA;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .phase-block p {
          color: #555;
          margin-bottom: 15px;
          font-style: italic;
        }
        
        .phase-block ul {
          list-style: none;
          padding-left: 0;
        }
        
        .phase-block ul li {
          padding: 5px 0 5px 20px;
          position: relative;
          color: #666;
        }
        
        .phase-block ul li::before {
          content: "•";
          position: absolute;
          left: 5px;
          color: #00D4AA;
          font-weight: bold;
        }
        
        /* CDR Section */
        .cdr-section {
          background: #f0f8ff;
          border: 1px solid #b3d9ff;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
        }
        
        .cdr-header h3 {
          color: #00D4AA;
          font-size: 20px;
          margin-bottom: 10px;
        }
        
        .unique-system {
          margin-top: 20px;
        }
        
        .unique-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        
        .unique-item {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
        }
        
        .unique-item h5 {
          color: #333;
          margin-bottom: 8px;
        }
        
        .unique-item p {
          color: #666;
          font-size: 13px;
        }
        
        /* Disclaimer */
        .results-disclaimer {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin-top: 30px;
          font-size: 12px;
          color: #856404;
          line-height: 1.4;
        }
        
        /* Print styles */
        @media print {
          body {
            font-size: 12px;
          }
          
          .pdf-container {
            max-width: none;
            margin: 0;
            padding: 10px;
          }
          
          .pdf-header {
            margin-bottom: 20px;
          }
          
          .pdf-results-card {
            break-inside: avoid;
            margin-bottom: 20px;
          }
          
          .phase-block {
            break-inside: avoid;
            margin-bottom: 12px;
          }
          
          .unique-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
        
        /* Hide elements not suitable for PDF */
        .waitlist-results-form,
        .btn-send-results,
        .email-form,
        .survey-navigation,
        .survey-header {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="pdf-container">
        <div class="pdf-header">
          <h1>🌿 Colita de Rana</h1>
          <div class="subtitle">Tu Medicina Personalizada</div>
          <div class="date">Generado el ${new Date().toLocaleDateString('es-MX')}</div>
        </div>
        
        <div class="pdf-results-card">
          ${content}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create a temporary container for PDF generation
 */
function createPDFContainer() {
  const container = document.createElement('div');
  container.id = 'pdf-temp-container';
  container.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: 800px;
    background: white;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
  `;
  return container;
}

/**
 * Generate PDF content using canvas method
 */
async function generatePDFContent(container) {
  // This is a simplified version - in a real implementation,
  // you would use libraries like html2canvas + jsPDF
  const resultsCard = document.getElementById('results-card');
  if (resultsCard) {
    container.innerHTML = createPDFHTML(resultsCard.innerHTML, '', '');
    window.print();
  }
}

/**
 * Get print-specific CSS
 */
function getPrintCSS() {
  return `
    @media print {
      body { font-size: 12px; }
      .pdf-container { max-width: none; margin: 0; padding: 10px; }
      .pdf-results-card { break-inside: avoid; }
      .phase-block { break-inside: avoid; }
      .waitlist-results-form, .btn-send-results { display: none !important; }
    }
  `;
}

/**
 * Enhanced function to extract all CSS
 */
async function getAllCSS() {
  let allCSS = '';
  
  // Get inline styles
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach(style => {
    allCSS += style.textContent + '\n';
  });
  
  // Get external stylesheets
  const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
  for (const link of linkElements) {
    try {
      const response = await fetch(link.href);
      const css = await response.text();
      allCSS += css + '\n';
    } catch (e) {
      console.warn(`Failed to fetch CSS from ${link.href}`, e);
    }
  }
  
  return allCSS;
}

/**
 * Email results with PDF attachment
 */
window.emailResultsWithPDF = async function(email) {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard) {
    alert('No results found to send.');
    return;
  }

  try {
    // Generate PDF content
    const pdfHTML = createPDFHTML(resultsCard.innerHTML, await getAllCSS(), getPrintCSS());
    
    // Send to your webhook with PDF content
    const payload = {
      email: email,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      answers: answers,
      pdf_html: pdfHTML,
      results_content: resultsCard.innerHTML
    };

    const response = await fetch(EMAIL_REPORT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    alert('¡Resultados enviados por correo con PDF adjunto!');
    console.log('✅ Results sent to email with PDF');
  } catch (err) {
    console.error('❌ Failed to send results with PDF:', err);
    alert('Hubo un error enviando los resultados. Por favor intenta de nuevo.');
  }
};

/**
 * Simple print function as fallback
 */
window.printResults = function() {
  const resultsCard = document.getElementById('results-card');
  if (!resultsCard) {
    alert('No results found to print.');
    return;
  }

  // Store original body content
  const originalBody = document.body.innerHTML;
  
  // Create print-friendly version
  const printContent = `
    <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #00D4AA; padding-bottom: 20px;">
        <h1 style="color: #00D4AA; font-size: 28px; margin-bottom: 10px;">🌿 Colita de Rana</h1>
        <p style="color: #666; font-size: 16px;">Tu Medicina Personalizada</p>
        <p style="color: #999; font-size: 12px;">Generado el ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
      <div style="background: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 12px; padding: 25px;">
        ${resultsCard.innerHTML}
      </div>
    </div>
  `;
  
  // Replace body content temporarily
  document.body.innerHTML = printContent;
  
  // Print
  window.print();
  
  // Restore original content
  document.body.innerHTML = originalBody;
  
  // Re-initialize app
  location.reload();
};

// ==================== ORIGINAL APP FUNCTIONS (Enhanced) ====================

function scrollToWaitlist() {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth' });
  }
}

window.handleTextInput = function(qId, value) {
    answers[qId] = value;
    window.updateNavigation();
};

async function sendResponsesToGoogleSheet() {
  try {
    const payload = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      answers: answers
    };

    const resp = await fetch(EMAIL_REPORT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
    }

    console.log('✅ Survey responses sent to Google Sheets via Make webhook.');
  } catch (err) {
    console.error('❌ Failed to send survey data to Google Sheets:', err);
  }
}

// ==================== WAITLIST FUNCTIONS ====================

window.scrollToWaitlist = function() {
  const waitlistSection = document.getElementById('waitlist-section');
  if (waitlistSection) {
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
    page.style.display = 'none';
  });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log(`✓ Switched to page: ${pageId}`);
  } else {
    console.error(`✗ Page not found: ${pageId}`);
  }
}

window.startSurvey = function() {
  currentQuestionIndex = 0;
  answers = {};
  showPage('survey-page');
  renderQuestion();
};

// ==================== MAIN INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
  showPage('landing-page');

  const quizBtn = document.getElementById('take-quiz-btn');
  if (quizBtn) quizBtn.disabled = true;

  try {
    const surveyResp = await fetch('survey_questions.json');
    if (!surveyResp.ok) throw new Error(`HTTP ${surveyResp.status}: ${surveyResp.statusText}`);
    const surveyData = await surveyResp.json();
    surveyQuestions = surveyData.questions;
    questionOrder = surveyData.question_order;

    const mappingResp = await fetch('decision_mapping.json');
    if (!mappingResp.ok) throw new Error(`HTTP ${mappingResp.status}: ${mappingResp.statusText}`);
    const decisionMapping = await mappingResp.json();

    try {
      const resultsResp = await fetch('results_template.json');
      if (!resultsResp.ok) throw new Error(`HTTP ${resultsResp.status}: ${resultsResp.statusText}`);
      resultsTemplate = await resultsResp.json();
      console.log('✅ Loaded results_template.json');
    } catch (err) {
      resultsTemplate = null;
      console.error('❌ Failed to load results_template.json:', err);
    }

    surveyQuestions.forEach(q => {
      if (q.type === 'singlechoice' || q.type === 'single') {
        q.type = 'single_choice';
      }
    });

    surveyQuestions.forEach(q => {
      if (Array.isArray(q.options)) {
        const mappingList = decisionMapping?.decision_map?.[q.id];
        if (mappingList) {
          q.options.forEach(opt => {
            const mapping = mappingList[opt.value];
            if (mapping && mapping.scores) opt.scores = mapping.scores;
          });
        }
      }
      if (q.type === "compound" && Array.isArray(q.items)) {
        q.items.forEach(item => {
          if (Array.isArray(item.options)) {
            const mappingList = decisionMapping?.decision_map?.[item.id];
            if (mappingList) {
              item.options.forEach(opt => {
                const mapping = mappingList[opt.value];
                if (mapping && mapping.scores) opt.scores = mapping.scores;
              });
            }
          }
        });
      }
    });

    window.surveyLoaded = true;
    console.log('✅ Loaded', surveyQuestions.length, 'questions');
    if (quizBtn) quizBtn.disabled = false;
  } catch (err) {
    console.error('❌ Error:', err);
    alert(`No se pudieron cargar las preguntas del quiz: ${err.message}`);
    if (quizBtn) quizBtn.disabled = true;
  }
});

// ==================== WAITLIST FORM HANDLER ====================

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
  const qId = typeof question.id === 'string' ? question.id : '';

  // always show P0 and P1
  if (qId === 'P0_contraception' || qId === 'P1') return true;

  // P1_ follow-ups
  if (qId.startsWith('P1_')) {
    return answers.P1 === 'No tengo sangrado actualmente';
  }

  if (!question.visible_if) return true;
  const cond = question.visible_if;

  // equals
  if (cond.question_id && typeof cond.equals !== 'undefined') {
    return answers[cond.question_id] === cond.equals;
  }
  // includes
  if (cond.question_id && cond.includes) {
    const ans = answers[cond.question_id];
    const inclArr = Array.isArray(cond.includes) ? cond.includes : [cond.includes];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    return inclArr.some(v => ansArr.includes(v));
  }
  // not_includes, includes_any, not_in, not_includes_any, at_least...
  // (keep your existing blocks here, none of which use question.id)

  // all / any
  if (cond.all) {
    return cond.all.every(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
  }
  if (cond.any) {
    return cond.any.some(subCond =>
      isQuestionVisible({ visible_if: subCond, id: '' }, answers)
    );
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

window.finishSurvey = function () {
  const patternKey = calculateResults();
  showResults(patternKey);
  sendResponsesToGoogleSheet(); 
};

// ==================== SURVEY RENDERING ====================

function renderQuestion() {
    let qId = questionOrder[currentQuestionIndex];
    let question = getQuestionById(qId);

    // Guard for undefined question
    if (!question) {
        finishSurvey();
        return;
    }
    console.log('Rendering question:', question.id, 'type:', question.type, 'options:', question.options);
  
    // Skip invisible questions
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

    // Handle standard option types
    if ((question.type === 'multiselect' || question.type === 'single_choice') && Array.isArray(question.options)) {
        question.options.forEach((option, index) => {
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
    } else if (question.type === 'text') {
    optionsHtml = `
        <input type="text"
            id="input-${qId}"
            class="input-text"
            value="${answers[qId] || ''}"
            placeholder="${question.help_text || ''}"
            oninput="window.handleTextInput('${qId}', this.value)">
    `;
}
else {
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

// Updated selectOption function with scoped selection for compound/grouped sub-questions
window.selectOption = function(qId, value, isMultiSelect) {
  console.log("Option clicked:", { qId, value, isMultiSelect });

  // Find the question type for this qId (may be item inside compound/grouped)
  let question = getQuestionById(qId);
  if (!question) {
    for (const q of surveyQuestions) {
      if (q.type === 'compound' && Array.isArray(q.items)) {
        const found = q.items.find(item => item.id === qId);
        if (found) {
          question = found;
          break;
        }
      } else if (q.type === 'grouped' && Array.isArray(q.questions)) {
        const found = q.questions.find(item => item.id === qId);
        if (found) {
          question = found;
          break;
        }
      }
    }
  }
  if (!question) return;

  let optionSelector = `.option[data-qid="${qId}"]`;
  if (document.querySelector(`.sub-option[data-qid="${qId}"]`)) {
    optionSelector = `.sub-option[data-qid="${qId}"]`;
  } else if (document.querySelector(`.group-option[data-qid="${qId}"]`)) {
    optionSelector = `.group-option[data-qid="${qId}"]`;
  }

  if (isMultiSelect) {
    if (!answers[qId]) answers[qId] = [];
    const currentAnswers = answers[qId];
    const index = currentAnswers.indexOf(value);
    if (index > -1) {
      currentAnswers.splice(index, 1);
    } else {
      if (question.validation && question.validation.maxselected && currentAnswers.length >= question.validation.maxselected) {
        currentAnswers.shift();
      }
      currentAnswers.push(value);
    }
    document.querySelectorAll(`${optionSelector}[data-value="${value}"]`).forEach(elem => {
      elem.classList.toggle('selected');
    });
  } else {
    answers[qId] = value;
    document.querySelectorAll(`${optionSelector}`).forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelectorAll(`${optionSelector}[data-value="${value}"]`).forEach(option => {
      option.classList.add('selected');
    });
  }

  console.log("answers state after click:", JSON.stringify(answers));
  window.updateNavigation();
};

window.selectSlider = function(qId, value) {
    answers[qId] = Number(value);
    const sliderValueSpan = document.getElementById(`slider-value-${qId}`) || document.getElementById('slider-value');
    if (sliderValueSpan) sliderValueSpan.textContent = value;
    console.log("answers state after slider:", JSON.stringify(answers));
    window.updateNavigation();
};

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
  ['tension', 'calor', 'frio', 'humedad', 'sequedad'].forEach(pattern => {
    if (scores[pattern] > maxScore) {
      maxScore = scores[pattern];
      dominantPattern = pattern;
    }
  });

  return dominantPattern;
}

// ==================== DETAILED RESULTS RENDERING ====================

// Helper to safely get nested property from template
function getTemplateSection(section, patternKey) {
  if (!resultsTemplate || !resultsTemplate[section]) return null;
  return resultsTemplate[section][patternKey] || resultsTemplate[section]['by_pattern']?.[patternKey] || null;
}

function renderCareTips(patternKey) {
  const tips = resultsTemplate?.care_tips?.by_pattern?.[patternKey] || [];
  if (!tips.length) return '';
  return `
    <div class="recommendations">
      <h4>Mini-hábitos por patrón</h4>
      <ul class="recommendations-list">
        ${tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderPhase(patternKey) {
  if (!resultsTemplate) return ''; // Safety check
  
  const result = resultsTemplate;
  const phaseTemplate = result.phase;
  const primaryPattern = patternKey;

  if (!phaseTemplate || !phaseTemplate.generic) return '';

  let html = `<h2>${phaseTemplate.title}</h2>`;
  const genericPhases = phaseTemplate.generic;

  for (const [phaseKey, phaseInfo] of Object.entries(genericPhases)) {
    let about = phaseInfo.about || "";
    let doList = [...(phaseInfo.do || [])];
    let foods = [...(phaseInfo.foods || [])];
    let avoid = [...(phaseInfo.avoid || [])];
    let movement = [...(phaseInfo.movement || [])];
    let vibe = phaseInfo.vibe || "";

    const overrides = phaseTemplate.overrides_by_pattern?.[patternKey]?.[phaseKey];
    if (overrides) {
      if (overrides.about_add) about += " " + overrides.about_add;
      if (overrides.do_add) doList.push(...overrides.do_add);
      if (overrides.foods_add) foods.push(...overrides.foods_add);
      if (overrides.avoid_add) avoid.push(...overrides.avoid_add);
      if (overrides.movement_add) movement.push(...overrides.movement_add);
      if (overrides.vibe_add) vibe += " " + overrides.vibe_add;
    }

    html += `
      <div class="phase-block">
        <h5>${phaseInfo.label}</h5>
        <p>${about}</p>
        ${foods.length ? `<p> <strong>Comidas sugeridas:</strong></p><ul>${foods.map(f => `<li>${f}</li>`).join("")}</ul>` : ""}
        ${doList.length ? `<p> <strong>Qué hacer:</strong></p><ul>${doList.map(d => `<li>${d}</li>`).join("")}</ul>` : ""}
        ${avoid.length ? `<p> <strong>Evita:</strong></p><ul>${avoid.map(a => `<li>${a}</li>`).join("")}</ul>` : ""}
        ${movement.length ? `<p> <strong>Movimiento:</strong></p><ul>${movement.map(m => `<li>${m}</li>`).join("")}</ul>` : ""}
        ${vibe ? `<p> <strong>Vibra:</strong> ${vibe}</p>` : ""}
      </div>`;
  }

  return html;
}

// --- Helpers for rendering the enhanced Results Page ---

function renderElementHeader(patternKey) {
  const elementLabel = resultsTemplate?.element?.by_pattern?.[patternKey]?.[0] || patternKey;
  const summary = resultsTemplate?.summary?.by_pattern?.[patternKey]?.[0] || '';
  return `
    <div class="result-head">
      <div class="element-badge">${elementLabel}</div>
      <h3 class="result-summary">${summary}</h3>
    </div>
  `;
}

function renderElementExplainer(patternKey) {
  const expl = resultsTemplate?.element_explainer?.by_pattern?.[patternKey]?.[0] || '';
  return expl ? `<div class="pattern-explainer">${expl}</div>` : '';
}

function renderPatternCard(patternKey) {
  const card = resultsTemplate?.pattern_card?.by_pattern?.[patternKey] || [];
  if (!card.length) return '';
  const bullets = card.map(p => `<li>${p}</li>`).join('');
  return `
    <div class="pattern-card">
      <h4>Tu patrón menstrual se caracteriza por:</h4>
      <ul>${bullets}</ul>
    </div>
  `;
}

function renderWhyCluster(patternKey) {
  const why = resultsTemplate?.why_cluster?.by_pattern?.[patternKey]?.[0] || '';
  return why
    ? `<div class="why-cluster"><h4>¿Por qué se agrupan tus síntomas?</h4><p>${why}</p></div>`
    : '';
}

function renderCareTips(patternKey) {
  const tips = resultsTemplate?.care_tips?.by_pattern?.[patternKey] || [];
  if (!tips.length) return '';
  const items = tips.map(t => `<li>${t}</li>`).join('');
  return `
    <section class="care-tips">
      <h4>🌸 Mini-hábitos para tu patrón</h4>
      <ul>${items}</ul>
    </section>
  `;
}

function renderRitmoCicloBlock(stateKey = 'regular') {
  const blk = resultsTemplate?.ritmo_ciclo_block?.by_state?.[stateKey];
  if (!blk) return '';
  return `
    <div class="ritmo-block">
      <h4>Ritmo del ciclo</h4>
      <p>${blk.que_significa}</p>
      <p>${blk.por_que_importa}</p>
      ${blk.tips_suaves?.length ? `<ul>${blk.tips_suaves.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
    </div>
  `;
}

function renderUniqueSystem() {
  const us = resultsTemplate?.unique_system;
  if (!us?.differentiators?.length) return '';
  return `
    <section class="unique-system">
      <h4>${us.title}</h4>
      <div class="unique-grid">
        ${us.differentiators
          .map(d => `<div class="unique-item"><h5>${d.title}</h5><p>${d.description}</p></div>`)
          .join('')}
      </div>
    </section>
  `;
}

function renderHowHerbsWork(patternKey) {
  const sec = resultsTemplate?.how_herbs_work?.by_pattern?.[patternKey];
  if (!sec) return '';
  const mech = (sec.mechanism || []).map(m => `<li>${m}</li>`).join('');
  const logic = sec.combo_logic ? `<p class="herb-logic">${sec.combo_logic}</p>` : '';
  return `
    <section class="herbs-section">
      <h4>🌿 ¿Qué incluiría tu medicina personalizada?</h4>
      <ul>${mech}</ul>
      ${logic}
    </section>
  `;
}

function renderColitaIntro() {
  return `
    <section class="cdr-intro">
      <h4>colita de rana</h4>
      <p>Tu cuerpo tiene un lenguaje propio. Nuestro sistema lo traduce en elementos (aire, fuego, tierra y agua) para ofrecerte <em>medicina personalizada</em> que evoluciona contigo.</p>
    </section>
  `;
  
}

function pickRitmoStateFromAnswers() {
  const p1 = answers.P1_regularity;
  if (p1 === "Irregular (varía >7 días entre ciclos)") return "irregular";
  if (p1 === "No tengo sangrado actualmente") return "no_sangrando";
  return "regular";
}

// === MAIN RESULTS RENDERING ===
function showResults(patternType) {
  if (!resultsTemplate) {
    console.error("❌ resultsTemplate is null — failed to load results_template.json");
    alert("No se pudo cargar el archivo de resultados. Revisa results_template.json");
    return;
  }

  const result = resultsTemplate;
  const card = document.getElementById("results-card");
  if (!card) return;
  card.innerHTML = ""; // clear previous results

  // --- Element Header ---
  const elementTitle = result.element?.by_pattern?.[patternType]?.[0] || patternType;
  const title = document.createElement("h2");
  title.className = "results-main-title";
  title.textContent = elementTitle;
  card.appendChild(title);

  // --- Subtitle ---
  const subtitleText =
    (result.summary?.single || "Tu tipo de ciclo: {{label_top}}").replace(
      "{{label_top}}",
      result.labels?.[patternType] || patternType
    );
  const subtitle = document.createElement("h3");
  subtitle.className = "results-subtitle";
  subtitle.textContent = subtitleText;
  card.appendChild(subtitle);

  // --- Pattern Card ---
  const patternData = result.pattern_card?.single?.[patternType];
  if (patternData) {
    const patternSection = document.createElement("div");
    patternSection.className = "pattern-description";
    const expl = patternData.pattern_explainer || "";
    const bullets = (patternData.characteristics || [])
      .map((c) => `<li>${c}</li>`)
      .join("");
    patternSection.innerHTML = `
      <p class="pattern-explainer">${expl}</p>
      <ul class="characteristics">${bullets}</ul>`;
    card.appendChild(patternSection);
  }

  // --- Why Cluster ---
  const why = result.why_cluster?.by_pattern?.[patternType]?.[0];
  if (why) {
    const whySection = document.createElement("div");
    whySection.className = "why-cluster";
    whySection.innerHTML = `<h4>¿Por qué se agrupan tus síntomas?</h4><p>${why}</p>`;
    card.appendChild(whySection);
  }

   // --- Care Tips ---
  const habits = result.care_tips?.by_pattern?.[patternType] || [];
  if (habits.length) {
    const habitsSection = document.createElement("div");
    habitsSection.className = "recommendations";
    const items = habits.map((h) => `<li>${h}</li>`).join("");
    habitsSection.innerHTML = `
      <h4>🌸 Mini-hábitos para tu patrón</h4>
      <ul class="recommendations-list">${items}</ul>`;
    card.appendChild(habitsSection);
  }

  // --- Colita de Rana Club Section (BEFORE PHASE) ---
  const cdrContainer = document.createElement("section");
  cdrContainer.className = "cdr-section";
  cdrContainer.innerHTML = `
    <div class="cdr-header">
      <h3>🌿 Colita de Rana Club</h3>
      <p>Tu cuerpo tiene un lenguaje propio. Nuestro sistema lo traduce en elementos (aire, fuego, tierra y agua) para ofrecerte <em>medicina personalizada</em> que evoluciona contigo.</p>
    </div>
  `;

  // Herbal mechanisms
  const herbs = result.how_herbs_work?.by_pattern?.[patternType];
  if (herbs) {
    const herbSection = document.createElement("div");
    herbSection.className = "herbs-section";
    herbSection.innerHTML = `
      <h4>Cómo trabajaríamos tu patrón</h4>
      <ul class="herb-mechanisms">
        ${herbs.mechanism.map((m) => `<li>${m}</li>`).join("")}
      </ul>
      <p class="herb-logic">${herbs.combo_logic}</p>`;
    cdrContainer.appendChild(herbSection);
  }

  // Unique system differentiators
  const diff = result.unique_system?.differentiators || [];
  if (diff.length) {
    const uniqueGrid = document.createElement("div");
    uniqueGrid.className = "unique-system";
    uniqueGrid.innerHTML = `
      <h4>${result.unique_system.title}</h4>
      <div class="unique-grid">
        ${diff
          .map(
            (d) => `
          <div class="unique-item">
            <h5>${d.title}</h5>
            <p>${d.description}</p>
          </div>`
          )
          .join("")}
      </div>`;
    cdrContainer.appendChild(uniqueGrid);
  }

  // Append Colita de Rana section
  card.appendChild(cdrContainer);

  // --- Phase Section (AFTER COLITA) ---
  const phaseHTML = renderPhase(patternType);
  if (phaseHTML) {
    const phaseContainer = document.createElement('div');
    phaseContainer.className = 'phase-section';
    phaseContainer.innerHTML = phaseHTML;
    card.appendChild(phaseContainer);
  }

  // --- PDF Generation Buttons ---
  const pdfActions = document.createElement('div');
  pdfActions.className = 'pdf-actions';
  pdfActions.innerHTML = `
    <div class="pdf-buttons-container">
      <h4>📧 Recibe tus resultados por correo</h4>
      <div class="email-form-container">
        <input type="email" id="pdf-email" placeholder="tu@email.com" class="pdf-email-input">
        <button onclick="window.emailResultsWithPDF(document.getElementById('pdf-email').value)" class="btn-send-pdf">
          Enviar PDF por correo
        </button>
      </div>
      
      <div class="pdf-buttons">
        <button onclick="window.generatePDF()" class="btn-pdf-action">
          📄 Descargar PDF
        </button>
        <button onclick="window.printResults()" class="btn-pdf-action">
          🖨️ Imprimir
        </button>
      </div>
    </div>
  `;
  card.appendChild(pdfActions);

// --- After rendering all result sections but before showPage ---
const resultsWaitlistForm = `
  <div class="waitlist-results-form">
    <h2>Únete a la lista de espera</h2>
    <div class="fields">
      <input
        type="text"
        id="results-waitlist-name"
        placeholder="Tu nombre"
        required
      />
      <input
        type="email"
        id="results-waitlist-email"
        placeholder="tu@email.com"
        required
      />
    </div>
    <button id="results-join-waitlist-btn" class="btn-primary">
      Enviar
    </button>
  </div>
`;
card.insertAdjacentHTML('beforeend', resultsWaitlistForm);

const joinBtn = card.querySelector('#results-join-waitlist-btn');
if (joinBtn) {
  joinBtn.addEventListener('click', async () => {
    const name = card.querySelector('#results-waitlist-name').value.trim();
    const email = card.querySelector('#results-waitlist-email').value.trim();
    if (!name || !email) {
      alert('Por favor ingresa tu nombre y correo.');
      return;
    }
    try {
      await fetch(WAITLIST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'results_page' })
      });
      alert('¡Gracias! Te has unido a la lista de espera.');
    } catch (err) {
      console.error('Error joining waitlist:', err);
      alert('Hubo un error. Por favor intenta de nuevo.');
    }
  });
}


    // Disclaimer
  const disclaimer = document.createElement("p");
  disclaimer.className = "results-disclaimer";
  disclaimer.textContent =
    result.meta?.disclaimer ||
    "Esta información es educativa y no sustituye atención médica.";
  card.appendChild(disclaimer);


  showPage("results-page");
}

window.showResults = showResults;


// ==================== PROGRESS BAR ====================

function updateProgress() {
  let visibleCount = 0;
  for (let i = 0; i <= currentQuestionIndex; i++) {
    const q = getQuestionById(questionOrder[i]);
    if (isQuestionVisible(q, answers)) visibleCount++;
  }
  const totalVisible = questionOrder.filter(qId => isQuestionVisible(getQuestionById(qId), answers)).length;
  const progress = ((visibleCount) / totalVisible) * 100;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `Pregunta ${visibleCount} de ${totalVisible}`;
}

// ==================== NAVIGATION LOGIC (CRITICAL) ====================

window.updateNavigation = function() {
    const qId = questionOrder[currentQuestionIndex];
    const question = getQuestionById(qId);
    let hasAnswer = false;

    if (!question) return;

    if (question.type === 'multiselect') {
        const selected = Array.isArray(answers[qId]) ? answers[qId] : [];
        const minSelected = question.validation?.minselected ?? 1;
        hasAnswer = minSelected === 0 || selected.length >= minSelected;
    } else if (question.type === 'single_choice' || question.type === 'singlechoice') {
        hasAnswer = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
    } else if (question.type === 'slider') {
        hasAnswer = typeof answers[qId] === 'number';
    } else if (question.type === 'compound' && Array.isArray(question.items)) {
        hasAnswer = question.items.every(item => {
            if (item.type === 'multiselect') {
                const selected = Array.isArray(answers[item.id]) ? answers[item.id] : [];
                const minSelected = item.validation?.minselected ?? 1;
                return minSelected === 0 || selected.length >= minSelected;
            } else if (item.type === 'single_choice' || item.type === 'singlechoice') {
                return answers[item.id] !== undefined && answers[item.id] !== null && answers[item.id] !== '';
            } else if (item.type === 'slider') {
                return typeof answers[item.id] === 'number';
            } else {
                return true; // If unknown, skip validation
            }
        });
    } else if (question.type === 'grouped' && Array.isArray(question.questions)) {
        hasAnswer = question.questions.every(group => {
            if (group.type === 'multiselect') {
                const selected = Array.isArray(answers[group.id]) ? answers[group.id] : [];
                const minSelected = group.validation?.minselected ?? 1;
                return minSelected === 0 || selected.length >= minSelected;
            } else if (group.type === 'single_choice' || group.type === 'singlechoice') {
                return answers[group.id] !== undefined && answers[group.id] !== null && answers[group.id] !== '';
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

// ==================== DIAGNOSTIC FUNCTIONS ====================
// Debug function to check if PDF libraries are loaded
window.checkPDFLibraries = function() {
console.log('🔍 PDF Libraries Status:');
console.log('- jsPDF available:', typeof window.jsPDF !== 'undefined');
console.log('- html2canvas available:', typeof window.html2canvas !== 'undefined');
console.log('- generatePDF function:', typeof window.generatePDF);
console.log('- emailResultsWithPDF function:', typeof window.emailResultsWithPDF);
console.log('- printResults function:', typeof window.printResults);
};
// Check libraries when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
// Wait a bit for libraries to load
setTimeout(() => {
window.checkPDFLibraries();
}, 1000);
});
// Enhanced error logging
window.addEventListener('error', function(e) {
console.error('🚨 JavaScript Error:', e.error);
console.error('File:', e.filename);
console.error('Line:', e.lineno);
});