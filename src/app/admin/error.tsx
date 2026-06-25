'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full bg-white shadow rounded-lg p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          The admin dashboard hit an error
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          This has been reported. You can retry, or head back to the dashboard
          home.
        </p>
        {/* Surface the message so admins can self-diagnose in production. */}
        <pre className="text-left text-xs bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 overflow-auto">
          {error.message || 'Unknown error'}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-700"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Admin home
          </a>
        </div>
      </div>
    </div>
  );
}
