
import weaviate from 'weaviate-ts-client';
import 'dotenv/config';


const weaviateClient = weaviate.client({
  scheme: 'https', // cloud = https (not http)
  host: 'lyxjrucrsedm5kgiodeww.c0.asia-southeast1.gcp.weaviate.cloud',
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '', 
    'Authorization': `Bearer ${process.env.WEAVIATE_API_KEY}`, 
  },
});


export default weaviateClient;
