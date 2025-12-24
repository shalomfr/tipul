import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface SessionAnalysis {
  summary: string;
  keyTopics: string[];
  emotionalMarkers: {
    emotion: string;
    intensity: 'low' | 'medium' | 'high';
    context: string;
  }[];
  recommendations: string[];
  nextSessionNotes: string;
}

export async function analyzeSession(transcription: string): Promise<SessionAnalysis> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `אתה פסיכולוג קליני מנוסה. נתח את תמלול הפגישה הטיפולית הבא והחזר ניתוח מובנה.

תמלול הפגישה:
${transcription}

החזר את התשובה בפורמט JSON עם המבנה הבא:
{
  "summary": "סיכום קצר של הפגישה (2-3 משפטים)",
  "keyTopics": ["נושא 1", "נושא 2", ...],
  "emotionalMarkers": [
    {
      "emotion": "שם הרגש",
      "intensity": "low" | "medium" | "high",
      "context": "ההקשר בו הרגש הופיע"
    }
  ],
  "recommendations": ["המלצה 1", "המלצה 2", ...],
  "nextSessionNotes": "נקודות לדיון בפגישה הבאה"
}

החזר רק את ה-JSON, בלי הסברים נוספים.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No valid JSON in response');
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('Failed to analyze session');
  }
}

export async function generateSessionSummary(transcription: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `אתה פסיכולוג קליני מנוסה. כתוב סיכום מקצועי קצר של הפגישה הטיפולית הבאה.
הסיכום צריך להיות בגוף שלישי, מקצועי, ומתאים לתיעוד רפואי.

תמלול הפגישה:
${transcription}

כתוב סיכום של 3-5 משפטים.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate summary');
  }
}

export async function analyzeIntake(transcription: string): Promise<{
  clientProfile: {
    presentingIssues: string[];
    background: string;
    goals: string[];
  };
  recommendations: string[];
  riskFactors: string[];
}> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `אתה פסיכולוג קליני מנוסה. נתח את שיחת הקבלה/פתיחת תיק הבאה ובנה פרופיל ראשוני של המטופל.

תמלול השיחה:
${transcription}

החזר את התשובה בפורמט JSON עם המבנה הבא:
{
  "clientProfile": {
    "presentingIssues": ["בעיה 1", "בעיה 2", ...],
    "background": "רקע קצר על המטופל",
    "goals": ["מטרה 1", "מטרה 2", ...]
  },
  "recommendations": ["המלצה לטיפול 1", "המלצה 2", ...],
  "riskFactors": ["גורם סיכון 1", ...] // אם אין - מערך ריק
}

החזר רק את ה-JSON, בלי הסברים נוספים.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No valid JSON in response');
  } catch (error) {
    console.error('Intake analysis error:', error);
    throw new Error('Failed to analyze intake');
  }
}


