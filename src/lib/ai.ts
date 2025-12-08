import OpenAI from 'openai';

// Initialize OpenAI client
const getClient = (): OpenAI => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set in environment variables. Please add it to your .env file.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // only for dev, not prod
  });
};

/**
 * Generate 3 reply templates for an anonymous vent message
 */
export async function generateReplyTemplates(messageBody: string): Promise<string> {
  try {
    const client = getClient();

    const prompt = `You are a supportive friend. The user received this anonymous vent:

"${messageBody}"

Write 3 short reply templates they could send back privately. 
- Be empathetic but not fake.
- Max 3 sentences each.
- Label them 1), 2), 3).`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Failed to generate replies';
  } catch (error: any) {
    console.error('Error generating reply templates:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    if (errorMessage.includes('VITE_OPENAI_API_KEY')) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }
    throw new Error(`Failed to generate replies: ${errorMessage}`);
  }
}

/**
 * Summarize themes from the last 20 messages and provide self-care reminders
 */
export async function summarizeThemes(messages: string[]): Promise<string> {
  try {
    const client = getClient();

    const combined = messages.slice(0, 20).map((m) => `- ${m}`).join('\n');

    const prompt = `These are anonymous vents someone received:

${combined}

1) Summarize the main themes in 3–5 bullet points.
2) Then give 2 short self-care reminders for the person reading them.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Failed to generate summary';
  } catch (error: any) {
    console.error('Error generating theme summary:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    if (errorMessage.includes('VITE_OPENAI_API_KEY')) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }
    throw new Error(`Failed to generate summary: ${errorMessage}`);
  }
}

