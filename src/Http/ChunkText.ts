// chunkText.ts
export function chunkText(text: string, wordsPerChunk = 400): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
  
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      chunks.push(chunk);
    }
  
    return chunks;
  }
  