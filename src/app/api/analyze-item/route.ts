import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';

import { estimateCostCents } from '@/lib/ai-pricing';
import { authOptions } from '@/lib/auth';
import { checkSpendCap, recordSpend } from '@/lib/spend-cap';

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
    const nameHint = formData.get('nameHint') as string | null;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64 for OpenAI
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const spendCap = await checkSpendCap('openai');
    if (!spendCap.allowed) {
      return NextResponse.json({ error: spendCap.reason }, { status: 429 });
    }

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
              text: `Analyze this image and identify the main object. This is for a community sharing library that only accepts normal household goods.
${nameHint ? `\n              USER HINT: The user indicated this might be a "${nameHint}". Use this hint to help identify the object in the image, but still verify it matches what you see.\n` : ''}
              IMPORTANT CONTENT RESTRICTIONS:
              - REJECT items that are: illegal, unsafe, inappropriate, nudity, weapons, firearms, alcohol, tobacco, drugs, age-restricted items, or anything requiring ID verification
              - REJECT items that appear dangerous, hazardous, or could cause harm
              - REJECT items showing people in inappropriate situations or nudity
              - ONLY ACCEPT normal household goods that are safe to share in a community

              Respond with a JSON object containing:
              - "name": a concise, descriptive name for the object (2-4 words max)
              - "description": a helpful 1-2 sentence description that mentions key features, condition, or notable details visible in the image
              - "recognized": true if you can clearly identify a specific object AND it's an acceptable household item, false if unclear/multiple objects/too blurry/prohibited item
              - "confidence": a number between 0 and 1 representing how confident you are in the identification
              - "category": one of: "tools", "sports", "kitchen", "books", "electronics", "clothing", "furniture", "outdoor", "toys", "other"
              - "prohibited": true if the item falls under content restrictions, false if acceptable
              - "prohibitionReason": string explaining why the item is prohibited (only include if prohibited is true)
              - "subjectBox": the main object's location as [x, y, width, height], each a fraction of the image dimensions between 0 and 1, drawn tightly around the object (include whenever recognized is true)

              If the item is prohibited, set "recognized" to false and "prohibited" to true.

              Examples of acceptable responses:
              - {"name": "Hammer", "description": "A wooden-handled claw hammer with some wear marks on the metal head, appears to be in good working condition.", "recognized": true, "confidence": 0.95, "category": "tools", "prohibited": false}
              - {"name": "Tennis Racket", "description": "A black and yellow tennis racket with a graphite frame, strings appear to be in good condition with some minor scuffs on the handle.", "recognized": true, "confidence": 0.88, "category": "sports", "prohibited": false}

              Examples of prohibited responses:
              - {"name": "Beer Bottle", "description": "A glass beer bottle", "recognized": false, "confidence": 0.9, "category": "other", "prohibited": true, "prohibitionReason": "Alcohol is not permitted in our community sharing library"}
              - {"name": "Knife", "description": "A large kitchen knife", "recognized": false, "confidence": 0.95, "category": "tools", "prohibited": true, "prohibitionReason": "Sharp weapons and dangerous items are not permitted for safety reasons"}

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
      // Enough headroom for the JSON plus the subjectBox coordinates.
      max_tokens: 260,
      temperature: 0.1,
    });

    await recordSpend(
      'openai',
      estimateCostCents({
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      })
    );

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
        typeof result.description !== 'string' ||
        typeof result.confidence !== 'number' ||
        typeof result.prohibited !== 'boolean'
      ) {
        throw new Error('Invalid response format');
      }

      // Check for prohibited items
      if (result.prohibited) {
        return NextResponse.json({
          recognized: false,
          prohibited: true,
          error:
            result.prohibitionReason ||
            'This item is not permitted in our community sharing library',
        });
      }

      // subjectBox is advisory (batch intake crops around it, #468): pass it
      // through only when it's a sane normalized [x, y, w, h].
      const box = result.subjectBox;
      const boxValid =
        Array.isArray(box) &&
        box.length === 4 &&
        box.every((n: unknown) => typeof n === 'number' && n >= 0 && n <= 1) &&
        box[2] > 0 &&
        box[3] > 0 &&
        box[0] + box[2] <= 1.001 &&
        box[1] + box[3] <= 1.001;
      if (!boxValid) {
        delete result.subjectBox;
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
