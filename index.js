const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const { Readable } = require('stream');
const OpenAI = require('openai');
require('dotenv').config();

const { db, bucket } = require('./firebase');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
  "image": "<Wikimedia image URL>"
}
Rules:
- Use only Wikimedia Commons images (not fruits or parts).
- Avoid logos, icons, illustrations, or SVGs.
- Return ONLY the JSON. No markdown or explanation.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
        });

        let content = completion.choices[0].message.content;

        if (content.includes('```')) {
            content = content.replace(/```json|```/g, '').trim();
        }

        let suggestions;
        try {
            suggestions = JSON.parse(content);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid JSON from OpenAI' });
        }

        // ✅ Validate/fallback image
        if (
            !suggestions.image ||
            !suggestions.image.includes('wikimedia') ||
            suggestions.image.endsWith('.svg')
        ) {
            suggestions.image =
                'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Plant_icon.svg/512px-Plant_icon.svg.png';
        }

        suggestions.name = plantName;
        res.json({ suggestions });
    } catch (err) {
        console.error('❌ OpenAI Error:', err.message);
        res.status(500).json({ error: 'AI Error' });
    }
});

// ✅ Upload Plant Route
app.post('/addplant', upload.single('image'), async (req, res) => {
    try {
        const {
            name,
            scientific_name,
            sunlight,
            watering,
            soil,
            seasonality,
            uses_notes,
            userEmail,
        } = req.body;

        let imageUrl = '';
        if (req.file) {
            const blob = bucket.file(`plants/${Date.now()}_${req.file.originalname}`);
            const blobStream = blob.createWriteStream({
                metadata: { contentType: req.file.mimetype },
            });

            const readableStream = new Readable();
            readableStream.push(req.file.buffer);
            readableStream.push(null);
            readableStream.pipe(blobStream);

            await new Promise((resolve, reject) => {
                blobStream.on('finish', resolve);
                blobStream.on('error', reject);
            });

            imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
        }

        // ✅ Generate QR code
        const plantData = {
            name,
            scientific_name,
            sunlight,
            watering,
            soil,
            seasonality,
            uses_notes,
            image: imageUrl,
        };
        const qrData = JSON.stringify(plantData);
        const qrCodeUrl = await QRCode.toDataURL(qrData);

        // ✅ Save to Firestore
        await db
            .collection('users')
            .doc(userEmail)
            .collection('plants')
            .add({ ...plantData, qrCode: qrCodeUrl, createdAt: new Date() });

        res.json({ success: true });
    } catch (err) {
        console.error('❌ Upload Error:', err.message);
        res.status(500).json({ error: 'Upload Error' });
    }
});

// ✅ Start server
app.listen(5000, () => {
    console.log('✅ Backend running at http://localhost:5000');
});