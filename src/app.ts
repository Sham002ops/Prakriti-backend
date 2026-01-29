import express from "express";
import { createServer } from "http";
import { setupWebSocket } from "./ws/wsServer";
import routes from "./Http/index";
import cors from 'cors';

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://prakriti-prikshan-client.vercel.app',
    'https://shamband.work',
    'https://www.shamband.work',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.json({ 
    message: "Prakriti Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const server = createServer(app);
setupWebSocket(server);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running with HTTP and WS on port ${PORT}`);
});
