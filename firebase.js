const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const admin = require('firebase-admin');
const serviceAccount = require('./firebaseKey.json');

const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET missing. Put it in .env or Dokploy env.');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucketName,
});

const db = admin.firestore();
const bucket = admin.storage().bucket(bucketName);

module.exports = { db, bucket };
