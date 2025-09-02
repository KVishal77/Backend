const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');

const OpenAI = require('openai');
const { db, bucket } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ---- debug routes
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        bucket: bucket?.name || null,
        OPENAI_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
        port: PORT,
    });
});

app.get('/debug-env', (_req, res) => {
    res.json({
        OPENAI_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
        BUCKET: process.env.FIREBASE_STORAGE_BUCKET || null,
        PORT: process.env.PORT || null,
    });
});

app.get('/test-openai', async (_req, res) => {
    try {
        const r = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Reply with "OK".' }],
            temperature: 0,
        });
        res.json({ ok: true, content: r.choices?.[0]?.message?.content || '' });
    } catch (err) {
        res.json({ ok: false, status: err.status || '', message: err.message });
    }
});

// ---- AI Suggestion Route
app.post('/suggest', async (req, res) => {
    try {
        const { plantName } = req.body;
        if (!plantName) return res.status(400).json({ error: 'plantName is required' });

        const prompt = `
Return plant care data for "${plantName}" in this exact JSON format:
{
  "scientific_name": "",
  "sunlight": "",
  "watering": "",
  "soil": "",
  "seasonality": "",
  "uses_notes": "",
  "image": "<direct JPG or PNG URL from Wikimedia Commons of the WHOLE PLANT>"
}
Rules:
- Use only Wikimedia Commons images (not fruits/parts).
- Avoid logos, icons, illustrations, or SVGs.
- If you can't find a Wikimedia image, leave "image" empty.
- Return ONLY the JSON. No markdown or explanation.
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
        });

        let content = completion.choices?.[0]?.message?.content || '';

        // strip code fences if present
        if (content.includes('```')) {
            content = content.replace(/```json|```/g, '').trim();
        }

        let suggestions;
        try {
            suggestions = JSON.parse(content);
        } catch (e) {
            console.error('JSON parse error. Raw:', content);
            return res.status(400).json({ error: 'Invalid JSON from OpenAI' });
        }

        // fallback image
        if (
            !suggestions.image ||
            !suggestions.image.includes('wikimedia') ||
            suggestions.image.endsWith('.svg')
        ) {
            suggestions.image =
                'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Plant_icon.svg/512px-Plant_icon.svg.png';
        }

        suggestions.name = plantName;
        return res.json({ suggestions });
    } catch (err) {
        console.error('OpenAI Error:', err.status || '', err.message);
        return res.status(500).json({ error: 'AI Error' });
    }
});

// ---- Add Plant (optional image upload)
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

        if (!userEmail) return res.status(400).json({ error: 'userEmail is required' });
        if (!name) return res.status(400).json({ error: 'name is required' });

        // upload to Firebase Storage if image present
        let imageUrl = '';
        if (req.file) {
            const fileName = `plants/${Date.now()}_${req.file.originalname}`;
            const file = bucket.file(fileName);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype },
                resumable: false,
            });

            await file.makePublic(); // optional (makes public)
            imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }

        // QR with core plant data
        const plantData = {
            name,
            scientific_name: scientific_name || '',
            sunlight: sunlight || '',
            watering: watering || '',
            soil: soil || '',
            seasonality: seasonality || '',
            uses_notes: uses_notes || '',
            image: imageUrl || '',
        };

        const qrCodePng = await QRCode.toDataURL(JSON.stringify(plantData));

        // save to Firestore under user
        await db
            .collection('users')
            .doc(userEmail)
            .collection('plants')
            .add({ ...plantData, qrCode: qrCodePng, createdAt: Date.now() });

        res.json({ success: true });
    } catch (err) {
        console.error('Upload Error:', err.message);
        res.status(500).json({ error: 'Upload Error' });
    }
});

// ---- start server
app.listen(PORT, () => {
    console.log(` Backend running at http://localhost:${PORT}`);
});
