'use client';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  shareInterests: string[];
  borrowInterests: string[];
  profileCompleted: boolean;
  onboardingStep: string | null;
  currentAddressId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileViewProps {
  user: User;
}

export function ProfileView({ user }: ProfileViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          {user.image && (
            <img
              src={user.image}
              alt={user.name || 'Profile'}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {user.name || 'No name set'}
            </h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        {user.bio && (
          <div className="mb-4">
            <h3 className="font-medium mb-2">Bio</h3>
            <p className="text-gray-700">{user.bio}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Things I can share</h3>
            <ul className="text-sm text-gray-600">
              {user.shareInterests.length > 0 ? (
                user.shareInterests.map((interest, index) => (
                  <li key={index} className="mb-1">
                    {interest}
                  </li>
                ))
              ) : (
                <li>None specified</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Things I might borrow</h3>
            <ul className="text-sm text-gray-600">
              {user.borrowInterests.length > 0 ? (
                user.borrowInterests.map((interest, index) => (
                  <li key={index} className="mb-1">
                    {interest}
                  </li>
                ))
              ) : (
                <li>None specified</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
