// backend/firebase.js

const admin = require("firebase-admin");
const serviceAccount = require("./firebaseKey.json"); // Your downloaded admin SDK key

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { db };