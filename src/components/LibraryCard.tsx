'use client';

import QRCode from 'qrcode';
import React, { useState, useRef } from 'react';

interface LibraryCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    profileCompleted: boolean;
  };
  showActions?: boolean;
}

export function LibraryCard({ user, showActions = true }: LibraryCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const cardRef = useRef<SVGSVGElement>(null);

  // Generate QR code for profile sharing
  const generateQRCode = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/${user.id}`;
      const qrUrl = await QRCode.toDataURL(profileUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#2C3E50',
          light: '#F8F9FA',
        },
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('QR Code generation failed:', error);
    }
  };

  // Generate member ID from user ID (last 8 characters)
  const memberId = user.id.slice(-8).toUpperCase();

  // Format join date
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  // Download card as image
  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      const svgData = new XMLSerializer().serializeToString(cardRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 600;
      canvas.height = 380;

      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `${user.name}-library-card.png`;
        link.href = canvas.toDataURL();
        link.click();
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
      console.error('Card download failed:', error);
    }
  };

  // Generate QR code on mount
  React.useEffect(() => {
    generateQRCode();
  }, [user.id, generateQRCode]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg
          ref={cardRef}
          width="600"
          height="380"
          viewBox="0 0 600 380"
          className="max-w-full h-auto shadow-2xl rounded-lg"
          style={{ backgroundColor: '#F8F9FA' }}
        >
          {/* Card Background */}
          <defs>
            <linearGradient
              id="cardGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#2C3E50" />
              <stop offset="100%" stopColor="#34495E" />
            </linearGradient>
            <pattern
              id="cardTexture"
              x="0"
              y="0"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="100" height="100" fill="#2C3E50" opacity="0.05" />
              <circle cx="20" cy="20" r="1" fill="#34495E" opacity="0.1" />
              <circle cx="80" cy="60" r="1" fill="#34495E" opacity="0.1" />
              <circle cx="40" cy="80" r="1" fill="#34495E" opacity="0.1" />
            </pattern>
          </defs>

          {/* Main Card */}
          <rect
            width="600"
            height="380"
            rx="15"
            fill="url(#cardGradient)"
            stroke="#BDC3C7"
            strokeWidth="2"
          />

          {/* Texture Overlay */}
          <rect width="600" height="380" rx="15" fill="url(#cardTexture)" />

          {/* Header */}
          <text
            x="30"
            y="45"
            fill="#ECF0F1"
            fontSize="24"
            fontWeight="bold"
            fontFamily="serif"
          >
            STUFF LIBRARY
          </text>

          <text x="30" y="70" fill="#BDC3C7" fontSize="14" fontFamily="serif">
            Community Sharing Network
          </text>

          {/* Decorative Line */}
          <line
            x1="30"
            y1="85"
            x2="570"
            y2="85"
            stroke="#BDC3C7"
            strokeWidth="1"
          />

          {/* Profile Section */}
          <g>
            {/* Profile Picture Placeholder */}
            <circle
              cx="80"
              cy="180"
              r="40"
              fill="#ECF0F1"
              stroke="#BDC3C7"
              strokeWidth="2"
            />

            {user.image && (
              <image
                x="40"
                y="140"
                width="80"
                height="80"
                href={user.image}
                clipPath="circle(40px at 40px 40px)"
              />
            )}

            {!user.image && (
              <text
                x="80"
                y="190"
                fill="#7F8C8D"
                fontSize="36"
                textAnchor="middle"
                fontFamily="serif"
              >
                {user.name.charAt(0)}
              </text>
            )}
          </g>

          {/* User Info */}
          <g>
            <text
              x="160"
              y="140"
              fill="#ECF0F1"
              fontSize="20"
              fontWeight="bold"
              fontFamily="serif"
            >
              {user.name}
            </text>

            <text
              x="160"
              y="165"
              fill="#BDC3C7"
              fontSize="14"
              fontFamily="monospace"
            >
              ID: {memberId}
            </text>

            <text
              x="160"
              y="185"
              fill="#BDC3C7"
              fontSize="12"
              fontFamily="sans-serif"
            >
              Member since {joinDate}
            </text>

            <text
              x="160"
              y="205"
              fill={user.profileCompleted ? '#27AE60' : '#E67E22'}
              fontSize="12"
              fontWeight="bold"
            >
              {user.profileCompleted ? '✓ VERIFIED' : '⚠ PENDING'}
            </text>
          </g>

          {/* QR Code */}
          {qrCodeUrl && (
            <g>
              <rect
                x="460"
                y="120"
                width="100"
                height="100"
                fill="#ECF0F1"
                rx="8"
              />
              <image x="470" y="130" width="80" height="80" href={qrCodeUrl} />
              <text
                x="510"
                y="240"
                fill="#BDC3C7"
                fontSize="10"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                SCAN TO CONNECT
              </text>
            </g>
          )}

          {/* Footer */}
          <g>
            <line
              x1="30"
              y1="280"
              x2="570"
              y2="280"
              stroke="#BDC3C7"
              strokeWidth="1"
            />

            <text
              x="30"
              y="305"
              fill="#BDC3C7"
              fontSize="11"
              fontFamily="serif"
            >
              &quot;Sharing builds stronger communities&quot;
            </text>

            <text
              x="570"
              y="305"
              fill="#BDC3C7"
              fontSize="10"
              textAnchor="end"
              fontFamily="sans-serif"
            >
              stufflibrary.org
            </text>

            <text
              x="30"
              y="325"
              fill="#7F8C8D"
              fontSize="9"
              fontFamily="sans-serif"
            >
              This card grants access to community sharing resources
            </text>
          </g>

          {/* Decorative Elements */}
          <g opacity="0.3">
            <circle
              cx="520"
              cy="50"
              r="20"
              fill="none"
              stroke="#BDC3C7"
              strokeWidth="1"
            />
            <circle
              cx="520"
              cy="50"
              r="15"
              fill="none"
              stroke="#BDC3C7"
              strokeWidth="0.5"
            />
            <circle
              cx="520"
              cy="50"
              r="10"
              fill="none"
              stroke="#BDC3C7"
              strokeWidth="0.5"
            />
          </g>
        </svg>
      </div>

      {showActions && (
        <div className="flex gap-4">
          <button
            onClick={downloadCard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Download Card
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${user.name}'s Library Card`,
                  text: 'Check out my StuffLibrary card!',
                  url: `${window.location.origin}/profile/${user.id}`,
                });
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(
                  `${window.location.origin}/profile/${user.id}`
                );
                alert('Profile link copied to clipboard!');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Share Card
          </button>
        </div>
      )}
    </div>
  );
}
