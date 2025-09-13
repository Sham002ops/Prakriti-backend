// ws/wsServer.ts
import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { AnswerDoubt1, getAnswerFromAPIStream } from "../components/getQuestions"; // Streaming answer
import { ChatModel, UserModel } from "../db/db"; // Import your UserModel
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_PASSWORD = process.env.JWT_PASSWORD || "defaultPassword";


export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {

    const params = new URLSearchParams(req.url?.split('?')[1]);
    const token = params.get("token");

    if (!token) {
      ws.send(JSON.stringify({ type: "error", error: "Missing token" }));
      ws.close();
      return;
    }
    let userId: string | null = null;
    try {
      const payload = jwt.verify(token, JWT_PASSWORD as string) as { id: string };
      console.log("JWT_PASSWORD used for verifying token:", JWT_PASSWORD);
      userId = payload.id;
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Invalid token" }));
      ws.close();
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      ws.send(JSON.stringify({ type: "error", error: "User not found" }));
      ws.close();
      return;
    }

    ws.on("message", async (raw) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "invalid_json" }));
        return;
      }

      const { type, question } = data || {};
      if (type !== "prakriti-doubt" || typeof question !== "string" || !question.trim()) {
        ws.send(JSON.stringify({ type: "error", error: "bad_message_shape" }));
        return;
      }

      try {
        const prompt = AnswerDoubt1(question);

        await ChatModel.create({
          userId: userId,
          question: question,
          createdAt: new Date()
        });

        let fullAnswer = "";

        // Streaming answer parts
        for await (const part of getAnswerFromAPIStream(prompt)) {
          fullAnswer += part;
          ws.send(JSON.stringify({ type: "prakriti-answer-part", part }));
        }

        ws.send(JSON.stringify({ type: "prakriti-answer-complete" }));

        // Save to database if user is authenticated
        if (userId) {
          await UserModel.findByIdAndUpdate(userId, {
            $push: {
              chats: {
                $each: [
                  { sender: "user", text: question },
                  { sender: "bot", text: fullAnswer }
                ],
                $slice: -50 // Keep only the last 50 messages
              }
            }
          });
        }
      } catch (e: any) {
        console.error("WebSocket error:", e);
        ws.send(JSON.stringify({ type: "error", error: "llm_failed" }));
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error", err);
    });
  });
}
