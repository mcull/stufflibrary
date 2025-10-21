import * as fs from 'fs';
import * as path from 'path';

import { GoogleGenAI } from '@google/genai';
import type { GenerateVideosParameters } from '@google/genai';

async function generateVideo() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }

  const client = new GoogleGenAI({ apiKey });

  // The prompt from scene_01_ladder_delivery_prompt.md
  const prompt = `Generate a 40-second stop-motion style cinematic video of miniature suburban neighborhoods, shot as if with a real camera over a physical diorama. Use warm Kodachrome-style color grading and soft naturalistic lighting. The video begins with an aerial view of six adjacent ranch-style houses, where six white delivery vans arrive simultaneously and deliver identical wooden ladders. Tiny figures place the ladders in their garages, which close in sequence. The camera then performs a smooth crane-up and lateral dolly pan across a miniature town landscape, before descending into a second neighborhood arranged in a cul-de-sac. Here, a single ladder is passed hand-to-hand between six neighbors, each using it to string glowing Christmas lights on their house in turn. The houses progressively light up with warm holiday lights as the ladder circulates. The aesthetic should feel handcrafted and textured—avoid glossy CGI—with slight camera sway and vintage 1960s educational film warmth. Audio: ambient suburban sounds, garage doors, wind, and soft holiday ambiance.`;

  const negativePrompt = `Hyperrealistic CGI human faces, glossy over-polished surfaces, pure photorealism, cartoonish bounce or exaggerated physics, modern flat vector animation style, corporate stock footage look, overly saturated colors`;

  console.log('🎬 Starting Veo 3 video generation...');
  console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
  console.log('');

  try {
    // Start video generation
    const videoRequest: GenerateVideosParameters = {
      model: 'veo-3.0-generate-001',
      prompt,
      config: {
        negativePrompt,
        aspectRatio: '16:9',
        personGeneration: 'allow_all',
      },
    };
    const operation = await client.models.generateVideos(videoRequest);

    console.log('✅ Generation request submitted');
    console.log(`📋 Operation ID: ${operation.name}`);
    console.log('⏳ Waiting for video generation to complete...');
    console.log('   (This can take 11 seconds to 6 minutes)');
    console.log('');

    // Poll for completion
    let pollOperation = operation;
    let pollCount = 0;
    const startTime = Date.now();

    while (!pollOperation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      pollCount++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `⏳ Still generating... (check ${pollCount}, ${elapsed}s elapsed)`
      );

      // Get the latest operation status
      pollOperation = await client.operations.get({ operation: pollOperation });
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('');
    console.log(`🎉 Video generation complete! (${totalTime}s total)`);

    // Debug: log the response structure
    console.log('');
    console.log('📊 Response structure:');
    console.log(
      '  Response:',
      JSON.stringify(pollOperation.response, null, 2).substring(0, 500)
    );
    console.log('');

    // Check if response and generatedVideos exist (camelCase in JS SDK)
    const generatedVideos =
      (
        pollOperation.response as
          | { generatedVideos?: Array<{ video?: { uri?: string } }> }
          | undefined
      )?.generatedVideos ?? [];
    if (generatedVideos.length === 0) {
      console.error('❌ No generated videos found in response');
      console.error('Full response:', JSON.stringify(pollOperation, null, 2));
      throw new Error('No generated videos in response');
    }

    // Download the generated video (camelCase in JS SDK)
    const [generatedVideo] = generatedVideos;
    const videoUri = generatedVideo?.video?.uri;
    if (!videoUri) {
      throw new Error('Generated video URI missing');
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'docs', 'video', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(
      outputDir,
      `scene_01_ladder_paradox_${timestamp}.mp4`
    );

    console.log(`💾 Downloading video from: ${videoUri}`);
    console.log(`💾 Saving to: ${outputPath}`);

    // Download the video file from the URI with API key authentication
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
    if (!videoResponse.ok) {
      throw new Error(
        `Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(videoBuffer));

    console.log('');
    console.log('✅ SUCCESS!');
    console.log(`📹 Video saved to: ${outputPath}`);
    console.log('');
    console.log('Video details:');
    console.log(`  - Duration: 8 seconds`);
    console.log(`  - Resolution: 1080p`);
    console.log(`  - Aspect Ratio: 16:9`);
    console.log(`  - Model: veo-3.0-generate-001`);
    console.log(`  - SynthID watermark: Yes`);
    console.log('');
    console.log('🎬 Ready to review! Open the file to see the results.');
  } catch (error) {
    console.error('');
    console.error('❌ Error generating video:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    throw error;
  }
}

// Run the script
generateVideo()
  .then(() => {
    console.log('');
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
