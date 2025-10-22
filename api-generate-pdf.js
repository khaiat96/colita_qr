// ==== Colita de Rana PDF and Email Backend ====

const express = require('express');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Debug information
console.log('Current working directory:', process.cwd());
console.log('Serving static files from:', __dirname);

// ✅ Serve your static frontend files (HTML, CSS, JS)
app.use(express.static(__dirname));

// ✅ Root route to render index.html when visiting "/"
app.get('/', (req, res) => {
  console.log('Someone visited the homepage');
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading index.html');
    }
  });
});

// ✅ Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// ✅ PDF generation and email endpoint
app.post('/api/generate-pdf', async (req, res) => {
  try {
    console.log('📩 PDF generation request received');

    const { resultsHTML, cssContent, email, sessionId } = req.body;

    if (!resultsHTML || !cssContent) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const completeHTML = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resultados - Colita de Rana</title>
          <style>
            ${cssContent}
          </style>
        </head>
        <body>
          ${resultsHTML}
        </body>
      </html>
    `;

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const pdfPath = path.join(tempDir, `results-${sessionId}.pdf`);

    console.log('🪄 Launching Puppeteer to generate PDF...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(completeHTML, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    console.log('✅ PDF generated successfully');

    // If an email was provided, send it as attachment
    if (email) {
      console.log(`📨 Sending results to ${email}...`);
      await transporter.sendMail({
        from: '"Colita de Rana" <noreply@colitaderana.club>',
        to: email,
        subject: '🌿 Tus resultados personalizados - Colita de Rana',
        html: `
          <h2>¡Gracias por completar nuestra encuesta!</h2>
          <p>Adjunto encontrarás tus resultados personalizados en PDF.</p>
          <p>Este reporte incluye tus recomendaciones y tips basados en tu tipo de ciclo.</p>
        `,
        attachments: [
          {
            filename: `resultados-colita-de-rana-${sessionId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      console.log(`✅ Email sent successfully to ${email}`);
    }

    // Send PDF back to browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resultados-colita-de-rana-${sessionId}.pdf"`
    );
    res.send(pdfBuffer);

    // Clean up temporary file
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }, 5000);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate or send PDF' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📂 Serving files from: ${__dirname}`);
});
