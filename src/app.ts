import express from "express";
import { createServer } from "http";
import { setupWebSocket } from "./ws/wsServer"; // Your WS setup function
import routes from "./Http/index";                      // Your HTTP routes
import cors from 'cors'

const app = express();

// Usual Express middleware & route setup
app.use(express.json());
const corsOptions = {
  origin: [
    'https://prakriti-prikshan-client.vercel.app',  // Replace with your Vercel URL
    'https://shamband.work',
    'https://www.shamband.work',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use('/api', routes);

const server = createServer(app);
setupWebSocket(server);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running with HTTP and WS on port ${PORT}`);
});
