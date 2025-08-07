import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import weaviateClient from "../lib/weaviateClient"; // Adapt path as needed
import { AnswerDoubt, findTopicChunks, getAnswerFromAPI, searchChunksBySemantic } from '../components/getQuestions';
import { OpenAI } from "openai"; // Adapt import for your OpenAI init

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server });

  

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    try {
      const { type, question } = JSON.parse(msg.toString());

      if (type === "prakriti-doubt") {
        // Fetch relevant chunks
        const chunks = await searchChunksBySemantic(question);
        if (!chunks || chunks.length === 0) {
          ws.send(JSON.stringify({ type: "prakriti-answer", answer: "I cannot find relevant information on this topic." }));
          return;
        }

        // Create prompt using your component
        const prompt = AnswerDoubt(chunks, question);
        // Get answer from OpenAI
        const answer = await getAnswerFromAPI(prompt);

        ws.send(JSON.stringify({ type: "prakriti-answer", answer }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: "Invalid input or processing error" }));
    }
  });
});
}
