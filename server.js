// Load environment variables from .env file (must be first)
require('dotenv').config();

const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 3000;

// --- 🔑 Maytapi API Configuration from .env 🔑 ---
const MAYTAPI_INSTANCE_ID = process.env.MAYTAPI_INSTANCE_ID;
const MAYTAPI_TOKEN = process.env.MAYTAPI_TOKEN;

// Critical check: Stop server if keys are missing from .env
if (!MAYTAPI_INSTANCE_ID || !MAYTAPI_TOKEN) {
    console.error("❌ FATAL: MAYTAPI_INSTANCE_ID or MAYTAPI_TOKEN not found in .env file. Please check the file and restart.");
    process.exit(1); 
}

// Maytapi Send Message Endpoint URL
const MAYTAPI_URL = `https://api.maytapi.com/api/${MAYTAPI_INSTANCE_ID}/sendMessage`;

// --- Middleware Setup ---
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies
app.use(express.static(path.join(__dirname, ''))); // Serve static files (like index.html)

// --- 1. Static Page Route (GET) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 2. Message Sending Route (POST) ---
app.post('/send-message', async (req, res) => {
  const { countryCode, phoneNumber, message } = req.body;
  
  // Prepare number: Remove '+' and spaces to get the format Maytapi expects (e.g., 919876543210)
  const recipientNumber = (countryCode + phoneNumber).replace('+', '').replace(/\s/g, ''); 
  
  if (!recipientNumber || !message) {
    return res.status(400).json({ success: false, message: 'Recipient number and message are required.' });
  }

  // Maytapi Payload for a simple Text Message
  const payload = {
    to_number: recipientNumber,
    message: message
  };

  try {
    // Send the request to Maytapi API
    const response = await axios.post(MAYTAPI_URL, payload, {
      headers: {
        'x-maytapi-key': MAYTAPI_TOKEN, // Authentication token
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success) {
        // Success response from Maytapi
        console.log(`✅ Message successfully queued to ${recipientNumber}. Maytapi ID: ${response.data.message_id}`);
        res.json({ 
            success: true, 
            message: `Message sent to ${recipientNumber}.`,
            data: response.data
        });
    } else {
        // Maytapi returned a non-success flag
        console.error('❌ Maytapi reported failure:', response.data);
        res.status(500).json({
            success: false,
            message: 'Maytapi reported an error. Check their response data for details.',
            details: response.data
        });
    }

  } catch (error) {
    // Handle network errors or non-200 HTTP responses from Maytapi
    console.error('❌ Network or API Connection Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
        success: false, 
        message: 'Failed to connect to Maytapi API. Check console for details.',
        details: error.response ? error.response.data : error.message
    });
  }
});

// --- Server Listen ---
app.listen(port, () => {
  console.log(`\n\n--- 🟢 Server Started ---`);
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Maytapi Instance ID: ${MAYTAPI_INSTANCE_ID}`);
  console.log('------------------------\n');
});
