const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { hasFirebaseAdminConfig } = require('./config/firebaseAdmin');
const documentRoutes = require('./routes/documentRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const http = require('http');
const setupSocket = require('./sockets');

const app = express();
const PORT = process.env.PORT || 5000;
const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || '';
  return rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Database connection
connectDB();

if (!hasFirebaseAdminConfig()) {
  console.warn('Firebase Admin credentials are not fully configured. Authenticated routes will fail until FIREBASE service account credentials are provided.');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
  res.send('Editor Backend API is running...');
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    port: Number(PORT),
    timestamp: new Date().toISOString(),
  });
});

// Socket.io integration
const server = http.createServer(app);
setupSocket(server, { corsOptions });

server.on('error', (error) => {
  console.error(`Server failed to start on port ${PORT}:`, error.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
