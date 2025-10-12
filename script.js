// Survey Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('surveyForm');
    const successMessage = document.getElementById('successMessage');
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Collect form data
        const formData = collectFormData();
        
        // Process the survey data
        processSurveyData(formData);
        
        // Show success message
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Handle "None" checkbox exclusivity
    setupExclusiveCheckboxes();
    
    // Handle allergy details visibility
    setupAllergyDetailsToggle();
    
    // Form validation
    setupFormValidation();
});

/**
 * Validate the form before submission
 */
function validateForm() {
    const form = document.getElementById('surveyForm');
    
    // Check if at least one goal is selected
    const goals = form.querySelectorAll('input[name="goals"]:checked');
    if (goals.length === 0) {
        alert('Please select at least one goal for your menstrual health.');
        return false;
    }
    
    // Check age is in reasonable range
    const age = parseInt(document.getElementById('age').value);
    if (age < 12 || age > 60) {
        alert('Please enter a valid age between 12 and 60.');
        return false;
    }
    
    // Check cycle length is reasonable
    const cycleLength = parseInt(document.getElementById('cycleLength').value);
    if (cycleLength < 21 || cycleLength > 45) {
        alert('Please enter a cycle length between 21 and 45 days.');
        return false;
    }
    
    // Check period duration is reasonable
    const periodDuration = parseInt(document.getElementById('periodDuration').value);
    if (periodDuration < 2 || periodDuration > 10) {
        alert('Please enter a period duration between 2 and 10 days.');
        return false;
    }
    
    return form.checkValidity();
}

/**
 * Collect all form data into a structured object
 */
function collectFormData() {
    const form = document.getElementById('surveyForm');
    const formData = {
        timestamp: new Date().toISOString(),
        personalInfo: {
            name: form.name.value || 'Anonymous',
            age: parseInt(form.age.value),
            email: form.email.value || 'Not provided'
        },
        menstrualCycle: {
            cycleLength: parseInt(form.cycleLength.value),
            periodDuration: parseInt(form.periodDuration.value),
            flowIntensity: form.flowIntensity.value,
            regularity: form.regularity.value
        },
        symptoms: {
            list: Array.from(form.querySelectorAll('input[name="symptoms"]:checked'))
                .map(cb => cb.value),
            painLevel: form.painLevel.value
        },
        lifestyle: {
            stressLevel: form.stressLevel.value,
            sleepQuality: form.sleepQuality.value,
            exerciseFrequency: form.exerciseFrequency.value,
            diet: form.diet.value
        },
        medicalHistory: {
            conditions: Array.from(form.querySelectorAll('input[name="conditions"]:checked'))
                .map(cb => cb.value),
            medications: form.medications.value || 'None',
            allergies: form.querySelector('input[name="allergies"]:checked').value,
            allergyDetails: form.allergyDetails.value || 'None'
        },
        goals: {
            primary: Array.from(form.querySelectorAll('input[name="goals"]:checked'))
                .map(cb => cb.value),
            herbalExperience: form.herbalExperience.value,
            preferences: Array.from(form.querySelectorAll('input[name="preferences"]:checked'))
                .map(cb => cb.value),
            additionalNotes: form.additionalNotes.value || 'None'
        },
        consent: form.consent.checked
    };
    
    return formData;
}

/**
 * Process the survey data and generate recommendations
 */
function processSurveyData(data) {
    console.log('Survey Data Collected:', data);
    
    // Generate personalized recommendations based on the data
    const recommendations = generateRecommendations(data);
    console.log('Generated Recommendations:', recommendations);
    
    // Store data locally (in a real application, this would be sent to a server)
    localStorage.setItem('lastSurveyData', JSON.stringify(data));
    localStorage.setItem('lastRecommendations', JSON.stringify(recommendations));
    
    // Display recommendations summary in console
    displayRecommendationsSummary(data, recommendations);
}

/**
 * Generate personalized herbal medicine recommendations
 */
