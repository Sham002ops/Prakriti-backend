import weaviateClient from '../lib/weaviateClient';

export const createChunkSchema = async () => {
  try {
    const existing = await weaviateClient.schema.getter().do();
    const hasChunkClass = existing.classes?.some((c) => c.class === 'Chunk');

    if (!hasChunkClass) {
      await weaviateClient.schema.classCreator().withClass({
        class: 'Chunk',
        description: 'A chunk of text extracted from a PDF with topic and subject labels',
        vectorizer: 'text2vec-openai',
        properties: [
          {
            name: 'content', 
            dataType: ['text'],
          },
          {
            name: 'topic', 
            dataType: ['text'],
          },
          {
            name: 'subject', 
            dataType: ['text'],
          },
        ],
      }).do();

      console.log('✅ Chunk schema with subject property created in Weaviate.');
    } else {
      console.log('ℹ️ Chunk class already exists.');
    }
  } catch (error) {
    console.error('❌ Failed to setup Weaviate schema:', error);
  }
};
