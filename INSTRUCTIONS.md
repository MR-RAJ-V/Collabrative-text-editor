# Doksify Instructions

This file explains how to run, configure, and deploy Doksify correctly.

## 1. Prerequisites

- Node.js 18 or newer
- npm
- MongoDB local instance or MongoDB Atlas
- Firebase project with Google Authentication enabled

## 2. Environment Setup

### Backend

Copy the example file and update the values:

```bash
cp server/.env.example server/.env
```

Required backend variables:

- `PORT`: API server port, default is `5000`
- `MONGO_URI`: MongoDB connection string
- `CLIENT_URL`: allowed frontend origin for CORS
- `FIREBASE_PROJECT_ID`: Firebase project id
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key

Notes:

- If your MongoDB password contains `@`, replace it with `%40`
- `CLIENT_URL` can be a comma-separated list when multiple frontend origins are needed
- Keep quotes around `FIREBASE_PRIVATE_KEY` when storing newline characters

### Frontend

Copy the example file and update the values:

```bash
cp client/.env.example client/.env
```

Required frontend variables:

- `VITE_API_URL`: backend API base URL, for example `http://localhost:5000/api`
- `VITE_SOCKET_URL`: backend socket base URL, for example `http://localhost:5000`
- `VITE_FIREBASE_API_KEY`: Firebase web API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID`: Firebase project id
- `VITE_FIREBASE_APP_ID`: Firebase app id
- `VITE_FIREBASE_AUTH_FLOW`: `popup` or `redirect`

## 3. Run Locally

### Start the backend

```bash
cd server
npm install
npm run dev
```

Expected result:

- MongoDB connects successfully
- The server starts on port `5000` unless overridden
- `http://localhost:5000/health` returns a JSON health response

### Start the frontend

```bash
cd client
npm install
npm run dev
```

Expected result:

- Vite starts on a local development port, usually `5173`
- The app loads in the browser
- Google sign-in works with your Firebase config

## 4. How to Use the App

1. Sign in with Google.
2. Create a new document.
3. Share the document link with another user.
4. Open the same document in another browser or tab to test live collaboration.
5. Use comments, suggestions, version history, and sharing controls from the editor UI.

## 5. Authentication Rules

- REST endpoints that modify data require a Firebase ID token in the `Authorization` header
- Most document-management routes require the signed-in user to be the owner or an allowed shared user
- Public link access is controlled by `visibility` and `linkRole`
- Socket connections also require a valid Firebase token

## 6. Deployment Instructions

### Backend deployment

Deploy the `server/` folder to a Node-compatible host such as Render or Railway.

Recommended backend settings:

- Build command: `npm install`
- Start command: `npm start`

Required production variables:

- `PORT`
- `MONGO_URI`
- `CLIENT_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Frontend deployment

Deploy the `client/` folder to Vercel, Netlify, or another static hosting platform.

Recommended frontend settings:

- Build command: `npm run build`
- Output directory: `dist`

Required production variables:

- `VITE_API_URL=https://your-backend-domain/api`
- `VITE_SOCKET_URL=https://your-backend-domain`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_AUTH_DOMAIN=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_APP_ID=...`
- `VITE_FIREBASE_AUTH_FLOW=popup`

## 7. Troubleshooting

### Backend does not start

- Check that MongoDB is reachable from `MONGO_URI`
- Confirm the chosen `PORT` is free
- Verify Firebase Admin variables are set correctly

### Frontend sign-in fails

- Confirm all `VITE_FIREBASE_*` values are present
- Make sure Google sign-in is enabled in Firebase Authentication
- Verify your deployed frontend domain is allowed in Firebase Auth settings

### API requests fail with 401

- Confirm the client is sending a valid Firebase ID token
- Verify backend Firebase Admin credentials belong to the same Firebase project

### Realtime collaboration fails

- Confirm `VITE_SOCKET_URL` points to the backend root URL, not `/api`
- Check CORS by verifying `CLIENT_URL` matches the frontend origin

## 8. Related Files

- `README.md` for the project overview
- `API_DOCUMENTATION.md` for REST and Socket.IO references