function generateRecommendations(data) {
    const recommendations = {
        herbs: [],
        lifestyle: [],
        warnings: []
    };
    
    // Recommendations based on symptoms
    if (data.symptoms.list.includes('cramps')) {
        recommendations.herbs.push({
            name: 'Ginger',
            purpose: 'Reduces menstrual cramps and inflammation',
            form: 'Tea or capsule'
        });
        recommendations.herbs.push({
            name: 'Chamomile',
            purpose: 'Soothes cramps and promotes relaxation',
            form: 'Tea'
        });
    }
    
    if (data.symptoms.list.includes('mood_swings')) {
        recommendations.herbs.push({
            name: 'Evening Primrose Oil',
            purpose: 'Helps balance hormones and mood',
            form: 'Capsule'
        });
        recommendations.herbs.push({
            name: 'St. John\'s Wort',
            purpose: 'May improve mood and emotional well-being',
            form: 'Tea or tincture'
        });
    }
    
    if (data.symptoms.list.includes('fatigue')) {
        recommendations.herbs.push({
            name: 'Red Raspberry Leaf',
            purpose: 'Supports energy and uterine health',
            form: 'Tea'
        });
        recommendations.herbs.push({
            name: 'Nettle',
            purpose: 'Rich in iron, helps combat fatigue',
            form: 'Tea or capsule'
        });
    }
    
    // Recommendations based on flow intensity
    if (data.menstrualCycle.flowIntensity === 'heavy' || data.menstrualCycle.flowIntensity === 'very_heavy') {
        recommendations.herbs.push({
            name: 'Shepherd\'s Purse',
            purpose: 'May help reduce heavy menstrual bleeding',
            form: 'Tincture'
        });
        recommendations.herbs.push({
            name: 'Yarrow',
            purpose: 'Traditionally used for heavy periods',
            form: 'Tea or tincture'
        });
    }
    
    // Recommendations based on pain level
    if (data.symptoms.painLevel === 'moderate' || data.symptoms.painLevel === 'severe') {
        recommendations.herbs.push({
            name: 'Turmeric',
            purpose: 'Powerful anti-inflammatory for pain relief',
            form: 'Capsule or tea'
        });
        recommendations.herbs.push({
            name: 'Cramp Bark',
            purpose: 'Specifically targets menstrual cramps',
            form: 'Tincture or capsule'
        });
    }
    
    // Recommendations for irregular cycles
    if (data.menstrualCycle.regularity === 'irregular' || data.menstrualCycle.regularity === 'very_irregular') {
        recommendations.herbs.push({
            name: 'Vitex (Chasteberry)',
            purpose: 'Helps regulate menstrual cycles',
            form: 'Capsule or tincture'
        });
    }
    
    // Lifestyle recommendations
    if (data.lifestyle.stressLevel === 'high' || data.lifestyle.stressLevel === 'very_high') {
        recommendations.lifestyle.push('Practice stress-reduction techniques like yoga or meditation');
        recommendations.lifestyle.push('Consider adaptogenic herbs like Ashwagandha');
    }
    
    if (data.lifestyle.sleepQuality === 'fair' || data.lifestyle.sleepQuality === 'poor') {
        recommendations.lifestyle.push('Establish a regular sleep schedule');
        recommendations.lifestyle.push('Try calming herbal teas before bed (chamomile, valerian)');
    }
    
    if (data.lifestyle.exerciseFrequency === 'rarely' || data.lifestyle.exerciseFrequency === 'never') {
        recommendations.lifestyle.push('Incorporate gentle exercise like walking or yoga');
        recommendations.lifestyle.push('Exercise can help reduce menstrual symptoms');
    }
    
    // Warnings and precautions
    if (data.medicalHistory.allergies === 'yes') {
        recommendations.warnings.push('Caution: You have indicated allergies. Always check herbal ingredients carefully.');
    }
    
    if (data.medicalHistory.medications !== 'None' && data.medicalHistory.medications !== '') {
        recommendations.warnings.push('Important: Some herbs may interact with medications. Consult your healthcare provider.');
    }
    
    if (data.medicalHistory.conditions.includes('endometriosis') || 
        data.medicalHistory.conditions.includes('pcos') ||
        data.medicalHistory.conditions.includes('fibroids')) {
        recommendations.warnings.push('Medical condition detected: Consult with a healthcare professional before starting herbal treatments.');
    }
    
    return recommendations;
}

/**
 * Display recommendations summary in console
 */
