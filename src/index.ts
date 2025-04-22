import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import multer from 'multer';
import { extractTextFromPDF } from './textFromPdf';
import { chunkText } from './ChunkText';
import { createChunkSchema } from './db/createSchema';
import weaviateClient  from './lib/weaviateClient';
import searchRoutes from './routes/searchRoutes';
import 'dotenv/config';



dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate-mcq', async (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic) 
     
  res.status(400).json({ error: "Topic is required" });

  try {
        const prompt = `
            Generate 5 multiple-choice questions with 4 options each on the topic "${topic}".
            Indicate the correct option like this:

            Q1. Question text here
            A. Option A
            B. Option B
            C. Option C
            D. Option D
            Answer: B

            Only return questions in the above format.
            `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const result = response.choices[0].message?.content;
    res.json({ questions: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});


const upload = multer({ dest: 'uploads/' }); // will store PDF in /uploads



app.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
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

        return { text: chunk, topic };
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


app.use('/api', searchRoutes); // Now available at /api/search and /api/semantic-search


// app.post('/upload-pdf', upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) {
//       res.status(400).json({ error: 'No file uploaded' });
//       return 
//     }
//     const filePath = req.file.path; // local path to uploaded file
//     const text = await extractTextFromPDF(filePath);
//     const chunks = chunkText(text, 400);
    
//     res.json({ chunks }); // you can store this in DB instead
//     console.log("chunks", chunks);
    
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to process PDF' });
//   }
// });

app.listen(port, async () => {
  await createChunkSchema(); 
  // console.log("OPENAI_API_KEY:",process.env.OPENAI_API_KEY);
  // console.log("WEAVIATE_API_KEY:", process.env.WEAVIATE_API_KEY);
  
  console.log(`Server running on http://localhost:${port}`);
});
