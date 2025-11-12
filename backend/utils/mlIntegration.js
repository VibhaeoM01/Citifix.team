const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// ML API configuration
const ML_API_BASE_URL = process.env.ML_API_URL || 'http://localhost:5002';

// Call ML API for image analysis
const callMLAPI = async (imagePath, description) => {
  try {
    console.log('ML API Call Starting:', {
      imagePath,
      hasDescription: !!description,
      mlApiUrl: ML_API_BASE_URL
    });

    // Validate image exists and is accessible
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }

    // Check file permissions
    try {
      await fs.promises.access(imagePath, fs.constants.R_OK);
    } catch (err) {
      throw new Error(`Cannot read image file: ${err.message}`);
    }

    // Validate file size
    const stats = fs.statSync(imagePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > 10) { // 10MB limit
      throw new Error(`Image file too large: ${fileSizeMB.toFixed(2)}MB (max 10MB)`);
    }

    console.log('File validation passed:', {
      size: `${fileSizeMB.toFixed(2)}MB`,
      path: imagePath
    });

    // Create form data with validation
    const formData = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    formData.append('file', fileStream);  // We want to use 'file' here as that's what Flask expects
    if (description) {
      if (typeof description !== 'string') {
        console.warn('Description is not a string, converting...');
        description = String(description);
      }
      formData.append('description', description);
    }
    
    // Log request details for debugging
    console.log('ML API Request:', {
      url: `${ML_API_BASE_URL}/predict`,
      hasFile: !!fileStream,
      hasDescription: !!description,
      // form-data package doesn't support entries(), just log the keys we know we added
      formDataFields: ['file', ...(description ? ['description'] : [])]
    });

    // Test ML API connection with retries (regardless of description)
    let healthCheck = false;
    let retries = 3;
    while (retries > 0 && !healthCheck) {
      try {
        healthCheck = await testMLConnection();
        if (healthCheck) break;
      } catch (err) {
        console.warn(`ML API health check failed (${retries} retries left):`, err.message);
        retries--;
        if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!healthCheck) {
      console.warn('ML API health check failed after retries, using fallback analysis');
      const fallback = description ? analyzeDescription(description || '') : {
        caption: 'Unable to process image',
        predictedCategory: 'Other',
        predictedUrgency: 'medium',
        confidence: 0.3
      };
      return {
        ...fallback,
        source: 'fallback_health_check_failed'
      };
    }

    console.log('Sending image to ML API...');
    const response = await axios.post(`${ML_API_BASE_URL}/predict`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json'
      },
      timeout: 60000, // 60 seconds timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB limit
      maxBodyLength: 50 * 1024 * 1024, // 50MB limit
      validateStatus: status => status < 500 // Only reject on server errors
    }).catch(err => {
      // Network / server error
      throw new Error(`Failed to call ML API: ${err.message}`);
    });

    // Log response basics
  console.log('ML API response status:', response.status);
    try {
      console.log('ML API response headers:', JSON.stringify(response.headers || {}, null, 2));
    } catch (e) {
      // ignore
    }

    // Ensure we can interpret the body even if it's not JSON
    let respData = response.data;
    if (typeof respData === 'string') {
      // Try to parse JSON string
      try {
        respData = JSON.parse(respData);
      } catch (e) {
        // Not JSON - include raw text in error for debugging
        throw new Error(`ML API returned non-JSON response (status ${response.status}): ${respData}`);
      }
    }

    // Handle different response status codes
    if (response.status === 429) {
      throw new Error('ML API rate limit exceeded, please try again later');
    } else if (response.status === 413) {
      throw new Error('Image file size too large for ML API');
    } else if (response.status === 415) {
      throw new Error('Unsupported image format');
    } else if (response.status !== 200) {
      throw new Error(`ML API Error: ${respData?.message || response.statusText}`);
    }

    if (!respData) {
      throw new Error('ML API returned empty response');
    }

  console.log('ML API RAW RESPONSE:', JSON.stringify(respData, null, 2));
    
  // Extract results from nested structure
  const results = respData.results || respData;
  const {
    predicted_class,
    confidence,
    category,
    priority,
    caption,
    predictedCategory: apiPredictedCategory,
    predictedUrgency: apiPredictedUrgency,
    uncertain
  } = results;

  // Normalize confidence from API (may arrive as percentage string)
  let normalizedConfidence = 0.5;
  if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
    normalizedConfidence = confidence;
  } else if (typeof confidence === 'string') {
    const parsed = parseFloat(confidence.replace(/%/g, ''));
    if (!Number.isNaN(parsed)) {
      normalizedConfidence = parsed > 1 ? parsed / 100 : parsed;
    }
  }
  
  // Validate ML response
  if ((!predicted_class && !category) || !results) {
    console.error('Invalid ML response structure:', JSON.stringify(respData, null, 2));
    throw new Error('Invalid ML API response: missing classification data');
  }

    console.log('ML API EXTRACTED VALUES:', {
      predicted_class,
      confidence_raw: confidence,
      confidence_normalized: normalizedConfidence,
      category,
      priority,
      caption
    });
      
    // Enhanced category and urgency mapping
  // Prefer API-provided mapped fields if present
  let predictedCategory = apiPredictedCategory || category || 'Other';
  let predictedUrgency = apiPredictedUrgency || priority || 'medium';
      
      // More detailed category mapping
      if (!apiPredictedCategory && predicted_class) {
        const classLower = predicted_class.toLowerCase();
        switch(classLower) {
          case 'pothole':
          case 'road damage':
          case 'crack':
            predictedCategory = 'Road Issues';
            predictedUrgency = 'high';
            break;
          case 'garbage':
          case 'waste':
          case 'manhole':
          case 'drain':
            predictedCategory = 'Sanitation';
            predictedUrgency = classLower === 'manhole' || classLower === 'drain' ? 'high' : 'medium';
            break;
          case 'street light':
          case 'light pole':
            predictedCategory = 'Street Lighting';
            predictedUrgency = classLower.includes('broken') ? 'high' : 'medium';
            break;
          case 'water':
          case 'leakage':
          case 'pipe':
            predictedCategory = 'Water Supply';
            predictedUrgency = classLower.includes('leak') ? 'high' : 'medium';
            break;
        }
      }

      // Consider description for additional context but do NOT automatically override ML
      // Return description analysis alongside ML results so caller can decide.
      let descriptionAnalysis = null;
      if (description) {
        descriptionAnalysis = analyzeDescription(description);
        console.log('Description analysis:', descriptionAnalysis);
        // Only override when ML did not provide a category at all
        if ((!predicted_class && !apiPredictedCategory && !category) || !predictedCategory) {
          predictedCategory = descriptionAnalysis.predictedCategory;
          predictedUrgency = descriptionAnalysis.predictedUrgency;
        }
      }
      
      const lowConfidence = normalizedConfidence < 0.5;
      const suggestedCategory = predictedCategory;
      if (lowConfidence) {
        console.warn('ML confidence below threshold, marking result as low confidence');
        predictedUrgency = 'medium';
      }

      const result = {
        caption: caption || 'No caption generated',
        predictedCategory: lowConfidence ? 'Other' : predictedCategory,
        predictedUrgency: predictedUrgency,
        confidence: normalizedConfidence,
        detectedClass: predicted_class,
        uncertain: !!uncertain,
        source: 'ml_api',
        descriptionAnalysis: descriptionAnalysis,
        lowConfidence,
        suggestedCategory: lowConfidence ? suggestedCategory : null
      };
      
      console.log('ML API RETURNING:', JSON.stringify(result, null, 2));
      return result;
    // (No dangling else) — always return above after processing
  } catch (error) {
    console.error('ML API call failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Enhanced fallback logic
    if (description) {
      const fallbackResult = analyzeDescription(description);
      fallbackResult.source = 'fallback';
      return fallbackResult;
    }
    
    // Default fallback if no description available
    return {
      caption: 'Unable to process image',
      predictedCategory: 'Other',
      predictedUrgency: 'medium',
      confidence: 0.3,
      source: 'error_fallback'
    };
  }
};