function displayRecommendationsSummary(data, recommendations) {
    console.group('🌿 Personalized Herbal Medicine Recommendations');
    
    console.log('Patient Profile:');
    console.log('- Age:', data.personalInfo.age);
    console.log('- Primary Goals:', data.goals.primary.join(', '));
    console.log('- Pain Level:', data.symptoms.painLevel);
    console.log('- Cycle Regularity:', data.menstrualCycle.regularity);
    
    console.log('\nRecommended Herbs:');
    recommendations.herbs.forEach(herb => {
        console.log(`- ${herb.name}: ${herb.purpose} (${herb.form})`);
    });
    
    console.log('\nLifestyle Recommendations:');
    recommendations.lifestyle.forEach(rec => {
        console.log(`- ${rec}`);
    });
    
    if (recommendations.warnings.length > 0) {
        console.log('\n⚠️ Important Warnings:');
        recommendations.warnings.forEach(warning => {
            console.log(`- ${warning}`);
        });
    }
    
    console.groupEnd();
}

/**
 * Setup exclusive checkbox behavior for "None" options
 */
function setupExclusiveCheckboxes() {
    // Handle symptoms checkboxes
    const symptomsCheckboxes = document.querySelectorAll('input[name="symptoms"]');
    const symptomsNone = document.querySelector('input[name="symptoms"][value="none"]');
    
    if (symptomsNone) {
        symptomsNone.addEventListener('change', function() {
            if (this.checked) {
                symptomsCheckboxes.forEach(cb => {
                    if (cb !== symptomsNone) cb.checked = false;
                });
            }
        });
        
        symptomsCheckboxes.forEach(cb => {
            if (cb !== symptomsNone) {
                cb.addEventListener('change', function() {
                    if (this.checked) symptomsNone.checked = false;
                });
            }
        });
    }
    
    // Handle conditions checkboxes
    const conditionsCheckboxes = document.querySelectorAll('input[name="conditions"]');
    const conditionsNone = document.querySelector('input[name="conditions"][value="none"]');
    
    if (conditionsNone) {
        conditionsNone.addEventListener('change', function() {
            if (this.checked) {
                conditionsCheckboxes.forEach(cb => {
                    if (cb !== conditionsNone) cb.checked = false;
                });
            }
        });
        
        conditionsCheckboxes.forEach(cb => {
            if (cb !== conditionsNone) {
                cb.addEventListener('change', function() {
                    if (this.checked) conditionsNone.checked = false;
                });
            }
        });
    }
    
    // Handle preferences checkboxes
    const preferencesCheckboxes = document.querySelectorAll('input[name="preferences"]');
    const preferencesNone = document.querySelector('input[name="preferences"][value="no_preference"]');
    
    if (preferencesNone) {
        preferencesNone.addEventListener('change', function() {
            if (this.checked) {
                preferencesCheckboxes.forEach(cb => {
                    if (cb !== preferencesNone) cb.checked = false;
                });
            }
        });
        
        preferencesCheckboxes.forEach(cb => {
            if (cb !== preferencesNone) {
                cb.addEventListener('change', function() {
                    if (this.checked) preferencesNone.checked = false;
                });
            }
        });
    }
}

/**
 * Setup allergy details textarea visibility toggle
 */
function setupAllergyDetailsToggle() {
    const allergyRadios = document.querySelectorAll('input[name="allergies"]');
    const allergyDetails = document.getElementById('allergyDetails');
    
    allergyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                allergyDetails.style.display = 'block';
                allergyDetails.required = true;
            } else {
                allergyDetails.style.display = 'none';
                allergyDetails.required = false;
                allergyDetails.value = '';
            }
        });
    });
}

/**
 * Setup real-time form validation
 */
function setupFormValidation() {
    const form = document.getElementById('surveyForm');
    
    // Validate required fields on blur
    const requiredInputs = form.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (!this.validity.valid) {
                this.style.borderColor = '#DC143C';
            } else {
                this.style.borderColor = '#228B22';
            }
        });
    });
}

/**
 * Helper function to export survey data as JSON (for testing)
 */
function exportSurveyData() {
    const lastData = localStorage.getItem('lastSurveyData');
    if (lastData) {
        const blob = new Blob([lastData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'survey-data.json';
        a.click();
    }
}

// Make export function available globally for testing
window.exportSurveyData = exportSurveyData;
