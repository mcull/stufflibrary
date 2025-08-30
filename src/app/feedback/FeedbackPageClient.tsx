'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  labels: Array<{ name: string; color: string }>;
  reactions: {
    '+1': number;
  };
  html_url: string;
}

interface FeedbackFormData {
  type: 'bug' | 'feature' | 'polish';
  message: string;
}

export function FeedbackPageClient() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'feature',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [openIssues, setOpenIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  // Load open issues on component mount
  useEffect(() => {
    loadOpenIssues();
  }, []);

  const loadOpenIssues = async () => {
    try {
      const response = await fetch('/api/feedback/issues');
      if (response.ok) {
        const issues = await response.json();
        setOpenIssues(issues);
      }
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setFormData({ type: 'feature', message: '' });
        // Reload issues to show the new one
        loadOpenIssues();
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(
        'Sorry, there was an error submitting your feedback. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'bug':
        return {
          emoji: '🐛',
          label: 'Bug Report',
          description: "Something isn't working as expected",
          placeholder:
            'Describe what went wrong, what you expected to happen, and any steps to reproduce the issue...',
        };
      case 'feature':
        return {
          emoji: '💡',
          label: 'Feature Request',
          description: 'A new idea or enhancement',
          placeholder:
            'Describe your idea, why it would be useful, and how you envision it working...',
        };
      case 'polish':
        return {
          emoji: '✨',
          label: 'Polish & UX',
          description: 'Make something better or more delightful',
          placeholder:
            'Describe what could be improved, smoother, or more intuitive...',
        };
      default:
        return {
          emoji: '💭',
          label: 'Feedback',
          description: '',
          placeholder: '',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentTypeInfo = getTypeInfo(formData.type);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💬 Share Your Thoughts
          </h1>
          <p className="text-lg text-gray-600">
            Help us make StuffLibrary better! Report bugs, request features, or
            suggest improvements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What&apos;s on your mind?
            </h2>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎉</span>
                  <div>
                    <h3 className="text-green-800 font-medium">
                      Thanks for your feedback!
                    </h3>
                    <p className="text-green-700 text-sm">
                      We&apos;ve created a GitHub issue and you&apos;ll get an
                      email when it&apos;s addressed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of feedback is this?
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {(['bug', 'feature', 'polish'] as const).map((type) => {
                    const typeInfo = getTypeInfo(type);
                    return (
                      <label
                        key={type}
                        className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                          formData.type === type
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              type: e.target.value as any,
                            })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {typeInfo.label}
                            </div>
                            <div className="text-sm text-gray-600">
                              {typeInfo.description}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentTypeInfo.emoji} Tell us more
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={currentTypeInfo.placeholder}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.message.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  `${currentTypeInfo.emoji} Submit ${currentTypeInfo.label}`
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Submitted as {session?.user?.email}
            </div>
          </div>

          {/* Open Issues */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Community Feedback
            </h2>

            {loadingIssues ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : openIssues.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-6xl">🎉</span>
                <p className="text-gray-600 mt-2">
                  No open issues! Everything is perfect... for now 😉
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {issue.title}
                      </h3>
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        {issue.reactions['+1'] > 0 && (
                          <span className="text-xs text-gray-500 flex items-center">
                            👍 {issue.reactions['+1']}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                      <span>#{issue.number}</span>
                      <span>•</span>
                      <span>{formatDate(issue.created_at)}</span>
                      {issue.labels.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex space-x-1">
                            {issue.labels.slice(0, 2).map((label) => (
                              <span
                                key={label.name}
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: `#${label.color}20`,
                                  color: `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {issue.body?.substring(0, 100)}...
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        View on GitHub →
                      </a>

                      <button
                        onClick={() => {
                          // TODO: Implement upvoting
                          console.log('Upvote issue', issue.number);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1 transition-colors"
                      >
                        <span>👍</span>
                        <span>{issue.reactions['+1'] || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <a
                href="https://github.com/mcull/stufflibrary/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                View all issues on GitHub →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
