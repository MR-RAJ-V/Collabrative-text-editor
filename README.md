# CollabWrite - Real-Time Collaborative Editor

A production-ready real-time collaborative text editor built with WebSockets and CRDTs for seamless multi-user conflict resolution.

[![Demo Video](https://img.shields.io/badge/Watch-Demo_Video-blue)](#demo-video)
[![Live Preview](https://img.shields.io/badge/Live-Production-success)](#live-preview)

---

## 📸 Screenshots
_Placeholder for Screenshots_
*(Add images of the Editor, Presence Panel, and History UI here)*

---

## 🌟 Features
- **Real-Time Collaboration**: Type concurrently with multiple users in the same document room. No locking, no data loss.
- **Yjs CRDT Integration**: Deterministic conflict resolution using Yjs binary buffers (no rigid operational transforms).
- **Live Cursor Tracking**: See where your teammates are pointing with vibrant colored carets and nametags synced effortlessly via Y-Awareness over Socket.IO.
- **User Presence**: Dynamic header UI tracking exactly who is currently online in your document.
- **Rich Text Editor**: Beautiful, minimalist Prosemirror-backed TipTap interface supporting typography elements.
- **Crash-Proof Persistence**: Debounced background persistence saves the native binary Yjs State to MongoDB effortlessly.
- **Revision History**: View and instantly fallback to older auto-saved document snapshots preserved reliably in the database arrays.

---

## 🛠 Tech Stack
- **Frontend**: React.js, Vite, `socket.io-client`, TipTap
- **Backend**: Node.js, Express, `socket.io`
- **Synchronization Layer**: Yjs (`y-protocols`, `@tiptap/extension-collaboration`)
- **Database**: MongoDB (Mongoose)

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB daemon running locally on `27017` or an external Atlas Cluster URI.

### 1. Clone & Configure
```bash
git clone https://github.com/your-username/collabwrite.git
cd collabwrite
```

**Backend `.env`:** (Create inside `/server`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/collaborative-editor
```

**Frontend `.env`:** (Create inside `/client`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 2. Run Locally

Open two separate terminal environments:

**Terminal 1 (Backend):**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser. Copy the generated Document URL and open it in a second window to test Live Collaboration natively!

---

## 📦 Deployment Links

_Placeholder Links for your CI/CD Pipeline_
- **Frontend Site**: [https://your-react-app.vercel.app](#)
- **Backend API**: [https://your-express-api.onrender.com](#)

### Recommended Deployment Providers
- **Backend**: Dockerize or deploy directly to Render / Railway / Heroku.
- **Frontend**: Connect Vite output directory (`dist`) to Vercel or Netlify.
- **Database**: Host freely relying on MongoDB Atlas clusters. Waitlist database IP connections appropriately.

---

## 🎥 Demo Video
_Placeholder for Demo Video_
[Insert YouTube or Loom walkthrough link here]
