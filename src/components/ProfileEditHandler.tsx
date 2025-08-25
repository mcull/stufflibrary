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
  createdAt: Date;
}

interface ProfileEditHandlerProps {
  user: User;
}

export function ProfileEditHandler({ user }: ProfileEditHandlerProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          Profile editing functionality will be implemented in a future update.
        </p>
        <div className="mb-4">
          <h3 className="font-medium mb-2">Current Profile</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <span className="font-medium">Name:</span>{' '}
              {user.name || 'Not set'}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p>
              <span className="font-medium">Bio:</span> {user.bio || 'Not set'}
            </p>
            <p>
              <span className="font-medium">Share Interests:</span>{' '}
              {user.shareInterests.join(', ') || 'None'}
            </p>
            <p>
              <span className="font-medium">Borrow Interests:</span>{' '}
              {user.borrowInterests.join(', ') || 'None'}
            </p>
          </div>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
}
