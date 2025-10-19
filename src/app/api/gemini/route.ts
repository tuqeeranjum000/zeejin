import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

// Force Node.js runtime for this route
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum duration in seconds (60s for hobby plan)

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // pdf2json requires a file path, so we need to write the buffer to a temp file
      const PDFParser = (await import('pdf2json')).default;
      const pdfParser = new PDFParser();
      
      // Create a temporary file
      const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.pdf`);
      await writeFile(tempFilePath, buffer);
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        unlink(tempFilePath).catch(() => {}); // Clean up temp file
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let fullText = '';
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((text: any) => {
                  if (text.R) {
                    text.R.forEach((r: any) => {
                      try {
                        fullText += decodeURIComponent(r.T) + ' ';
                      } catch (e) {
                        // If decoding fails, use the raw text
                        fullText += r.T + ' ';
                      }
                    });
                  }
                });
              }
              fullText += '\n';
            });
          }
          unlink(tempFilePath).catch(() => {}); // Clean up temp file
          resolve(fullText.trim());
        } catch (error) {
          unlink(tempFilePath).catch(() => {}); // Clean up temp file
          reject(error);
        }
      });
      
      pdfParser.loadPDF(tempFilePath);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      reject(new Error('Failed to extract text from PDF'));
    }
  });
}

export async function POST(req: NextRequest) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

  try {
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const file = formData.get('file') as File | null;
    const historyJson = formData.get('history') as string | null;
    const existingPdfContent = formData.get('pdfContent') as string | null;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let fileContent = existingPdfContent || '';
    let newPdfUploaded = false;
    
    // Extract PDF content if a new file is uploaded
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileContent = await extractTextFromPDF(buffer);
      newPdfUploaded = true;
    }

    // Parse conversation history
    let history: Array<{ role: string; text: string }> = [];
    if (historyJson) {
      try {
        history = JSON.parse(historyJson);
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }

    // Build system instructions and context
    let systemInstruction = `You are Zeejin, an AI assistant specialized in helping users with their tasks. Your role is to:
- Provide accurate, helpful responses to user queries
- Maintain context throughout the conversation
- Explain concepts in clear, accessible language
- Be concise but comprehensive in your responses
- Handle various types of tasks from simple questions to complex analysis

IMPORTANT: Format all responses in Markdown for better readability:
- Use **bold** for emphasis and key terms
- Use \`code\` for technical terms, variables, or formulas
- Use code blocks with \`\`\` for longer code samples or formatted data
- Use bullet points (-) for lists
- Use numbered lists (1. 2. 3.) for sequential steps
- Use ### for section headings
- Use > for important quotes or highlights
- Use tables with | for structured data comparison
- Structure your responses with clear sections when appropriate

TABLE FORMAT:
For comparisons or structured data, use markdown tables:

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

CHARTS & VISUALIZATIONS:
**CRITICAL**: When asked to create charts, evaluations, comparisons, or visualizations, you MUST generate the actual chart data in the exact format below. DO NOT describe what the chart would look like. ALWAYS generate the actual data.

Format (copy exactly, replace with real data):

\`\`\`chart
{
  "type": "bar",
  "title": "Your Chart Title",
  "data": [
    {"name": "Item 1", "value": 75.5},
    {"name": "Item 2", "value": 45.2},
    {"name": "Item 3", "value": 89.7}
  ],
  "xKey": "name",
  "yKey": "value"
}
\`\`\`

**Chart types:**
- **bar**: For comparisons, counts, categorical data (use "value" as yKey)
- **line**: For trends, time series (use "value" as yKey)
- **pie**: For proportions, percentages (use "value" as yKey)
- **radar**: For multi-dimensional evaluations (use "value" as yKey, multiple metrics possible)

**REMEMBER**: NEVER say "I cannot generate charts" or describe what a chart would look like. ALWAYS generate the actual chart data using the format above.`;

    // Create the model with system instruction
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }]
      },
    });

    // Build conversation history for Gemini's chat format
    const chatHistory: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }> = [];
    
    // Add document context as the first user message if PDF exists
    if (fileContent) {
      if (newPdfUploaded) {
        // First time analyzing this document
        chatHistory.push({
          role: 'user',
          parts: [{ text: `I'm uploading a document for analysis. Here is the full document content:\n\n${fileContent}\n\nPlease confirm you've received and understood the document.` }]
        });
        chatHistory.push({
          role: 'model',
          parts: [{ text: `I've received and analyzed the document. It contains ${Math.round(fileContent.length / 5)} words approximately. I'm ready to answer your questions about this document. What would you like to know?` }]
        });
      } else {
        // Ongoing conversation - add document as context reference
        chatHistory.push({
          role: 'user',
          parts: [{ text: `[Document Context]\n${fileContent.substring(0, 8000)}${fileContent.length > 8000 ? '\n... [document continues]' : ''}` }]
        });
        chatHistory.push({
          role: 'model',
          parts: [{ text: 'I have the document context loaded. Please proceed with your question.' }]
        });
      }
    }

    // Add previous conversation history (limit to last 10 exchanges to manage token usage)
    const recentHistory = history.slice(-20); // Last 10 user-bot exchanges
    recentHistory.forEach(msg => {
      chatHistory.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });

    // Start chat session with history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    // Detect if user is asking for a chart and add reminder
    const lowerPrompt = prompt.toLowerCase();
    const isChartRequest = lowerPrompt.includes('chart') || 
                          lowerPrompt.includes('graph') || 
                          lowerPrompt.includes('visualiz') ||
                          lowerPrompt.includes('plot') ||
                          lowerPrompt.includes('compare') && (lowerPrompt.includes('bar') || lowerPrompt.includes('visual'));
    
    let finalPrompt = prompt;
    if (isChartRequest) {
      finalPrompt = prompt + '\n\n[REMINDER: Generate actual chart data in the chart code block format. Do NOT describe what a chart would look like. Use the exact JSON format from the system instructions.]';
    }

    // Send the current message
    const result = await chat.sendMessageStream(finalPrompt);
    
    console.log('Starting stream response...');
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';
          let chunkCount = 0;
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            chunkCount++;
            
            // Log progress
            if (chunkCount % 10 === 0) {
              console.log(`Streamed ${chunkCount} chunks, total length: ${fullText.length}`);
            }
            
            // Send each chunk as it arrives
            const data = JSON.stringify({ 
              text: chunkText,
              done: false 
            }) + '\n';
            
            controller.enqueue(encoder.encode(data));
          }
          
          console.log(`Stream complete. Total chunks: ${chunkCount}, total length: ${fullText.length}`);
          
          // Send final message with PDF content if needed
          const finalData: any = { 
            text: '',
            done: true 
          };
          
          if (newPdfUploaded) {
            finalData.pdfContent = fileContent;
          }
          
          controller.enqueue(encoder.encode(JSON.stringify(finalData) + '\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
