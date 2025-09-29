<<<<<<< HEAD
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
=======
// index.js
require('dotenv').config();
>>>>>>> 0034404 (backend: OpenAI image + MySQL + routes)

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('./db');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: FRONTEND_URL === '*' ? true : FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS']
}));

// static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

<<<<<<< HEAD
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
=======
// helpers
function promptForPlant(name) {
  return `High-quality, realistic botanical photograph of the plant that produces "${name}".
Full plant visible (leaves and stem), white background, centered, natural light, DSLR look. No text, no watermark.`;
>>>>>>> 0034404 (backend: OpenAI image + MySQL + routes)
}

async function generateImageAndSave(prompt) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
  });

  const body = await resp.json();
  if (!resp.ok) {
    const msg = body?.error?.message || 'OpenAI error';
    throw new Error(`OpenAI: ${msg}`);
  }

  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI: empty image');

  const buffer = Buffer.from(b64, 'base64');
  const filename = `${uuidv4()}.png`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  return `${BASE_URL}/uploads/${filename}`;
}

// ------------------- ROUTES -------------------

// ✅ AI + cache: GET /api/plant?name=banana
app.get('/api/plant', async (req, res) => {
  try {
    const nameRaw = (req.query.name || '').toString().trim();
    if (!nameRaw) return res.status(400).json({ error: 'name query is required' });

    const name = nameRaw.toLowerCase();
    const pool = await getPool();

    // cache check
    const [rows] = await pool.query('SELECT id, image_url FROM plants WHERE name=?', [name]);
    if (rows.length && rows[0].image_url) {
      return res.json({ name, imageUrl: rows[0].image_url, source: 'cache' });
    }

    // generate & save
    const prompt = promptForPlant(name);
    const imageUrl = await generateImageAndSave(prompt);

    if (rows.length) {
      await pool.query('UPDATE plants SET image_url=? WHERE id=?', [imageUrl, rows[0].id]);
    } else {
      await pool.query('INSERT INTO plants (name, image_url) VALUES (?,?)', [name, imageUrl]);
    }

    return res.json({ name, imageUrl, source: 'generated' });
  } catch (e) {
    console.error('GET /api/plant error:', e);
    res.status(500).json({ error: e.message || 'server error' });
  }
});

// ✅ GET all plants
app.get('/api/plants', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM plants ORDER BY id DESC');
    res.json({ plants: rows });
  } catch (e) {
    console.error('GET /api/plants error:', e);
    res.status(500).json({ error: 'server error' });
  }
});

<<<<<<< HEAD
// ---- start server
app.listen(PORT, () => {
    console.log(` Backend running at http://localhost:${PORT}`);
});
=======
// ✅ GET single plant by ID
app.get('/api/plant/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM plants WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/plant/:id error:', e);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Create new plant
app.post('/api/plants', async (req, res) => {
  try {
    const { name, scientific_name, plantType, sunlight, watering, soil, fertilizer, seasonality, seasonalMonths, uses_notes, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const pool = await getPool();
    const [result] = await pool.query(
      `INSERT INTO plants (name, scientific_name, plantType, sunlight, watering, soil, fertilizer, seasonality, seasonalMonths, uses_notes, image_url, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
      [name, scientific_name, plantType, sunlight, watering, soil, fertilizer, seasonality, JSON.stringify(seasonalMonths||[]), uses_notes, image_url]
    );

    res.json({ success: true, id: result.insertId });
  } catch (e) {
    console.error('POST /api/plants error:', e);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Delete plant
app.delete('/api/plant/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM plants WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/plant/:id error:', e);
    res.status(500).json({ error: 'server error' });
  }
});

// health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// start
getPool()
  .then(() => app.listen(PORT, () => console.log(`Backend running at ${BASE_URL}`)))
  .catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
>>>>>>> 0034404 (backend: OpenAI image + MySQL + routes)
