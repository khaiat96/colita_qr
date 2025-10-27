/**
 * PDF Generation Utility for Colita de Rana Survey
 * This utility provides multiple PDF generation methods with fallback options
 */

class PDFGenerator {
  constructor() {
    this.isGenerating = false;
  }

  /**
   * Main PDF generation method with multiple fallback options
   */
  async generatePDF(options = {}) {
    if (this.isGenerating) {
      console.warn('PDF generation already in progress');
      return;
    }

    this.isGenerating = true;
    
    try {
      const resultsCard = document.getElementById('results-card');
      if (!resultsCard) {
        throw new Error('Results card not found');
      }

      const config = {
        format: 'a4',
        orientation: 'portrait',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        filename: `colita-de-rana-resultados-${new Date().toISOString().split('T')[0]}.pdf`,
        ...options
      };

      // Try different PDF generation methods in order of preference
      const methods = [
        () => this.generateWithJSPDF(resultsCard, config),
        () => this.generateWithPrintAPI(resultsCard, config),
        () => this.generateWithCanvas(resultsCard, config),
        () => this.generateSimplePrint(resultsCard, config)
      ];

      for (const method of methods) {
        try {
          await method();
          console.log('✅ PDF generated successfully');
          return;
        } catch (error) {
          console.warn('PDF method failed:', error.message);
          continue;
        }
      }

      throw new Error('All PDF generation methods failed');

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      this.showError('Error generating PDF. Please try printing instead.');
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate PDF using jsPDF library (best quality)
   */
  async generateWithJSPDF(container, config) {
    if (typeof window.jsPDF === 'undefined') {
      throw new Error('jsPDF library not loaded');
    }

    const { jsPDF } = window.jsPDF;
    const pdf = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.format
    });

    // Create temporary container with optimized content for PDF
    const tempContainer = this.createOptimizedContainer(container);
    document.body.appendChild(tempContainer);

    try {
      // Use html2canvas to convert to image
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 190; // A4 width minus margins
      const pageHeight = 297; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = config.margin.top;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', config.margin.left, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - config.margin.top - config.margin.bottom;

      // Add new pages if content is too long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + config.margin.top;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', config.margin.left, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - config.margin.top - config.margin.bottom;
      }

      // Save the PDF
      pdf.save(config.filename);

    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * Generate PDF using browser's print API (good fallback)
   */
  async generateWithPrintAPI(container, config) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup blocked - cannot open print window');
    }

