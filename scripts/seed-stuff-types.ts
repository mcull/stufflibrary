import { readdir } from 'fs/promises';
import path from 'path';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extract object name from filename: "noun-toolbox-8029186.svg" -> "toolbox"
function extractObjectName(filename: string): string {
  const nameMatch = filename.match(/^noun-(.+?)-\d+\.svg$/);
  return nameMatch?.[1]?.replace(/-/g, ' ') ?? filename.replace('.svg', '');
}

// Capitalize for display name: "toolbox" -> "Toolbox"
function toDisplayName(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Categorize objects based on keywords
function categorizeObject(name: string): string {
  const lowerName = name.toLowerCase();

  if (
    lowerName.includes('saw') ||
    lowerName.includes('drill') ||
    lowerName.includes('hammer') ||
    lowerName.includes('wrench') ||
    lowerName.includes('tool') ||
    lowerName.includes('pliers') ||
    lowerName.includes('anvil') ||
    lowerName.includes('screwdriver') ||
    lowerName.includes('caliper') ||
    lowerName.includes('crowbar') ||
    lowerName.includes('stapler') ||
    lowerName.includes('level') ||
    lowerName.includes('workbench')
  ) {
    return 'tools';
  }

  if (
    lowerName.includes('ball') ||
    lowerName.includes('bat') ||
    lowerName.includes('racket') ||
    lowerName.includes('bicycle') ||
    lowerName.includes('surfboard') ||
    lowerName.includes('kite')
  ) {
    return 'sports';
  }

  if (lowerName.includes('mixer') || lowerName.includes('pasta')) {
    return 'kitchen';
  }

  if (
    lowerName.includes('lawn') ||
    lowerName.includes('rake') ||
    lowerName.includes('wheelbarrow') ||
    lowerName.includes('leaf blower') ||
    lowerName.includes('watering') ||
    lowerName.includes('pruning') ||
    lowerName.includes('aerator') ||
    lowerName.includes('sweeper') ||
    lowerName.includes('trimmer')
  ) {
    return 'yard';
  }

  if (
    lowerName.includes('backpack') ||
    lowerName.includes('tent') ||
    lowerName.includes('helicopter')
  ) {
    return 'outdoor';
  }

  if (lowerName.includes('truck') || lowerName.includes('tape')) {
    return 'moving';
  }

  return 'general';
}

async function seedStuffTypes() {
  console.log('🌱 Seeding stuff types from icon files...');

  try {
    const stuffIconsPath = path.join(process.cwd(), 'public', 'stuff icons');
    const files = await readdir(stuffIconsPath);
    const svgFiles = files.filter((file) => file.endsWith('.svg'));

    console.log(`Found ${svgFiles.length} stuff icons to process`);

    const stuffTypes = svgFiles.map((filename) => {
      const name = extractObjectName(filename);
      const displayName = toDisplayName(name);
      const iconPath = `/stuff icons/${filename}`;
      const category = categorizeObject(name);

      return {
        name,
        displayName,
        iconPath,
        category,
      };
    });

    // Delete existing stuff types (for re-seeding)
    await prisma.stuffType.deleteMany();
    console.log('🗑️ Cleared existing stuff types');

    // Insert new stuff types
    const result = await prisma.stuffType.createMany({
      data: stuffTypes,
    });

    console.log(`✅ Created ${result.count} stuff types`);

    // Show sample of what was created
    const samples = await prisma.stuffType.findMany({
      take: 5,
      select: { name: true, displayName: true, category: true, iconPath: true },
    });

    console.log('📦 Sample stuff types:');
    samples.forEach((item) => {
      console.log(
        `  - ${item.displayName} (${item.category}): ${item.iconPath}`
      );
    });
  } catch (error) {
    console.error('❌ Error seeding stuff types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedStuffTypes();
}

export { seedStuffTypes };
