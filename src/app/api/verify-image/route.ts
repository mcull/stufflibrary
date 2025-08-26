import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        'OPENAI_API_KEY not configured - image verification disabled'
      );
      return NextResponse.json(
        {
          error: 'Image verification service not available',
          details: 'OpenAI API key not configured',
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to base64 for OpenAI
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Use OpenAI Vision API to analyze the image
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an image content moderator for a neighborhood sharing app. Analyze the uploaded profile picture and determine if it meets our community guidelines.

REQUIREMENTS:
1. Must be a real photo of a person (not cartoon, drawing, animal, object, etc.)
2. Must show the person's face clearly 
3. Must be appropriate for all ages (no nudity, suggestive content)
4. No offensive gestures, symbols, or hate speech
5. No text/clothing with offensive language or inappropriate messages
6. Should appear friendly and welcoming for a neighborhood community

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "approved": boolean,
  "reason": "brief explanation if rejected",
  "confidence": "high|medium|low"
}

Do not include any other text, explanations, or formatting. Only return the JSON object. Be strict but fair. When in doubt, reject and ask for a different photo.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this profile picture according to our community guidelines.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;

    console.log('OpenAI API response:', result);

    if (!result) {
      console.error('No content in OpenAI response:', response);
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: 500 }
      );
    }

    // Parse the JSON response from OpenAI
    let analysis;
    try {
      // Try to extract JSON from the response (sometimes OpenAI wraps it in markdown)
      let jsonString = result.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString
          .replace(/```json\n?/, '')
          .replace(/\n?```$/, '');
      }
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      analysis = JSON.parse(jsonString);
      console.log('Parsed analysis:', analysis);

      // Validate that the response has the expected structure
      if (typeof analysis.approved !== 'boolean') {
        throw new Error(
          'Invalid response structure: missing or invalid approved field'
        );
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', result);
      console.error('Parse error:', parseError);

      // Fallback: try to extract approval from text
      const lowerResult = result.toLowerCase();
      if (lowerResult.includes('approved') && lowerResult.includes('true')) {
        console.log('Using fallback parsing - approved');
        analysis = {
          approved: true,
          reason: 'Approved via fallback parsing',
          confidence: 'low',
        };
      } else if (
        lowerResult.includes('approved') &&
        lowerResult.includes('false')
      ) {
        console.log('Using fallback parsing - rejected');
        analysis = {
          approved: false,
          reason: 'Rejected via fallback parsing',
          confidence: 'low',
        };
      } else {
        return NextResponse.json(
          {
            error: 'Unable to analyze image at this time',
            details: 'Analysis service error - invalid JSON response',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      approved: analysis.approved,
      reason: analysis.reason || 'No reason provided',
      confidence: analysis.confidence || 'unknown',
    });
  } catch (error) {
    console.error('Image verification error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // If OpenAI API is down, we could implement a fallback or temporary approval
    return NextResponse.json(
      {
        error: 'Unable to verify image at this time',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
