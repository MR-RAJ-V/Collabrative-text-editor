# Real-Time Collaborative Text Editor

This document provides instructions on how to run locally and deploy the collaborative text editor.

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local instance running on port 27017, or an Atlas URI)

## Running Locally

### 1. Backend (Server)
1. Navigate to the `server` directory: `cd server`
2. Install dependencies: `npm install`
3. Copy the environment example file: `cp .env.example .env`
   - Keep the default `MONGO_URI=mongodb://127.0.0.1:27017/collaborative-editor` if you have local MongoDB.
4. Start the server (Dev mode): `npm run dev` or `node server.js`
   - Ensure it logs `MongoDB Connected` and `Server running on port 5000`.

### 2. Frontend (Client)
1. Open a new terminal and navigate to the `client` directory: `cd client`
2. Install dependencies: `npm install`
3. Copy the environment example file: `cp .env.example .env`
   - By default this points to `http://localhost:5000` which matches the local backend.
4. Start the Vite dev server: `npm run dev`
5. Open your browser to the local URL (usually `http://localhost:5173`).
   - To test collaboration, open multiple browsers/tabs and share the same URL containing the `?docId=...`.

## Deployment

### 1. Database (MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas.
2. In Database Access, create a database user.
3. In Network Access, whitelist `0.0.0.0/0` (allow access from anywhere).
4. Get your connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.abc.mongodb.net/collaborative-editor`).

### 2. Backend (Render / Railway)
1. Push your code to GitHub.
2. On Render/Railway, create a new **Web Service**.
3. Connect your GitHub repository.
4. Set the Root Directory to `server`.
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Environment Variables:
   - `PORT`: (leave empty or Render handles it, or set to your preference)
   - `MONGO_URI`: `mongodb+srv://...` (your Atlas URI)
8. Deploy and get your server URL (e.g., `https://my-collab-server.onrender.com`).

### 3. Frontend (Vercel / Netlify)
1. On Vercel/Netlify, create a new site and connect your GitHub repository.
2. Set the Root Directory to `client`.
3. The platform should auto-detect Vite settings (`npm run build`, `dist` output dir).
4. Environment Variables:
   - `VITE_API_URL`: `https://my-collab-server.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://my-collab-server.onrender.com`
5. Deploy and access your live collaborative editor!
