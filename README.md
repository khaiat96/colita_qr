# Colita QR - Menstrual Health Survey Application 🌿

A comprehensive web-based survey application designed to collect personalized information for herbal medicine recommendations for menstrual health. This application provides an intuitive, accessible interface for users to share their menstrual health information and receive tailored herbal medicine suggestions.

## 🎯 Purpose

This survey application serves as an introduction to a comprehensive personalized herbal medicine system for menstrual health. It collects detailed information about:

- Menstrual cycle patterns
- Symptoms and pain levels
- Lifestyle factors
- Medical history
- Personal goals and preferences

Based on the collected data, the system provides personalized herbal medicine recommendations to support menstrual health and overall wellness.

## ✨ Features

### Comprehensive Survey Sections

1. **Personal Information**
   - Basic demographic data
   - Optional contact information

2. **Menstrual Cycle Information**
   - Cycle length and duration
   - Flow intensity
   - Regularity patterns

3. **Symptoms Assessment**
   - Common menstrual symptoms
   - Pain level evaluation
   - Impact on daily activities

4. **Lifestyle & Health Background**
   - Stress levels
   - Sleep quality
   - Exercise frequency
   - Dietary preferences

5. **Medical History**
   - Pre-existing conditions (PCOS, endometriosis, etc.)
   - Current medications and supplements
   - Allergies to herbs or plants

6. **Goals & Preferences**
   - Primary health goals
   - Herbal medicine experience
   - Preferred remedy forms (teas, capsules, tinctures, etc.)

### Key Functionalities

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Form Validation**: Real-time validation with helpful error messages
- **Smart Logic**: Exclusive checkbox behavior for "None" options
- **Accessibility**: WCAG compliant with proper labels and keyboard navigation
- **Data Collection**: Structured data collection with localStorage support
- **Personalized Recommendations**: Automatic generation of herbal medicine suggestions
- **QR Code Integration**: Easy access via QR codes for surveys

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/khaiat96/colita_qr.git
cd colita_qr
```

2. Open the survey application:
   - Simply open `index.html` in a web browser
   - No build process or dependencies required!

### Deployment

The application is a static website and can be deployed to any web hosting service:

- **GitHub Pages**: Enable in repository settings
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **Traditional hosting**: Upload files via FTP

### QR Code Generation

1. Open `qr-generator.html` in your browser
2. Enter your deployed survey URL
3. Click "Generate QR Code"
4. Download the QR code image
5. Share on flyers, posters, or digital materials

## 📋 Usage

### For Survey Administrators

1. Deploy the application to your hosting service
2. Generate a QR code pointing to your survey URL
3. Share the QR code or direct link with participants
4. Collect responses (note: current version stores data locally)

### For Survey Participants

1. Scan the QR code or visit the survey URL
2. Fill out all required fields marked with *
3. Review your responses
4. Submit the survey
5. View the success confirmation

## 🔧 Customization

### Modifying Questions

Edit `index.html` to add, remove, or modify questions:

```html
<div class="form-group">
    <label for="yourField">Your Question: <span class="required">*</span></label>
    <input type="text" id="yourField" name="yourField" required>
</div>
```

### Styling Changes

Edit `styles.css` to customize colors, fonts, and layout:

```css
:root {
    --primary-color: #6B8E23;  /* Change to your brand color */
    --secondary-color: #8FBC8F;
    --accent-color: #D8BFD8;
}
```

### Adding Backend Integration

Modify `script.js` to send data to a server:

```javascript
function processSurveyData(data) {
    // Send to your backend API
    fetch('https://your-api.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}
```

## 🌿 Herbal Medicine Recommendations

The application generates personalized recommendations based on:

### Symptom-Based Recommendations

- **Cramps**: Ginger, Chamomile
- **Mood Swings**: Evening Primrose Oil, St. John's Wort
- **Fatigue**: Red Raspberry Leaf, Nettle
- **Heavy Flow**: Shepherd's Purse, Yarrow

### Condition-Based Recommendations

- **Irregular Cycles**: Vitex (Chasteberry)
- **Pain Management**: Turmeric, Cramp Bark
- **Stress Relief**: Adaptogenic herbs

### Safety Features

- Allergy warnings
- Medication interaction alerts
- Condition-specific precautions

## 📱 Technology Stack

- **HTML5**: Semantic markup for accessibility
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks required
- **QRCode.js**: QR code generation library
- **localStorage**: Client-side data persistence

## 🔒 Privacy & Data Security

- Survey responses are currently stored locally in the browser
- No data is transmitted to external servers by default
- Users provide consent before submitting
- All fields are optional except those critical for recommendations

**Important**: This is a prototype. For production use, implement proper backend security, HIPAA compliance, and encrypted data transmission.

## ⚠️ Disclaimer

This survey application is designed for educational and informational purposes only. It does not provide medical advice, diagnosis, or treatment. Users should:

- Consult healthcare professionals before starting any herbal treatment
- Inform their doctors about all supplements and herbs they take
- Be aware of potential herb-drug interactions
- Seek immediate medical attention for severe symptoms

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Areas for improvement:

- Backend integration for data storage
- Advanced analytics and visualization
- Multi-language support
- More herbal medicine recommendations
- Integration with appointment scheduling

## 📄 License

This project is open source and available under the MIT License.

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Made with 🌿 for menstrual health and wellness**