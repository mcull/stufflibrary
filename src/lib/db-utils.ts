import { db } from './db';

export async function testConnection() {
  try {
    // Simple test query to verify connection
    await db.$queryRaw`SELECT 1 as test`;
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function getUserCount() {
  try {
    const count = await db.user.count();
    return count;
  } catch (error) {
    console.error('Error getting user count:', error);
    throw error;
  }
}

export async function getBranchCount() {
  try {
    const count = await db.branch.count();
    return count;
  } catch (error) {
    console.error('Error getting branch count:', error);
    throw error;
  }
}
