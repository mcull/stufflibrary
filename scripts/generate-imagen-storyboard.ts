import * as fs from 'fs';
import * as path from 'path';

import { GoogleGenAI } from '@google/genai';
import type { GenerateImagesParameters } from '@google/genai';

async function generateStoryboardFrames() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }

  const client = new GoogleGenAI({ apiKey });

  // Define all 11 frame prompts
  const frames = [
    {
      number: 1,
      title: 'Vans Arriving',
      prompt: `A miniature diorama aerial view of a suburban street with six adjacent 1950s ranch-style houses (yellow, light blue, pale green, cream, grey, and beige). Six white delivery vans are driving up the street from the left side, approaching the houses in a neat convoy. The houses have small front yards with tiny model trees, driveways, and closed garages. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting, shallow depth of field. Model railroad aesthetic with visible textures—plastic houses, foam bushes, painted details. Camera angle: 45-degree aerial view. Warm afternoon lighting with soft shadows.`,
    },
    {
      number: 2,
      title: 'Vans Parked, Delivery Begins',
      prompt: `A miniature diorama aerial view of the same suburban street. Six white delivery vans are now parked in front of six adjacent houses, doors open. Tiny figurines representing delivery people stand beside each van, holding or unloading small wooden ladders. The ladders are identical—simple wooden A-frame stepladders visible next to each van. Homeowners (tiny figurines) stand in driveways. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting, shallow depth of field. Model railroad aesthetic—plastic delivery vans, painted figurines, foam yard details. Camera angle: 45-degree aerial view. Warm afternoon lighting.`,
    },
    {
      number: 3,
      title: 'Ladders Going Into Garages',
      prompt: `A miniature diorama aerial view of six suburban houses. The delivery vans are still parked. At each house, tiny figurines (delivery people and homeowners) are positioned near open garage doors, with wooden ladders being carried or positioned near the garage entrances. The garages are open, showing interior details—tiny bikes, boxes, and storage items visible inside. The ladders are in various stages of being moved: some halfway to the garage, some leaning against garage doors. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad aesthetic with visible painted details. Camera angle: 45-degree aerial view.`,
    },
    {
      number: 4,
      title: 'Garages Closing, Vans Leaving',
      prompt: `A miniature diorama aerial view of six suburban houses. The garage doors are now closed (or mostly closed), with the wooden ladders stored inside. The six white delivery vans are pulling away from the curbs, driving off toward the right side of the frame in a departing convoy. The street is returning to quiet suburban stillness. Tiny homeowner figurines stand in driveways watching the vans leave. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting, shallow depth of field. Model railroad aesthetic—plastic houses, foam trees, painted road. Camera angle: 45-degree aerial view. Warm afternoon light casting soft shadows.`,
    },
    {
      number: 5,
      title: 'Pulling Up from Neighborhood #1',
      prompt: `A high-altitude aerial view of a miniature suburban neighborhood diorama. The six houses from the previous scene are now visible as a small cluster in the lower portion of frame. The surrounding neighborhood grid is visible—multiple blocks of tiny houses, street grid, small parks with miniature trees, a main street with shops. Everything is a physical miniature model with visible textures. The depth of field is wider now, showing more of the town layout. Physical miniature diorama photographed from above with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad town aesthetic—foam terrain, plastic buildings, painted roads. Camera altitude: very high, almost bird's-eye view. Warm afternoon lighting.`,
    },
    {
      number: 6,
      title: 'Sweeping Across Town',
      prompt: `An aerial view of a different section of the miniature town diorama. The camera has moved laterally across the model landscape. This view shows a downtown main street area with tiny storefronts, a small park with a fountain and model trees, and residential neighborhoods in the background. Some buildings are brick, others are painted wood. The miniature town layout feels organic, not grid-perfect. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting with gentle depth of field. Model railroad aesthetic—hand-painted buildings, foam trees, textured roads. Camera angle: 45-degree aerial view panning across landscape. Warm afternoon light.`,
    },
    {
      number: 7,
      title: 'Descending Toward Neighborhood #2',
      prompt: `A miniature diorama aerial view descending toward a second residential neighborhood. Six ranch-style houses are arranged along a curved residential street (not a closed circle—an open curve or L-shape). The houses are different colors than the first neighborhood—warm reds, oranges, browns, olive green, cream. Some houses already have tiny Christmas lights strung along rooflines (colored dots of light). A single wooden ladder is visible leaning against the first house on the left, where a tiny figurine stands on the roof. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting, shallow depth of field. Model railroad aesthetic. Camera angle: 45-degree aerial view, slightly lower altitude. Warm afternoon transitioning to dusk lighting—soft golden light with hints of blue shadow.`,
    },
    {
      number: 8,
      title: 'First House - Ladder in Use',
      prompt: `A miniature diorama close-up aerial view of a red brick ranch house with a single wooden ladder leaning against it. A tiny figurine stands on the ladder near the roofline, appearing to string Christmas lights. Another tiny figurine stands in the driveway below, looking up. The house has warm glowing Christmas lights already strung along part of the roofline (small colored bulbs—red, green, yellow). Five other houses are visible in the background along the curved street, most without lights yet. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad aesthetic—textured plastic house, foam yard, painted figurines. Camera angle: 45-degree aerial close-up. Dusk lighting—warm golden hour with house lights beginning to glow.`,
    },
    {
      number: 9,
      title: 'Ladder Being Passed to Second House',
      prompt: `A miniature diorama aerial view showing two adjacent houses along a curved residential street. A tiny figurine is carrying the wooden ladder from the first house (which now has complete Christmas lights glowing) toward the second house (an olive green ranch house). A second figurine from the olive green house walks toward the first figurine to help carry the ladder. The ladder is positioned between the two houses, mid-transfer. Three other houses are visible in the background, two without lights, one with lights partially strung. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad aesthetic with visible textures. Camera angle: 45-degree aerial view. Dusk lighting—warm glowing house lights against deepening blue shadows.`,
    },
    {
      number: 10,
      title: 'Multiple Houses Lighting Up',
      prompt: `A miniature diorama aerial view of the curved residential street with six houses. Four houses now have glowing Christmas lights strung along their rooflines (warm colored bulbs—red, green, yellow, blue). The wooden ladder is currently leaning against the fifth house (cream-colored), where a tiny figurine is on the ladder stringing lights. Two more figurines stand in the driveway watching or waiting. The first four houses glow warmly with completed light displays. The sixth house in the background is still dark. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad aesthetic—textured plastic houses, foam trees, painted details. Camera angle: 45-degree aerial view. Dusk/early evening lighting—houses glowing, blue evening shadows.`,
    },
    {
      number: 11,
      title: 'All Houses Lit - Ladder at Rest',
      prompt: `A miniature diorama aerial view of six houses along a curved residential street at dusk. All six houses now have glowing Christmas lights strung along their rooflines, creating a warm, festive scene. The lights twinkle with colored bulbs (red, green, yellow, blue, white). The single wooden ladder is leaning peacefully against the garage of the final house, or propped in a front yard. Tiny figurines (neighbors) are gathered in small groups on the street and driveways, appearing to chat or admire the lights. A warm communal feeling. Physical miniature diorama photographed with real camera, warm Kodachrome color palette, soft naturalistic lighting. Model railroad aesthetic—glowing house windows, textured details, foam trees with tiny lights. Camera angle: 45-degree aerial view. Evening lighting—rich blue hour with warm glowing lights creating inviting atmosphere.`,
    },
  ];

  // Create output directory
  const outputDir = path.join(
    process.cwd(),
    'docs',
    'video',
    'storyboard_frames'
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Starting Imagen 3 storyboard generation...');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`🖼️  Generating ${frames.length} frames...`);
  console.log('');

  for (const frame of frames) {
    try {
      console.log(`[${frame.number}/11] 🖌️  Generating: ${frame.title}`);
      console.log(`   Prompt: ${frame.prompt.substring(0, 80)}...`);

      const startTime = Date.now();

      // Generate image with Imagen 4
      const request: GenerateImagesParameters = {
        model: 'imagen-4.0-generate-001',
        prompt: frame.prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      };
      const result = await client.models.generateImages(request);

      const elapsed = Date.now() - startTime;

      // Debug: log response structure
      console.log('   Response:', JSON.stringify(result).substring(0, 200));

      // Save the generated image (check both snake_case and camelCase)
      const generatedImages = result.generatedImages ?? [];
      if (generatedImages.length === 0) {
        console.error('   Full response:', JSON.stringify(result, null, 2));
        throw new Error('No images generated in response');
      }
      const generatedImage = generatedImages[0];
      const image = generatedImage?.image as
        | {
            imageBytes?: string;
            gcsUri?: string;
            imageUrl?: string;
          }
        | undefined;
      if (!image) {
        throw new Error('No image data in generated image');
      }

      const outputPath = path.join(
        outputDir,
        `frame_${frame.number.toString().padStart(2, '0')}_${frame.title.toLowerCase().replace(/\s+/g, '_')}.png`
      );

      // Imagen returns imageBytes directly in base64, not a URL
      if (image.imageBytes) {
        // Decode base64 and save directly
        const imageBuffer = Buffer.from(image.imageBytes, 'base64');
        fs.writeFileSync(outputPath, imageBuffer);
      } else if (image.imageUrl || image.gcsUri) {
        // Fallback: if it's a URL, download it
        const remoteUri = image.imageUrl ?? image.gcsUri;
        if (!remoteUri) {
          throw new Error('Remote image URI missing');
        }
        const imageResponse = await fetch(remoteUri, {
          headers: {
            'x-goog-api-key': apiKey,
          },
        });

        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
          );
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(imageBuffer));
      } else {
        throw new Error('No imageBytes or imageUrl in response');
      }

      console.log(`   ✅ Generated in ${elapsed}ms`);
      console.log(`   💾 Saved: ${path.basename(outputPath)}`);
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error generating frame ${frame.number}:`, error);
      console.error('');
      // Continue with next frame instead of failing completely
      continue;
    }
  }

  console.log('');
  console.log('✅ Storyboard generation complete!');
  console.log(`📁 All frames saved to: ${outputDir}`);
  console.log('');
  console.log('🎬 Next steps:');
  console.log('   1. Review the generated frames for consistency');
  console.log('   2. Regenerate any problematic frames individually');
  console.log('   3. Use frames as input for Veo image-to-video generation');
}

// Run the script
generateStoryboardFrames()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
