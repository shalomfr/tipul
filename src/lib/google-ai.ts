import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization to ensure environment variable is available
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<{
  text: string;
  confidence?: number;
}> {
  // Check API key
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }
  
  console.log('Starting transcription with mimeType:', mimeType);
  console.log('Audio data length:', audioBase64.length);
  console.log('API Key prefix:', apiKey.substring(0, 10) + '...');
  
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      {
        text: `תמלל את ההקלטה הזו לעברית. 
        אם יש יותר מדובר אחד, סמן אותם כ"מטפל:" ו"מטופל:".
        החזר רק את התמלול, בלי הערות נוספות.`,
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('Transcription successful, text length:', text.length);

    return {
      text,
      confidence: 0.95, // Gemini doesn't return confidence scores
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && 'cause' in error ? String(error.cause) : '';
    console.error('Transcription error:', errorMessage, errorDetails, error);
    throw new Error(`Failed to transcribe audio: ${errorMessage}`);
  }
}

export async function transcribeAudioWithTimestamps(
  audioBase64: string,
  mimeType: string
): Promise<{
  text: string;
  segments: { start: number; end: number; text: string; speaker?: string }[];
}> {
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      {
        text: `תמלל את ההקלטה הזו לעברית עם חותמות זמן.
        פורמט הפלט צריך להיות JSON עם המבנה הבא:
        {
          "text": "הטקסט המלא",
          "segments": [
            { "start": 0, "end": 5, "text": "טקסט הקטע", "speaker": "מטפל" או "מטופל" }
          ]
        }
        החזר רק את ה-JSON, בלי הסברים נוספים.`,
      },
    ]);

    const response = await result.response;
    const jsonText = response.text();
    
    // Try to parse JSON from the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if no JSON found
    return {
      text: jsonText,
      segments: [],
    };
  } catch (error) {
    console.error('Transcription with timestamps error:', error);
    throw new Error('Failed to transcribe audio with timestamps');
  }
}








