import OpenAI from "openai";
import weaviateClient from "../lib/weaviateClient";

type MCQ = {
  number: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
};


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function findTopicChunks(topic: string) {
    
  try {
    const result = await weaviateClient.graphql
      .get()
      .withClassName('Chunk')
      .withFields('content topic')
      .withWhere({
        path: ['topic'],
        operator: 'Equal',
        valueText: topic,
      })
      .withLimit(10)
      .do();

    const chunks = result?.data?.Get?.Chunk || [];
    // console.log("chunks 3444: ", chunks);
    
    return chunks;
  } catch (err) {
    console.error('❌ Topic search failed:', err);
    // res.status(500).json({ error: 'Failed to fetch chunks by topic' });
  }
  
}


export function QuestionPrompt(chunks: { content: string; topic: string }[]): string {
  const contentText = chunks.map(chunk => chunk.content).join('\n\n');
  // const content = chunks.slice(0, 3).join('\n\n'); 
  // console.log("Content jjoooo: ", contentText);
  
  // const content = chunks.join('\n\n'); 
  const prompt = `Based on the content below, generate 20 multiple-choice questions (MCQs) with 4 options (A–D). Use the exact format given.

                  CONTENT:
                  """
                  ${contentText}
                  """

                  FORMAT:
                  Q no. : 1  
                  question: "What is the primary mechanism of action of beta-blockers?"  
                  options: {  
                    A. They increase heart rate  
                    B. They block alpha receptors  
                    C. They reduce sympathetic activity by blocking beta receptors  
                    D. They dilate blood vessels directly  
                  }  
                  Answer: C

                  Only return MCQs in the exact format above. Do NOT include explanations or any extra text.`;

  return prompt;
}
export function AnswerDoubt(chunks: { content: string; topic: string }[], query: string ): string {
  const contentText = chunks.map(chunk => chunk.content).join('\n\n');
  
  return `You are a docter at a BAMS ayurvadic hospital. Based on the content below, answer the question: "${query}" in short. If unrelated, respond with "I cannot answer this question."

          CONTENT:
          """
          ${contentText}
          """`;  
}


export async function getQuestionsFromAPI(prompt: string):  Promise<MCQ[]> {
  console.log(" Prompt at getQuestionFromAPI xxxx: ");
  
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You generate MCQs for study material.' },
      { role: 'user', content: prompt }
    ],
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  });
  console.log("Completion xxxxx00000 : ", completion);
  console.log("Completion 8787878 : ", completion.choices[0].message.content);
  const QuestionResponse = extractMCQs(completion.choices[0].message.content || '');
  console.log("QuestionResponse 999999:", QuestionResponse);
  
  
  return  QuestionResponse
 
}

export async function getAnswerFromAPI(prompt: string):  Promise<string> {
  console.log(" reached at getAnswerfromApi");
  
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'Act as Docter at Ayurvadic College' },
      { role: 'user', content: prompt }
    ],
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  });
  
  return completion.choices[0].message.content || 'No answer available';
}



export function extractMCQs(response: string): MCQ[] {
  const mcqs: MCQ[] = [];
  const blocks = response
    .split(/Q no\. ?: ?\d+/i) // Split each MCQ by "Q no. : x"
    .map(b => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    try {
      const questionMatch = block.match(/question: ?"(.+?)"/i);
      const optionsMatch = block.match(/options:\s*{([^}]+)}/i);
      const answerMatch = block.match(/answer: ?(.+)/i);

      if (questionMatch && optionsMatch && answerMatch) {
        const optionsBlock = optionsMatch[1].trim();
        const options: MCQ["options"] = {
          A: optionsBlock.match(/A\. ?(.+)/)?.[1]?.trim() || '',
          B: optionsBlock.match(/B\. ?(.+)/)?.[1]?.trim() || '',
          C: optionsBlock.match(/C\. ?(.+)/)?.[1]?.trim() || '',
          D: optionsBlock.match(/D\. ?(.+)/)?.[1]?.trim() || '',
        };

        mcqs.push({
          number: mcqs.length + 1,
          question: questionMatch[1],
          options,
          answer: answerMatch[1].trim(),
        });
      }
    } catch (err) {
      console.warn('Failed to parse MCQ block:', block);
    }
  }

  return mcqs;
}

// Somewhere in a shared module (e.g. ./components/getQuestions.ts)
export async function searchChunksBySemantic(query: string) {
  const result = await weaviateClient.graphql
    .get()
    .withClassName('Chunk')
    .withFields('content topic')
    .withNearText({
      concepts: [query],
      certainty: 0.7,
    })
    .withLimit(6)
    .do();

  return result?.data?.Get?.Chunk || [];
}


//  export async function storeQuestionsToDB(topic: string, questions: string[]) {
//   prismaClient.question.create({})
// }
