const admin = require('firebase-admin');
const serviceAccount = require('./firebaseKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };