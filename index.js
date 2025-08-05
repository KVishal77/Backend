const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
require('dotenv').config();
const { db } = require('./firebase');
const OpenAI = require('openai');

const app = express();

// ✅ Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// ✅ Configure file uploads (optional)
const upload = multer({
    storage: multer.memoryStorage(),
});

// ✅ AI Suggestion Route
app.post('/suggest', async (req, res) => {
    const { plantName } = req.body;

    const prompt = `
Return plant care data for "${plantName}" in this exact JSON format:

{
  "scientific_name": "",
  "sunlight": "",
  "watering": "",
  "soil": "",
  "seasonality": "",
  "uses_notes": "",
  "image": "<direct JPG or PNG URL of WHOLE PLANT from Wikimedia Commons (not fruit, not logo, not drawing)>"
}

Rules:
- Use only Wikimedia Commons images (not fruits or parts).
- Avoid logos, icons, illustrations, or SVGs.
- If you can't find a Wikimedia Commons image, leave the "image" field empty.
- Return ONLY the JSON. No explanations or markdown.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
        });

        let content = completion.choices[0].message.content;

        // ✅ Remove markdown formatting if present
        if (content.includes('```')) {
            content = content.replace(/```json|```/g, '').trim();
        }

        let suggestions;
        try {
            suggestions = JSON.parse(content);
        } catch (err) {
            console.error('❌ JSON Parse Error:', err.message);
            return res.status(400).json({ error: 'Invalid JSON from OpenAI.' });
        }

        // ✅ Fallback image if missing or invalid
        if (
            !suggestions.image ||
            !suggestions.image.includes('wikimedia') ||
            suggestions.image.endsWith('.svg')
        ) {
            suggestions.image = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Plant_icon.svg/512px-Plant_icon.svg.png';
        }

        // ✅ Attach original name
        suggestions.name = plantName;

        // ✅ Send structured JSON back to frontend
        res.json({ suggestions });
    } catch (err) {
        console.error('❌ OpenAI Error:', err.message);
        res.status(500).json({ error: 'AI Error' });
    }
});

// ✅ Start Server
app.listen(5000, () => {
    console.log('✅ Backend running at http://localhost:5000');
});