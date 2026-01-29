import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import multer from 'multer';
import { extractTextFromPDF } from './textFromPdf';
import { chunkText } from './ChunkText';
import { createChunkSchema } from '../db/createSchema';
import weaviateClient  from '../lib/weaviateClient';
import searchRoutes from './routes/searchRoutes';
import 'dotenv/config';
const JWT_PASSWORD = process.env.JWT_PASSWORD || "defaultPassword";
import z from 'zod'
import { UserModel } from '../db/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: 'uploads/' });

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SIGNUP ROUTE - FIXED
router.post("/signup", async (req: Request, res: Response) => {
  try {
    // Fixed: Added username to validation schema
    const requiredBody = z.object({
      username: z.string()
        .min(3, { message: "Username must be at least 3 characters" })
        .max(30, { message: "Username should not contain more than 30 characters" }),
      email: z.string()
        .email({ message: "Invalid email format" })
        .min(3)
        .max(50, { message: "Email should not contain more than 50 characters" }),
      password: z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[A-Z]/, { message: "Password must contain at least one capital letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[@#$%^&*(){}<>?:"]/, { message: "Password must contain at least one special character" })
    });

    const passDataWithSuccess = requiredBody.safeParse(req.body);

    if (!passDataWithSuccess.success) {
      res.status(400).json({
        message: "Incorrect format",
        error: passDataWithSuccess.error.errors
      });
      return;
    }

    const { email, password, username } = req.body;
    const hashedPassword = await bcrypt.hash(password, 5);

    try {
      await UserModel.create({
        username: username,
        password: hashedPassword,
        email: email
      });

      res.json({
        message: "User signed up"
      });
      return;
    } catch (e: any) {
      console.error("Database error:", e);
      res.status(411).json({
        message: "User already exists"
      });
      return;
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});

// SIGNIN ROUTE - FIXED
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    const validationResult = z.object({
      username: z.string().min(3).max(30),
      password: z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[@#$%^&*(){}<>?:"]/),
    }).safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        message: "Incorrect format",
        error: validationResult.error.errors
      });
      return;
    }

    const userExists = await UserModel.findOne({ username: username }).select('password');
    
    if (!userExists) {
      res.status(403).json({ message: "Incorrect credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, userExists.password as string);
    
    if (!passwordMatch) {
      res.status(403).json({
        message: "Incorrect credentials"
      });
      return;
    }

    const token = jwt.sign(
      { id: userExists._id },
      JWT_PASSWORD as string,
      { expiresIn: "7d" }
    );

    res.json({ token });
    return;
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
});

router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const subject = req.query.subject;

    if (!req.file || !subject) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filePath = req.file.path;
    const text = await extractTextFromPDF(filePath);
    const chunks = chunkText(text, 400);

    const enrichedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const topicPrompt = `Identify the main topic of the following content. Respond with only 2-4 words representing the topic.\n\n"${chunk}"`;

        const topicResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: topicPrompt }],
          temperature: 0.5,
        });

        const topic = topicResponse.choices[0].message?.content?.trim() || 'Unknown';
        console.log("chunk : ", chunk, "topic: ", topic, "subject: ", subject);

        return { text: chunk, topic, subject };
      })
    );

    await Promise.all(
      enrichedChunks.map(async ({ text, topic }) => {
        await weaviateClient.data
          .creator()
          .withClassName('Chunk')
          .withProperties({
            content: text,
            topic: topic,
            subject: subject,
          })
          .do();
      })
    );

    res.json({ success: true, chunksStored: enrichedChunks.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// router.use('/fun', searchRoutes);

export default router;
