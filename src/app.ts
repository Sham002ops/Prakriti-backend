import express from "express";
import { createServer } from "http";
import { setupWebSocket } from "./ws/wsServer";
import routes from "./Http/index";
import cors from 'cors';

const app = express();

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

// Apply CORS FIRST
app.use(cors(corsOptions));

app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: "Prakriti Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    message: "Prakriti Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);



const server = createServer(app);
setupWebSocket(server);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running with HTTP and WS on port ${PORT}`);
});
