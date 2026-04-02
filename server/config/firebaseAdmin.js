const admin = require('firebase-admin');

let app;

const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
};

const hasFirebaseAdminConfig = () => Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  || (
    process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL
    && process.env.FIREBASE_PRIVATE_KEY
  )
  || process.env.GOOGLE_APPLICATION_CREDENTIALS,
);

const getFirebaseAdmin = () => {
  if (app) {
    return admin;
  }

  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    app = admin.apps[0] || admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return admin;
  }

  if (process.env.FIREBASE_PROJECT_ID) {
    app = admin.apps[0] || admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    return admin;
  }

  throw new Error('Firebase Admin credentials are not configured. Set FIREBASE_PROJECT_ID or full service account credentials.');

  return admin;
};

module.exports = {
  getFirebaseAdmin,
  hasFirebaseAdminConfig,
};
