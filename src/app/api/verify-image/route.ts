import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an image content moderator for a neighborhood sharing app. Analyze the uploaded profile picture and determine if it meets our community guidelines.

REQUIREMENTS:
1. Must be a real photo of a person (not cartoon, drawing, animal, object, etc.)
2. Must show the person's face clearly 
3. Must be appropriate for all ages (no nudity, suggestive content)
4. No offensive gestures, symbols, or hate speech
5. No text/clothing with offensive language or inappropriate messages
6. Should appear friendly and welcoming for a neighborhood community

Respond with a JSON object:
{
  "approved": boolean,
  "reason": "brief explanation if rejected",
  "confidence": "high|medium|low"
}

Be strict but fair. When in doubt, reject and ask for a different photo.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this profile picture according to our community guidelines."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to analyze image' }, 
        { status: 500 }
      );
    }

    // Parse the JSON response from OpenAI
    let analysis;
    try {
      analysis = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', result);
      return NextResponse.json(
        { 
          error: 'Unable to analyze image at this time',
          details: 'Analysis service error' 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      approved: analysis.approved,
      reason: analysis.reason,
      confidence: analysis.confidence,
    });

  } catch (error) {
    console.error('Image verification error:', error);
    
    // If OpenAI API is down, we could implement a fallback or temporary approval
    return NextResponse.json(
      { 
        error: 'Unable to verify image at this time',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}