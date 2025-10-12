# Demo Guide - Menstrual Health Survey Application

## Quick Start Demo

### 1. View the Survey Locally

Open the survey application in your browser:

```bash
# Navigate to the project directory
cd colita_qr

# Start a simple HTTP server (Python 3)
python3 -m http.server 8080

# Or use Python 2
python -m SimpleHTTPServer 8080

# Or use Node.js
npx http-server -p 8080
```

Then open your browser to: `http://localhost:8080/index.html`

### 2. Test the Survey Form

Try filling out the form with sample data:

**Personal Information:**
- Age: 28
- Name & Email: Optional

**Menstrual Cycle:**
- Cycle Length: 28 days
- Period Duration: 5 days
- Flow Intensity: Moderate
- Regularity: Regular

**Symptoms:**
- Check: Cramps, Mood Swings, Fatigue
- Pain Level: Moderate

**Lifestyle:**
- Stress Level: Moderate
- Sleep Quality: Good
- Exercise: 3-5 times per week
- Diet: Vegetarian

**Medical History:**
- Conditions: None
- Medications: Leave blank
- Allergies: No

**Goals:**
- Check: Reduce menstrual pain, Overall menstrual wellness
- Herbal Experience: Some experience
- Preferences: Herbal Teas

**Consent:**
- Check the consent box

Click "Submit Survey" to see the success message!

### 3. View Recommendations in Console

After submitting the form:
1. Open browser Developer Tools (F12)
2. Go to the Console tab
3. You'll see personalized recommendations based on your inputs

Example output:
```
🌿 Personalized Herbal Medicine Recommendations
Patient Profile:
- Age: 28
- Primary Goals: reduce_pain, overall_wellness
- Pain Level: moderate
- Cycle Regularity: regular

Recommended Herbs:
- Ginger: Reduces menstrual cramps and inflammation (Tea or capsule)
- Chamomile: Soothes cramps and promotes relaxation (Tea)
...
```

### 4. Generate QR Code

1. Open `http://localhost:8080/qr-generator.html`
2. Enter the full URL of your survey (e.g., `http://localhost:8080/index.html`)
3. Click "Generate QR Code"
4. Download the QR code image
5. Share the QR code on flyers, posters, or social media

### 5. Deploy to GitHub Pages

1. Go to your repository settings
2. Navigate to Pages section
3. Select "Deploy from branch"
4. Choose your main branch
5. Your survey will be available at: `https://yourusername.github.io/colita_qr/`

### 6. View Stored Data

The application stores survey responses locally. To view them:

1. Open browser Developer Tools (F12)
2. Go to the Application/Storage tab
3. Click on Local Storage
4. View the stored survey data

Or in the Console, type:
```javascript
// View last survey data
JSON.parse(localStorage.getItem('lastSurveyData'))

// View last recommendations
JSON.parse(localStorage.getItem('lastRecommendations'))
```

## Sample Use Cases

### For Healthcare Providers
- Share QR code with patients during visits
- Include in educational materials
- Use for preliminary assessments

### For Wellness Centers
- Print QR codes on brochures
- Display on waiting room screens
- Include in intake forms

### For Research Studies
- Collect menstrual health data
- Track symptom patterns
- Evaluate herbal remedy preferences

## Tips for Best Results

1. **Mobile-First**: The survey is optimized for mobile devices
2. **Privacy**: Inform users that data is stored locally
3. **Follow-Up**: Use collected information for personalized consultations
4. **Education**: Share the recommendations with users
5. **Compliance**: Always include medical disclaimers

## Troubleshooting

**QR Code Not Generating:**
- Ensure you have internet connection (uses CDN for QR library)
- Enter a complete URL including https://

**Form Won't Submit:**
- Check all required fields (marked with *)
- Ensure at least one goal is selected
- Verify consent checkbox is checked

**Styling Issues:**
- Clear browser cache
- Ensure styles.css is in the same directory as index.html
- Check for JavaScript errors in console

## Next Steps

1. Customize the questions for your specific needs
2. Add backend integration to store data securely
3. Implement email notifications
4. Create admin dashboard for viewing responses
5. Add data export functionality

---

For more information, see the main [README.md](README.md) file.
