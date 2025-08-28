import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';

import { authOptions } from '@/lib/auth';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim();

  // Remove ```json at start and ``` at end
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '');
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64 for OpenAI
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Analyze image with GPT-4 Vision
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and identify the main object. Respond with a JSON object containing:
              - "name": a concise, descriptive name for the object (2-4 words max)
              - "recognized": true if you can clearly identify a specific object, false if unclear/multiple objects/too blurry
              - "confidence": a number between 0 and 1 representing how confident you are in the identification
              - "category": one of: "tools", "sports", "kitchen", "books", "electronics", "clothing", "furniture", "outdoor", "toys", "other"

              Only set "recognized" to true if there is ONE clear, identifiable object that takes up most of the frame. If the image is blurry, has multiple objects, or you're unsure what it is, set "recognized" to false.

              Examples of good responses:
              - {"name": "Hammer", "recognized": true, "confidence": 0.95, "category": "tools"}
              - {"name": "Tennis Racket", "recognized": true, "confidence": 0.88, "category": "sports"}
              - {"name": "Coffee Mug", "recognized": true, "confidence": 0.92, "category": "kitchen"}

              Respond only with the JSON object, no other text.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.type};base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        recognized: false,
        error: 'No response from AI',
      });
    }

    try {
      const cleanedContent = cleanJsonResponse(content);
      const result = JSON.parse(cleanedContent);

      // Validate the response structure
      if (
        typeof result.recognized !== 'boolean' ||
        typeof result.name !== 'string' ||
        typeof result.confidence !== 'number'
      ) {
        throw new Error('Invalid response format');
      }

      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', content);
      console.error('Cleaned response:', cleanJsonResponse(content));

      return NextResponse.json({
        recognized: false,
        error: 'Failed to parse AI response',
      });
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { recognized: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
