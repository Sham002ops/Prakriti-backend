import express, { Request, Response } from 'express';
import weaviateClient from '../../lib/weaviateClient';
import {  AnswerDoubt, findTopicChunks,getAnswerFromAPI,getQuestionsFromAPI,QuestionPrompt } from '../../components/getQuestions';

const router = express.Router();

router.get('/search', async (req: Request, res: Response) => {
  const { topic } = req.query;

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ error: 'Topic query is required' });
    return
  }

  try {
    const chunks = await findTopicChunks(topic);
    res.json({ chunks });
  } catch (err) {
    console.error('❌ Topic search failed:', err);
    res.status(500).json({ error: 'Failed to fetch chunks by topic' });
  }
});


router.get('/semantic-search', async (req: Request, res: Response) => {
    const { query } = req.query;
  
    if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query is required' });
      return 
    }

     console.log("query:", query);
  

  
    try {
      const result = await weaviateClient.graphql
        .get()
        .withClassName('Chunk')
        .withFields('content topic')
        .withNearText({
          concepts: [query],
          certainty: 0.7, // Optional: only return relevant ones
        })
        .withLimit(10)
        .do();
  
      const chunks = result?.data?.Get?.Chunk || [];
      res.json({ chunks });
    } catch (err) {
      console.error('❌ Semantic search failed:', err);
      res.status(500).json({ error: 'Failed to perform semantic search' });
    }
  });



  router.get('/ask-doubt', async (req: Request, res: Response) => {
    const { query } = req.query;
    
    console.log("question: ",query);
    

  
    if (!query || typeof query !== 'string') {
       res.status(400).json({ error: 'Query is required' });
       return
    }
  
    try {
      const result = await weaviateClient.graphql
        .get()
        .withClassName('Chunk')
        .withFields('content topic')
        .withNearText({
          concepts: [query],
          certainty: 0.7,
        })
        .withLimit(10)
        .do();
  
      const chunks = result?.data?.Get?.Chunk || [];
      if (!chunks.length) {
         res.status(404).json({ error: 'No relevant content found for your query' });
         return
      }
  
      const prompt = AnswerDoubt(chunks, query);
      const answer = await getAnswerFromAPI(prompt);
  
      res.json({ answer });
    } catch (err) {
      console.error('❌ Ask Doubt failed:', err);
      res.status(500).json({ error: 'Failed to answer the query' });
    }
  });
  

  
// route: /routes/questions.ts

router.post('/generate-questions', async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
        res.status(400).json({ error: 'Topic is required' });
        return 
    }
  
    try {
      // Ps.6: Fetch chunks from Weaviate by topic
      const chunks = await findTopicChunks(topic);
  
      if (!chunks.length){
        res.status(404).json({ error: 'No content found for this topic' });
        return 
    }
  
      // Ps.8: Create prompt for ChatGPT
      const prompt = await QuestionPrompt(chunks);
      console.log("prompt8090", prompt);
      
      
  
      // Ps.9: Call OpenAI
      const questions = await getQuestionsFromAPI(prompt);
      console.log("questions", questions);
      
  
      // // Ps.10: Store questions to DB
      // await storeQuestionsToDB(topic, questions);
  
      // Ps.11: Respond back to app (or push to a game room)
      res.status(200).json({ topic, questions });
      return
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
      return 
    }
  });
  



  
  export default router;


  //This solves the problem of LLMs "hallucinating" or lacking domain-specific knowledge by giving them real, grounded information.