import express from "express";
import { createServer } from "http";
import { setupWebSocket } from "./ws/wsServer"; // Your WS setup function
import routes from "./Http/index";                      // Your HTTP routes
import cors from 'cors'

const app = express();

// Usual Express middleware & route setup
app.use(express.json());
app.use(cors());

app.use('/api', routes);

const server = createServer(app);
setupWebSocket(server);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running with HTTP and WS on port ${PORT}`);
});
