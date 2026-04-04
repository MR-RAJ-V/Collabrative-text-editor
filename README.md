# Doksify

Doksify is a real-time collaborative text editor built for multi-user writing, sharing, commenting, and version recovery. The app combines a React + Vite frontend with an Express + Socket.IO backend, Firebase authentication, MongoDB persistence, and Yjs-based collaboration.

## Highlights

- Real-time collaborative editing with Yjs and Socket.IO
- Google sign-in with Firebase Authentication
- Shared link access with viewer or editor permissions
- Comments and suggestion workflows
- Manual and automatic version history
- Presence, typing, and cursor updates for active collaborators

## Tech Stack

- Frontend: React, Vite, TipTap, Axios, Firebase
- Backend: Node.js, Express, Socket.IO, Mongoose
- Realtime sync: Yjs, y-protocols
- Database: MongoDB
- Auth: Firebase Authentication + Firebase Admin

## AI Tools Used

- ChatGPT
- Anti Gravety

## Project Structure

```text
client/   React frontend
server/   Express API, Socket.IO server, MongoDB models
README.md
INSTRUCTIONS.md
API_DOCUMENTATION.md
```

## Quick Start

### 1. Install dependencies

```bash
cd server
npm install
```

```bash
cd client
npm install
```

### 2. Configure environment variables

Backend: create `server/.env`

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/collaborative-editor?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Frontend: create `client/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_AUTH_FLOW=popup
```

You can also copy from the existing example files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Run locally

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Open `http://localhost:5173` and sign in with Google to create and manage documents.

## Deployment Notes

- Deploy the backend from `server/`
- Deploy the frontend from `client/`
- Point `VITE_API_URL` to `<backend-url>/api`
- Point `VITE_SOCKET_URL` to `<backend-url>`
- Set `CLIENT_URL` on the server to your frontend origin
- Configure Firebase web app values on the client and Firebase Admin credentials on the server

## Documentation

- Setup and deployment guide: `INSTRUCTIONS.md`
- API reference: `API_DOCUMENTATION.md`

## Core REST Routes

- `GET /health`
- `GET /api/auth/me`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PUT /api/documents/:id`
- `PATCH /api/documents/:id/share`
- `POST /api/documents/:id/comments`
- `POST /api/documents/:id/versions`

## Realtime Features

Socket.IO powers:

- document join and access sync
- collaborative Yjs updates
- presence and typing status
- live comments and suggestion broadcasts
- auto-save and version events

## License

This project is currently shared for hackathon and development use.
