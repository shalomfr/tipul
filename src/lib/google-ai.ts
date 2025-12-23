import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<{
  text: string;
  confidence?: number;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    return {
      text,
      confidence: 0.95, // Gemini doesn't return confidence scores
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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