    const printHTML = this.createPrintHTML(container);
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.onload = resolve;
      setTimeout(resolve, 1000); // Fallback timeout
    });

    // Trigger print dialog
    printWindow.focus();
    printWindow.print();

    // Close window after printing
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  }

  /**
   * Generate PDF using canvas method (experimental)
   */
  async generateWithCanvas(container, config) {
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library not loaded');
    }

    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Create download link
    const link = document.createElement('a');
    link.download = config.filename.replace('.pdf', '.png');
    link.href = canvas.toDataURL();
    link.click();
  }

  /**
   * Simple print method as ultimate fallback
   */
  async generateSimplePrint(container, config) {
    // Store original content
    const originalBody = document.body.innerHTML;
    
    try {
      // Create print-friendly content
      const printContent = this.createSimplePrintHTML(container);
      document.body.innerHTML = printContent;
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Print
      window.print();
      
    } finally {
      // Restore original content
      document.body.innerHTML = originalBody;
      location.reload();
    }
  }

  /**
   * Create optimized container for PDF generation
   */
  createOptimizedContainer(originalContainer) {
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      background: white;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      font-size: 14px;
    `;

    // Clone and optimize content
    const optimizedContent = this.optimizeContentForPDF(originalContainer.cloneNode(true));
    tempContainer.appendChild(optimizedContent);

    return tempContainer;
  }

  /**
   * Optimize content specifically for PDF generation
   */
  optimizeContentForPDF(clone) {
    // Remove interactive elements
    const elementsToRemove = clone.querySelectorAll(`
      .pdf-actions,
      .waitlist-results-form,
      .btn-send-results,
      .survey-navigation,
      .survey-header,
      .btn-pdf-action,
      .email-form-container,
      #pdf-email,
      .btn-send-pdf
    `);
    elementsToRemove.forEach(el => el.remove());

    // Simplify gradients and complex styling
    const styledElements = clone.querySelectorAll('[style*="gradient"], [class*="gradient"]');
    styledElements.forEach(el => {
      el.style.background = '#00D4AA';
      el.style.backgroundColor = '#00D4AA';
      el.style.color = '#ffffff';
    });

    // Ensure proper text colors
    const headings = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      h.style.color = '#00D4AA';
      h.style.background = 'none';
      h.style.webkitBackgroundClip = 'initial';
      h.style.webkitTextFillColor = 'initial';
    });

    return clone;
  }

  /**
   * Create print HTML for print API method
   */
  createPrintHTML(container) {
    const optimizedContent = this.optimizeContentForPDF(container.cloneNode(true));
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Resultados Colita de Rana</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            font-size: 12px;
            padding: 20px;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #00D4AA;
          }
          
          .print-header h1 {
            color: #00D4AA;
            font-size: 24px;
            margin-bottom: 10px;
          }
          
          .print-header .subtitle {
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .print-header .date {
            color: #999;
            font-size: 11px;
          }
          
          .pdf-results-card {
            background: #f9f9f9;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          h2 {
            color: #00D4AA;
            font-size: 20px;
            margin-bottom: 15px;
            text-align: center;
          }
          
          h3 {
            color: #666;
            font-size: 16px;
            margin-bottom: 20px;
            text-align: center;
          }
          
          h4 {
            color: #00D4AA;
            font-size: 14px;
            margin: 15px 0 8px 0;
            font-weight: 600;
          }
          
          h5 {
            color: #00D4AA;
            font-size: 13px;
            margin: 12px 0 6px 0;
            font-weight: 600;
          }
          
          p {
            margin-bottom: 10px;
            color: #555;
          }
          
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          
          li {
            margin-bottom: 5px;
            color: #555;
            line-height: 1.4;
          }
          
          .pattern-description {
            background: #f8f9fa;
            border-left: 4px solid #00D4AA;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 6px 6px 0;
          }
          
          .characteristics li {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 6px;
          }
          
          .recommendations {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .recommendations-list li {
            background: white;
            border-left: 3px solid #00D4AA;
            border-radius: 0 4px 4px 0;
            padding: 8px 12px;
            margin-bottom: 6px;
          }
          
          .phase-section {
            margin-top: 20px;
          }
          
          .phase-block {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 12px;
          }
          
          .cdr-section {
            background: #f0f8ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .results-disclaimer {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 12px;
            margin-top: 20px;
            font-size: 10px;
            color: #856404;
          }
          
          @media print {
            body {
              padding: 10px;
              font-size: 11px;
            }
            
            .pdf-results-card {
              border: 1px solid #ddd;
            }
            
            .phase-block,
            .cdr-section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>🌿 Colita de Rana</h1>
          <div class="subtitle">Tu Medicina Personalizada</div>
          <div class="date">Generado el ${new Date().toLocaleDateString('es-MX')}</div>
        </div>
        
        <div class="pdf-results-card">
          ${optimizedContent.innerHTML}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create simple print HTML
   */
  createSimplePrintHTML(container) {
    const optimizedContent = this.optimizeContentForPDF(container.cloneNode(true));
    
    return `
      <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #00D4AA; padding-bottom: 20px;">
          <h1 style="color: #00D4AA; font-size: 28px; margin-bottom: 10px;">🌿 Colita de Rana</h1>
          <p style="color: #666; font-size: 16px;">Tu Medicina Personalizada</p>
          <p style="color: #999; font-size: 12px;">Generado el ${new Date().toLocaleDateString('es-MX')}</p>
        </div>
        <div style="background: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 12px; padding: 25px;">
          ${optimizedContent.innerHTML}
        </div>
      </div>
    `;
  }

  /**
   * Email results with PDF attachment
   */
  async emailResultsWithPDF(email) {
    if (!email || !email.includes('@')) {
      this.showError('Por favor ingresa un correo válido.');
      return;
    }

    try {
      const resultsCard = document.getElementById('results-card');
      if (!resultsCard) {
        throw new Error('No results found');
      }

      // Generate PDF HTML content
      const pdfHTML = this.createPrintHTML(resultsCard);
      
      // Prepare payload for webhook
      const payload = {
        email: email,
        session_id: window.sessionId || 'session_' + Date.now(),
        timestamp: new Date().toISOString(),
        answers: window.answers || {},
        pdf_html: pdfHTML,
        results_content: resultsCard.innerHTML,
        type: 'survey_results_with_pdf'
      };

      // Send to webhook
      const response = await fetch(window.EMAIL_REPORT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.showSuccess('¡Resultados enviados por correo con PDF adjunto!');
      
    } catch (error) {
      console.error('❌ Failed to send results with PDF:', error);
      this.showError('Error enviando los resultados. Por favor intenta de nuevo.');
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #00D4AA;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 4000);
  }

  /**
   * Show error message
   */
  showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4757;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 4000);
  }
}

// Create global instance
window.pdfGenerator = new PDFGenerator();

// Export functions for global use
window.generatePDF = () => window.pdfGenerator.generatePDF();
window.emailResultsWithPDF = (email) => window.pdfGenerator.emailResultsWithPDF(email);
window.printResults = () => window.pdfGenerator.generateSimplePrint(document.getElementById('results-card'));