import * as fs from 'fs';
import * as path from 'path';

import { GoogleGenAI } from '@google/genai';
import type {
  GenerateImagesParameters,
  GenerateVideosParameters,
} from '@google/genai';

interface Transition {
  startFrame: number;
  endFrame: number;
  title: string;
  prompt: string;
}

async function animateTransitions() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }

  const client = new GoogleGenAI({ apiKey });

  const storyboardDir = path.join(
    process.cwd(),
    'docs',
    'video',
    'storyboard_frames'
  );
  const outputDir = path.join(
    process.cwd(),
    'docs',
    'video',
    'animated_transitions'
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Define the 4 key transitions for the sharing sequence (frames 7-11)
  const transitions: Transition[] = [
    {
      startFrame: 7,
      endFrame: 8,
      title: 'Descending to First House',
      prompt: `Camera descends from aerial view of curved residential street toward a red brick ranch house. A miniature diorama with stop-motion aesthetic. The camera moves smoothly downward, getting closer to the house where a wooden ladder leans against it and a tiny figurine stands on the ladder. Warm Kodachrome colors, soft naturalistic lighting, dusk atmosphere. Model railroad aesthetic with textured miniature houses and foam trees. Smooth crane-down camera movement maintaining miniature scale.`,
    },
    {
      startFrame: 8,
      endFrame: 9,
      title: 'Ladder Handoff',
      prompt: `In a miniature diorama neighborhood, a tiny figurine climbs down a wooden ladder from a red brick house (now with completed glowing Christmas lights). The figurine carries the ladder across the driveway toward the neighboring olive green house. A second tiny figurine from the green house walks toward the first to help carry the ladder. The ladder moves between the two houses in a handoff motion. Stop-motion miniature aesthetic with warm Kodachrome colors, soft dusk lighting, model railroad details. Smooth natural movement of the figurines and ladder.`,
    },
    {
      startFrame: 9,
      endFrame: 10,
      title: 'Lights Accumulating',
      prompt: `Time-lapse effect in a miniature diorama neighborhood showing the wooden ladder being moved from house to house along a curved residential street. As the ladder moves, Christmas lights progressively appear and glow on each house roofline (warm colored bulbs—red, green, yellow, blue). The scene shows four houses with completed lights glowing warmly, and the ladder now at the fifth cream-colored house where a tiny figurine strings lights. Stop-motion miniature aesthetic, warm Kodachrome colors, dusk lighting deepening to early evening. Model railroad details with glowing house lights creating festive atmosphere.`,
    },
    {
      startFrame: 10,
      endFrame: 11,
      title: 'Completion and Celebration',
      prompt: `Final house in a miniature diorama neighborhood receives Christmas lights. A tiny figurine completes stringing the last lights on the sixth house, creating a complete display. The wooden ladder is set down peacefully against the garage or in the yard. Tiny neighbor figurines gather in small groups on the street and driveways, appearing to chat and admire the completed lights. All six houses glow warmly with colored Christmas lights (red, green, yellow, blue, white) against the deepening blue hour evening sky. Stop-motion miniature aesthetic with warm Kodachrome colors, model railroad details. A sense of completion and community warmth. Camera static or slow gentle pan to show all houses together.`,
    },
  ];

  console.log(
    '🎬 Starting Veo animation generation for storyboard transitions...'
  );
  console.log(`📁 Storyboard frames: ${storyboardDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`🎞️  Generating ${transitions.length} animated transitions...`);
  console.log('');

  for (const transition of transitions) {
    try {
      // Find the start frame file
      const frameFiles = fs.readdirSync(storyboardDir);
      const startFrameFile = frameFiles.find((f) =>
        f.startsWith(
          `frame_${transition.startFrame.toString().padStart(2, '0')}_`
        )
      );

      if (!startFrameFile) {
        throw new Error(
          `Start frame ${transition.startFrame} not found in ${storyboardDir}`
        );
      }

      const startFramePath = path.join(storyboardDir, startFrameFile);

      console.log(
        `[${transition.startFrame}→${transition.endFrame}] 🎥 Animating: ${transition.title}`
      );
      console.log(`   Start frame: ${startFrameFile}`);
      console.log(`   Prompt: ${transition.prompt.substring(0, 80)}...`);
      console.log('');

      // Read the start frame image
      const imageBuffer = fs.readFileSync(startFramePath);
      const imageBase64 = imageBuffer.toString('base64');

      const startTime = Date.now();

      // First, regenerate this frame with Imagen to get proper image object
      console.log(
        `   📸 Re-generating start frame with Imagen for proper format...`
      );
      const imagenParams: GenerateImagesParameters & {
        referenceImages: Array<{
          bytesBase64Encoded: string;
          mimeType: string;
        }>;
      } = {
        model: 'imagen-4.0-generate-001',
        prompt: `Recreate this exact miniature diorama scene with no changes.`,
        referenceImages: [
          {
            bytesBase64Encoded: imageBase64,
            mimeType: 'image/png',
          },
        ],
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      };

      const imagenResult = await client.models.generateImages(
        imagenParams as GenerateImagesParameters
      );

      const imagenImage = imagenResult.generatedImages?.[0]?.image;
      if (!imagenImage) {
        throw new Error('Failed to obtain regenerated frame for animation');
      }

      // Generate video with Veo using the Imagen image object
      const videoParams: GenerateVideosParameters = {
        model: 'veo-3.0-generate-001',
        prompt: transition.prompt,
        image: imagenImage,
        config: {
          aspectRatio: '16:9',
          personGeneration: 'allow_adult', // Only allow_adult supported for image-to-video
        },
      };
      const operation = await client.models.generateVideos(videoParams);

      console.log(`   ✅ Generation request submitted`);
      console.log(`   📋 Operation ID: ${operation.name}`);
      console.log(`   ⏳ Waiting for video generation...`);

      // Poll for completion
      let pollOperation = operation;
      let pollCount = 0;
      const pollStartTime = Date.now();

      while (!pollOperation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        pollCount++;
        const elapsed = Math.round((Date.now() - pollStartTime) / 1000);
        console.log(
          `   ⏳ Still generating... (check ${pollCount}, ${elapsed}s)`
        );

        pollOperation = await client.operations.get({
          operation: pollOperation,
        });
      }

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`   🎉 Video generated in ${totalTime}s`);

      // Download the video
      const generatedVideos =
        (
          pollOperation.response as
            | { generatedVideos?: Array<{ video?: { uri?: string } }> }
            | undefined
        )?.generatedVideos ?? [];
      if (generatedVideos.length === 0) {
        throw new Error('No video generated in response');
      }

      const [generatedVideo] = generatedVideos;
      const videoUri = generatedVideo?.video?.uri;
      if (!videoUri) {
        throw new Error('Generated video URI missing in response');
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(
        outputDir,
        `transition_${transition.startFrame}_to_${transition.endFrame}_${timestamp}.mp4`
      );

      console.log(`   💾 Downloading video...`);

      const videoResponse = await fetch(videoUri, {
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download: ${videoResponse.status} ${videoResponse.statusText}`
        );
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(videoBuffer));

      console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
      console.log('');
    } catch (error) {
      console.error(
        `   ❌ Error animating transition ${transition.startFrame}→${transition.endFrame}:`,
        error
      );
      console.error('');
      // Continue with next transition
      continue;
    }
  }

  console.log('');
  console.log('✅ Animation generation complete!');
  console.log(`📁 All videos saved to: ${outputDir}`);
  console.log('');
  console.log('🎬 Next steps:');
  console.log('   1. Review the animated transitions');
  console.log('   2. Edit them together in sequence');
  console.log('   3. Add sound design and music');
  console.log(
    '   4. Decide whether to refine frames 1-6 or use alternative opening'
  );
}

// Run the script
animateTransitions()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
