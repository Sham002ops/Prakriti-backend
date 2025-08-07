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
const JWT_PASSWORD = process.env.JWT_USER_PASSWORD || "defaultPassword";
import z from 'zod'
import { UserModel } from '../db/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';



dotenv.config();

// const app = express();
const port = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

const router = express.Router();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const upload = multer({ dest: 'uploads/' }); // will store PDF in /uploads

router.post("/signup", async ( req: Request, res: Response) => {
  // zod validation
  try {
  const requiredBody = z.object({
      email: z.string()
          .min(3)
          .max(30, { message: "Email should not contain more then 30 letter" }),
      password: z.string()
          .regex(/[A-Z]/, { message: "Password must be contain at least one Capital letter" })
          .regex(/[a-z]/, { message: "Password must be contain at least one small letter" })
          .regex(/[0-9]/, { message: "Password must be contain at least one number" })
          .regex(/[@#$%^&*(){}<>?:"]/, { message: "Password must be contain at least one special character" })
  })

  const passDataWithSuccess = requiredBody.safeParse(req.body);

  if(!passDataWithSuccess.success){
      
      res.json({
          message: "incorect format",
          error: passDataWithSuccess.error
      })
      return
  }

  const { email, password, username} = req.body;
  const hashedPassword = await bcrypt.hash(password, 5);

  try {
      await UserModel.create({
          username: username,
          password: hashedPassword,
          email: email
      })

      res.json({
          message: "User signed up"
      })
  } catch (e) {
      res.status(411).json({
          message: "user allready exists"
      })
  }}
  catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
  }

})


router.post("/signin", async ( req: Request, res: Response) => {
  
  try{
      const { username, password} = req.body;
  const validationResult = z.object({
      username: z.string().min(3).max(30),
      password: z.string()
          .regex(/[A-Z]/)
          .regex(/[a-z]/)
          .regex(/[0-9]/)
          .regex(/[@#$%^&*(){}<>?:"]/),
  })

  .safeParse(req.body);

  if (!validationResult.success) {
      res.status(400).json({
          message: "incorect format",
          error: validationResult.error
      })
  }

  const userExists = await UserModel.findOne({ username: username }).select('password');
  if (!userExists) {
      res.status(403).json({ message: "Incorrect credentials" });
      return;
  }
  const passwordMatch = await bcrypt.compare(password, userExists?.password as string)
  if (!passwordMatch){
      res.status(403).json({
          message: "Incorrect Credentials"
      })
  }

  const token = jwt.sign({
      id: userExists?._id
  }, JWT_PASSWORD as string);

  res.json({
      token
  })
  
} catch (error) {
  console.error("Signin error:", error);
  res.status(500).json({ message: "Internal server error" });
}
})

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
        console.log( "chunk : ",chunk, "topic: ", topic,  "subject: ", subject);
        

        return { text: chunk, topic , subject};
      })
    );

    // Store in Weaviate
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


router.use('/fun', searchRoutes); // Now available at /api/search and /api/semantic-search


// app.listen(port, async () => {
//   await createChunkSchema();   
//   console.log(`Server running on http://localhost:${port}`);
// });
export default router;