// Fallback analysis based on description keywords
const analyzeDescription = (description) => {
  const text = description.toLowerCase();
  
  // Category detection
  let category = 'Other';
  if (text.includes('road') || text.includes('pothole') || text.includes('street')) {
    category = 'Road Issues';
  } else if (text.includes('water') || text.includes('supply') || text.includes('pipe')) {
    category = 'Water Supply';
  } else if (text.includes('electric') || text.includes('power') || text.includes('light')) {
    category = 'Electricity';
  } else if (text.includes('sanitation') || text.includes('sewage') || text.includes('drain')) {
    category = 'Sanitation';
  } else if (text.includes('light') || text.includes('street light')) {
    category = 'Street Lighting';
  } else if (text.includes('transport') || text.includes('bus') || text.includes('metro')) {
    category = 'Public Transport';
  } else if (text.includes('park') || text.includes('garden') || text.includes('recreation')) {
    category = 'Parks & Recreation';
  } else if (text.includes('noise') || text.includes('sound')) {
    category = 'Noise Pollution';
  } else if (text.includes('air') || text.includes('pollution') || text.includes('smoke')) {
    category = 'Air Pollution';
  } else if (text.includes('waste') || text.includes('garbage') || text.includes('trash')) {
    category = 'Sanitation';
  } else if (text.includes('traffic') || text.includes('congestion')) {
    category = 'Traffic Management';
  } else if (text.includes('safety') || text.includes('security') || text.includes('crime')) {
    category = 'Public Safety';
  } else if (text.includes('health') || text.includes('hospital') || text.includes('medical')) {
    category = 'Healthcare';
  } else if (text.includes('school') || text.includes('education') || text.includes('college')) {
    category = 'Education';
  }

  // Urgency detection
  let urgency = 'medium';
  const urgentKeywords = ['emergency', 'urgent', 'critical', 'dangerous', 'broken', 'damaged', 'leak', 'fire', 'accident'];
  const lowUrgencyKeywords = ['suggestion', 'improvement', 'maintenance', 'upgrade', 'beautification'];
  
  if (urgentKeywords.some(keyword => text.includes(keyword))) {
    urgency = 'high';
  } else if (lowUrgencyKeywords.some(keyword => text.includes(keyword))) {
    urgency = 'low';
  }

  return {
    caption: `Complaint about ${category.toLowerCase()}`,
    predictedCategory: category,
    predictedUrgency: urgency,
    confidence: 0.6
  };
};

// Test ML API connection
const testMLConnection = async () => {
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/health`, {
      timeout: 5000
    });
    console.log('ML API is running:', response.data);
    return true;
  } catch (error) {
    console.log('ML API is not available:', error.message);
    return false;
  }
};

// Get ML model statistics
const getMLStats = async () => {
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/stats`, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get ML stats:', error.message);
    return null;
  }
};

module.exports = {
  callMLAPI,
  testMLConnection,
  getMLStats,
  analyzeDescription
}; 