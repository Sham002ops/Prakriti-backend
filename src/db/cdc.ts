// import client from '../lib/weaviateClient';

// export async function createChunkSchema() {
//   const schemaRes = await client.schema.exists('Chunk');
//   if (!schemaRes) {
//     await client.schema.classCreator().withClass({
//       class: 'Chunk',
//       description: 'Study material chunks tagged by topic',
//       vectorizer: 'text2vec-openai',
//       properties: [
//         {
//           name: 'text',
//           dataType: ['text'],
//         },
//         {
//           name: 'topic',
//           dataType: ['string'],
//         },
//       ],
//     }).do();

//     console.log('✅ Chunk schema created in Weaviate.');
//   } else {
//     console.log('ℹ️ Chunk schema already exists.');
//   }
// }
