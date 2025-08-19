import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { LibraryCard } from '@/components/LibraryCard';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Try different ways to get user ID
  const userId =
    (session.user as any).id ||
    (session as any).user?.id ||
    (session as any).userId;

  // Find user by ID or email
  let user;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        interests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  } else if (session.user?.email) {
    user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        interests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // If profile is not completed, redirect to profile creation
  if (!user.profileCompleted) {
    redirect('/profile/create');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard, {user.name}!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Your profile has been successfully created. This is your
                personal dashboard.
              </p>

              {/* Library Card */}
              <div className="bg-white shadow-lg rounded-xl p-6 max-w-2xl mx-auto mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                  Your Library Card
                </h2>
                <LibraryCard
                  user={{
                    ...user,
                    name: user.name || '',
                    email: user.email || '',
                    image: user.image ?? undefined,
                    createdAt: user.createdAt.toISOString(),
                  }}
                />
              </div>

              <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto">
                <div className="text-center">
                  {user.image && (
                    <div
                      className="h-24 w-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200"
                      style={{ maxWidth: '6rem', maxHeight: '6rem' }}
                    >
                      <img
                        src={user.image}
                        alt={user.name || 'Profile'}
                        className="h-full w-full object-cover"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.name}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">{user.email}</p>

                  {user.bio && <p className="text-gray-700 mb-4">{user.bio}</p>}

                  {user.interests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Interests
                      </h3>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {user.interests.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-gray-500">
                  More dashboard features coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
