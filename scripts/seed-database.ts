/**
 * Database Seeding Script for StuffLibrary
 * Generates realistic test data with multiple user clusters across the US
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

// US Geographic Clusters - Real cities for realistic data
const US_CLUSTERS = [
  {
    name: 'Austin Cluster',
    city: 'Austin',
    state: 'TX',
    zipCodes: ['78701', '78702', '78703', '78704', '78705', '78712'],
    coordinates: { lat: 30.2672, lng: -97.7431 },
  },
  {
    name: 'Seattle Cluster',
    city: 'Seattle',
    state: 'WA',
    zipCodes: ['98101', '98102', '98103', '98104', '98105', '98106'],
    coordinates: { lat: 47.6062, lng: -122.3321 },
  },
  {
    name: 'Brooklyn Cluster',
    city: 'Brooklyn',
    state: 'NY',
    zipCodes: ['11201', '11205', '11206', '11215', '11216', '11217'],
    coordinates: { lat: 40.6782, lng: -73.9442 },
  },
  {
    name: 'Denver Cluster',
    city: 'Denver',
    state: 'CO',
    zipCodes: ['80202', '80203', '80204', '80205', '80206', '80207'],
    coordinates: { lat: 39.7392, lng: -104.9903 },
  },
  {
    name: 'Portland Cluster',
    city: 'Portland',
    state: 'OR',
    zipCodes: ['97201', '97202', '97205', '97209', '97210', '97211'],
    coordinates: { lat: 45.5152, lng: -122.6784 },
  },
  {
    name: 'Miami Cluster',
    city: 'Miami',
    state: 'FL',
    zipCodes: ['33101', '33109', '33130', '33131', '33132', '33134'],
    coordinates: { lat: 25.7617, lng: -80.1918 },
  },
];

// Realistic user data pools
const FIRST_NAMES = [
  'Alex',
  'Sam',
  'Jordan',
  'Taylor',
  'Casey',
  'Morgan',
  'Riley',
  'Avery',
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'William',
  'Sophia',
  'Mason',
  'Isabella',
  'James',
  'Mia',
  'Benjamin',
  'Charlotte',
  'Jacob',
  'Amelia',
  'Michael',
  'Harper',
  'Elijah',
  'Evelyn',
  'Ethan',
  'Abigail',
  'Alexander',
  'Emily',
  'Owen',
  'Elizabeth',
  'Daniel',
  'Mila',
  'Lucas',
  'Ella',
  'Matthew',
  'Avery',
  'Aiden',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
];

const INTERESTS = [
  'woodworking',
  'gardening',
  'cooking',
  'baking',
  'electronics',
  'automotive',
  'camping',
  'hiking',
  'cycling',
  'sports',
  'fitness',
  'photography',
  'art',
  'crafting',
  'music',
  'reading',
  'gaming',
  'travel',
  'home improvement',
  'technology',
  'fashion',
  'books',
  'movies',
  'outdoor activities',
  'tools',
];

const BIO_TEMPLATES = [
  'Love sharing and borrowing useful stuff with neighbors! Always happy to lend a hand or tool.',
  "Avid DIY enthusiast who believes in community sharing. Let's help each other out!",
  'New to the neighborhood and excited to meet people through sharing resources.',
  "Minimalist at heart - I'd rather borrow than buy! Happy to share what I have too.",
  'Passionate about sustainable living and reducing waste through sharing.',
  'Tool collector who loves helping neighbors with their projects.',
  'Enjoy cooking, gardening, and sharing the bounty with friends and neighbors.',
  'Believe in building strong communities through mutual aid and resource sharing.',
];

// Stuff items with icons
const STUFF_ITEMS = [
  {
    name: 'Power Drill',
    category: 'Tools',
    icon: 'noun-drill-8029214.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Circular Saw',
    category: 'Tools',
    icon: 'noun-circular-saw-8029203.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Hammer',
    category: 'Tools',
    icon: 'noun-hammer-8029207.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Level',
    category: 'Tools',
    icon: 'noun-level-8029185.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Wrench Set',
    category: 'Tools',
    icon: 'noun-wrench-8029178.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Toolbox',
    category: 'Tools',
    icon: 'noun-toolbox-8029186.svg',
    condition: ['good', 'fair'],
  },
  {
    name: 'Chainsaw',
    category: 'Tools',
    icon: 'noun-chainsaw-8029187.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Lawn Mower',
    category: 'Garden',
    icon: 'noun-lawn-mower-8029224.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Leaf Blower',
    category: 'Garden',
    icon: 'noun-leaf-blower-8029181.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Rake',
    category: 'Garden',
    icon: 'noun-rake-8029189.svg',
    condition: ['good', 'fair'],
  },
  {
    name: 'Watering Can',
    category: 'Garden',
    icon: 'noun-watering-can-8029195.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Pruning Shears',
    category: 'Garden',
    icon: 'noun-pruning-shears-8029183.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Wheelbarrow',
    category: 'Garden',
    icon: 'noun-wheelbarrow-8029180.svg',
    condition: ['good', 'fair'],
  },
  {
    name: 'Hand Mixer',
    category: 'Kitchen',
    icon: 'noun-hand-mixer-7133549.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Pasta Maker',
    category: 'Kitchen',
    icon: 'noun-pasta-maker-7133554.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Bicycle',
    category: 'Sports',
    icon: 'noun-bicycle-6169822.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Basketball',
    category: 'Sports',
    icon: 'noun-basketball-ball-4390463.svg',
    condition: ['good', 'fair'],
  },
  {
    name: 'Tennis Racket',
    category: 'Sports',
    icon: 'noun-racket-4390460.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Baseball Bat',
    category: 'Sports',
    icon: 'noun-bat-4390462.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Camping Tent',
    category: 'Outdoor',
    icon: 'noun-tent-4997877.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Backpack',
    category: 'Outdoor',
    icon: 'noun-backpack-4997875.svg',
    condition: ['excellent', 'good', 'fair'],
  },
  {
    name: 'Kite',
    category: 'Outdoor',
    icon: 'noun-kite-4997862.svg',
    condition: ['good', 'fair'],
  },
  {
    name: 'Surfboard',
    category: 'Sports',
    icon: 'noun-surfboard-4997878.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Hand Truck',
    category: 'Tools',
    icon: 'noun-hand-truck-8029202.svg',
    condition: ['excellent', 'good'],
  },
  {
    name: 'Measuring Tape',
    category: 'Tools',
    icon: 'noun-measuring-tape-8029220.svg',
    condition: ['excellent', 'good'],
  },
];

const LIBRARY_NAMES = [
  'Neighborhood Tool Share',
  'Community Garden Hub',
  'Local Makers Collective',
  'Sustainable Living Circle',
  'DIY Enthusiasts Group',
  'Green Living Network',
  'Tool Library Co-op',
  'Resourceful Neighbors',
  'Sharing Economy Hub',
  'EcoFriendly Community',
  'Mutual Aid Network',
  'Creative Commons Collective',
];

const LIBRARY_DESCRIPTIONS = [
  'A community-driven space for sharing tools, equipment, and resources among neighbors.',
  'Passionate group focused on sustainable living and reducing waste through resource sharing.',
  'Local makers and DIY enthusiasts sharing tools, materials, and knowledge.',
  'Building stronger community connections through collaborative resource sharing.',
  'Eco-conscious neighbors working together to minimize consumption and maximize sharing.',
  'Tool library serving the local community with quality equipment and friendly service.',
];

// Helper functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

let emailCounter = 1;

function generateEmail(firstName: string, lastName: string): string {
  return `tester+${firstName.toLowerCase()}.${lastName.toLowerCase()}.${emailCounter++}@stufflibrary.org`;
}

function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${exchange}-${number}`;
}

function randomDateInRange(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Future: Gemini API integration for generating profile pictures and item images

// Main seeding functions
interface SeededUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  addresses: { city: string; state: string }[];
}

async function createUsersForCluster(
  cluster: (typeof US_CLUSTERS)[0],
  userCount: number
): Promise<SeededUser[]> {
  const users: SeededUser[] = [];

  for (let i = 0; i < userCount; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const email = generateEmail(firstName, lastName);
    const zipCode = randomChoice(cluster.zipCodes);

    // Generate slight variations in coordinates within the cluster
    const latVariation = (Math.random() - 0.5) * 0.02; // ~1 mile variation
    const lngVariation = (Math.random() - 0.5) * 0.02;

    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: email,
        emailVerified: new Date(),
        phone: generatePhoneNumber(),
        phoneVerified: true,
        bio: randomChoice(BIO_TEMPLATES),
        shareInterests: randomChoices(
          INTERESTS,
          Math.floor(Math.random() * 5) + 2
        ),
        borrowInterests: randomChoices(
          INTERESTS,
          Math.floor(Math.random() * 5) + 2
        ),
        profileCompleted: true,
        trustScore: 900 + Math.random() * 200, // 900-1100 range
        createdAt: randomDateInRange(
          new Date('2023-01-01'),
          new Date('2024-08-01')
        ),
        addresses: {
          create: {
            address1: `${Math.floor(Math.random() * 9999) + 1} ${randomChoice(['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm'])} ${randomChoice(['St', 'Ave', 'Dr', 'Ln', 'Rd'])}`,
            city: cluster.city,
            state: cluster.state,
            zip: zipCode,
            latitude: cluster.coordinates.lat + latVariation,
            longitude: cluster.coordinates.lng + lngVariation,
            isActive: true,
          },
        },
      },
    });

    users.push(user);
  }

  return users;
}

interface SeededLibrary {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

async function createLibrariesForCluster(
  cluster: (typeof US_CLUSTERS)[0],
  users: SeededUser[],
  libraryCount: number
): Promise<SeededLibrary[]> {
  const libraries: SeededLibrary[] = [];

  for (let i = 0; i < libraryCount; i++) {
    const owner = randomChoice(users);
    const libraryName = `${cluster.city} ${randomChoice(LIBRARY_NAMES)}`;

    const library = await prisma.library.create({
      data: {
        name: libraryName,
        description: randomChoice(LIBRARY_DESCRIPTIONS),
        location: `${cluster.city}, ${cluster.state}`,
        isPublic: Math.random() > 0.3, // 70% public libraries
        ownerId: owner.id,
        createdAt: randomDateInRange(
          new Date('2023-02-01'),
          new Date('2024-06-01')
        ),
      },
    });

    // Add 3-8 members to each library
    const memberCount = Math.floor(Math.random() * 6) + 3;
    const libraryMembers = randomChoices(
      users.filter((u) => u.id !== owner.id),
      memberCount
    );

    for (const member of libraryMembers) {
      await prisma.libraryMember.create({
        data: {
          userId: member.id,
          libraryId: library.id,
          role: Math.random() > 0.9 ? 'admin' : 'member',
          joinedAt: randomDateInRange(library.createdAt, new Date()),
        },
      });
    }

    libraries.push(library);
  }

  return libraries;
}

async function createCrossClusterLibraries(
  allUsers: SeededUser[]
): Promise<SeededLibrary[]> {
  const crossLibraries: SeededLibrary[] = [];

  // Create 2 cross-cluster libraries
  const crossLibraryNames = ['National Tool Network', 'Coast-to-Coast Makers'];

  for (let i = 0; i < 2; i++) {
    // Pick users from different clusters
    const owner = randomChoice(allUsers);
    const library = await prisma.library.create({
      data: {
        name: crossLibraryNames[i],
        description:
          'A nationwide community of makers and sharers connecting across state lines.',
        location: 'Multi-State',
        isPublic: true,
        ownerId: owner.id,
        createdAt: randomDateInRange(
          new Date('2023-01-01'),
          new Date('2024-03-01')
        ),
      },
    });

    // Add members from multiple clusters (8-15 members)
    const memberCount = Math.floor(Math.random() * 8) + 8;
    const crossMembers = randomChoices(
      allUsers.filter((u) => u.id !== owner.id),
      memberCount
    );

    for (const member of crossMembers) {
      await prisma.libraryMember.create({
        data: {
          userId: member.id,
          libraryId: library.id,
          role: Math.random() > 0.85 ? 'admin' : 'member',
          joinedAt: randomDateInRange(library.createdAt, new Date()),
        },
      });
    }

    crossLibraries.push(library);
  }

  return crossLibraries;
}

interface SeededItem {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

async function createItemsForUsers(
  users: SeededUser[],
  libraries: SeededLibrary[]
): Promise<SeededItem[]> {
  const allItems: SeededItem[] = [];

  for (const user of users) {
    // Each user has 4-5 items
    const itemCount = Math.floor(Math.random() * 2) + 4; // 4-5 items

    for (let i = 0; i < itemCount; i++) {
      const stuffItem = randomChoice(STUFF_ITEMS);
      const condition = randomChoice(stuffItem.condition);

      const item = await prisma.item.create({
        data: {
          name: stuffItem.name,
          description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} condition ${stuffItem.name.toLowerCase()}. Well maintained and ready to share with neighbors.`,
          category: stuffItem.category,
          condition: condition,
          location: randomChoice([
            'garage',
            'basement',
            'shed',
            'closet',
            'storage room',
          ]),
          imageUrl: `/stuff icons/${stuffItem.icon}`,
          ownerId: user.id,
          createdAt: randomDateInRange(new Date('2023-03-01'), new Date()),
        },
      });

      // Add item to user's libraries (50% chance per library they're a member of)
      const userLibraries = libraries.filter(
        (lib) => lib.ownerId === user.id || Math.random() > 0.5 // Member of other libraries
      );

      for (const library of userLibraries.slice(0, 2)) {
        // Max 2 libraries per item
        await prisma.itemLibrary.create({
          data: {
            itemId: item.id,
            libraryId: library.id,
            addedAt: randomDateInRange(item.createdAt, new Date()),
          },
        });
      }

      allItems.push(item);
    }
  }

  return allItems;
}

async function createBorrowingActivity(
  users: SeededUser[],
  items: SeededItem[]
): Promise<void> {
  // Generate extensive borrowing history over the past 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const requestCount = Math.floor(items.length * 2.5); // ~2.5 requests per item on average

  for (let i = 0; i < requestCount; i++) {
    const item = randomChoice(items);
    const borrower = randomChoice(users.filter((u) => u.id !== item.ownerId));

    // Request date within last 6 months
    const requestDate = randomDateInRange(sixMonthsAgo, new Date());
    const requestedReturnDate = addDays(
      requestDate,
      Math.floor(Math.random() * 14) + 3
    ); // 3-16 days

    // Determine status based on time elapsed
    const daysSinceRequest = Math.floor(
      (new Date().getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status:
      | 'PENDING'
      | 'APPROVED'
      | 'DECLINED'
      | 'ACTIVE'
      | 'RETURNED'
      | 'CANCELLED';
    let approvedAt: Date | null = null;
    let returnedAt: Date | null = null;

    if (daysSinceRequest < 1) {
      status = 'PENDING';
    } else if (Math.random() < 0.05) {
      status = 'DECLINED';
    } else if (Math.random() < 0.03) {
      status = 'CANCELLED';
    } else {
      status = 'APPROVED';
      approvedAt = addDays(requestDate, Math.floor(Math.random() * 2)); // Approved within 2 days

      if (daysSinceRequest > 7) {
        if (Math.random() < 0.8) {
          status = 'RETURNED';
          const actualReturnDays = Math.floor(Math.random() * 10) + 3; // 3-12 days borrowed
          returnedAt = addDays(approvedAt, actualReturnDays);
        } else {
          status = 'ACTIVE'; // Still borrowed
        }
      } else {
        status = 'ACTIVE';
      }
    }

    await prisma.borrowRequest.create({
      data: {
        status: status,
        requestMessage:
          Math.random() > 0.3
            ? `Hi! Could I borrow your ${item.name}? I need it for a project.`
            : null,
        lenderMessage:
          status === 'APPROVED'
            ? 'Sure! Please take good care of it.'
            : status === 'DECLINED'
              ? 'Sorry, I need it myself this week.'
              : null,
        requestedReturnDate: requestedReturnDate,
        actualReturnDate: returnedAt,
        borrowerId: borrower.id,
        lenderId: item.ownerId,
        itemId: item.id,
        createdAt: requestDate,
        approvedAt: approvedAt,
        returnedAt: returnedAt,
      },
    });
  }
}

// Main seeding function
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (optional - be careful in production!)
    console.log('🗑️ Clearing existing data...');
    await prisma.borrowRequest.deleteMany();
    await prisma.itemLibrary.deleteMany();
    await prisma.item.deleteMany();
    await prisma.libraryMember.deleteMany();
    await prisma.library.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();

    console.log('👥 Creating users across US clusters...');
    const allUsers: SeededUser[] = [];

    // Create users for each cluster
    for (const cluster of US_CLUSTERS) {
      console.log(`Creating users for ${cluster.name}...`);
      const usersPerCluster = Math.floor(Math.random() * 20) + 25; // 25-44 users per cluster
      const clusterUsers = await createUsersForCluster(
        cluster,
        usersPerCluster
      );
      allUsers.push(...clusterUsers);
    }

    console.log(
      `✅ Created ${allUsers.length} users across ${US_CLUSTERS.length} clusters`
    );

    // Create libraries
    console.log('🏛️ Creating libraries...');
    const allLibraries: SeededLibrary[] = [];

    // 2-3 libraries per cluster
    for (let i = 0; i < US_CLUSTERS.length; i++) {
      const cluster = US_CLUSTERS[i];
      console.log(`Creating libraries for ${cluster.name}...`);
      // Get users for this cluster based on the order they were created
      const startIndex = i * Math.floor(allUsers.length / US_CLUSTERS.length);
      const endIndex =
        (i + 1) * Math.floor(allUsers.length / US_CLUSTERS.length);
      const clusterUsers = allUsers.slice(startIndex, endIndex);

      const librariesPerCluster = Math.floor(Math.random() * 2) + 2; // 2-3 libraries
      const clusterLibraries = await createLibrariesForCluster(
        cluster,
        clusterUsers,
        librariesPerCluster
      );
      allLibraries.push(...clusterLibraries);
    }

    // Create cross-cluster libraries
    console.log('🌐 Creating cross-cluster libraries...');
    const crossLibraries = await createCrossClusterLibraries(allUsers);
    allLibraries.push(...crossLibraries);

    console.log(
      `✅ Created ${allLibraries.length} libraries (${allLibraries.length - crossLibraries.length} local + ${crossLibraries.length} cross-cluster)`
    );

    // Create items
    console.log('📦 Creating items for users...');
    const allItems = await createItemsForUsers(allUsers, allLibraries);
    console.log(`✅ Created ${allItems.length} items`);

    // Create borrowing activity
    console.log('🔄 Creating borrowing history...');
    await createBorrowingActivity(allUsers, allItems);

    // Generate summary statistics
    const stats = {
      users: allUsers.length,
      libraries: allLibraries.length,
      items: allItems.length,
      borrowRequests: await prisma.borrowRequest.count(),
      clusters: US_CLUSTERS.length,
    };

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary Statistics:');
    console.log(`   • Users: ${stats.users}`);
    console.log(`   • Libraries: ${stats.libraries}`);
    console.log(`   • Items: ${stats.items}`);
    console.log(`   • Borrow Requests: ${stats.borrowRequests}`);
    console.log(`   • Geographic Clusters: ${stats.clusters}`);
    console.log(`   • Cross-cluster Libraries: ${crossLibraries.length}`);

    return stats;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then((stats) => {
      console.log('Seeding completed with stats:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
