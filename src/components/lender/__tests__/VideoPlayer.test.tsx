import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { VideoPlayer } from '../VideoPlayer';

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
  writable: true,
  value: false,
});

Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
  writable: true,
  value: 1,
});

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  writable: true,
  value: 0,
});

Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  writable: true,
  value: 100,
});

// Mock requestFullscreen and exitFullscreen
Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
});

describe('VideoPlayer', () => {
  const mockVideoUrl = 'https://example.com/video.mp4';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders video player with controls', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);

    const video = screen.getByRole('application') || document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockVideoUrl);
    expect(video).toHaveAttribute('muted');
  });

  it('starts with auto-muted enabled by default', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('muted');
  });

  it('allows disabling auto-muted', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} autoMuted={false} />);
    
    const video = document.querySelector('video');
    expect(video).not.toHaveAttribute('muted');
  });

  it('toggles play/pause when video is clicked', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    const video = document.querySelector('video');
    const playMock = vi.fn().mockImplementation(() => Promise.resolve());
    const pauseMock = vi.fn();
    
    if (video) {
      video.play = playMock;
      video.pause = pauseMock;

      // Click to play
      fireEvent.click(video);
      expect(playMock).toHaveBeenCalledTimes(1);
    }
  });

  it('shows loading spinner initially', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when video fails to load', () => {
    render(<VideoPlayer videoUrl="invalid-url" />);
    
    const video = document.querySelector('video');
    if (video) {
      // Simulate error event
      fireEvent.error(video);
      expect(screen.getByText('Failed to load video')).toBeInTheDocument();
    }
  });

  it('formats time correctly', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    const video = document.querySelector('video');
    if (video) {
      // Simulate loaded metadata
      Object.defineProperty(video, 'duration', { value: 125 });
      Object.defineProperty(video, 'currentTime', { value: 65 });
      
      fireEvent.loadedMetadata(video);
      fireEvent.timeUpdate(video);

      // Should format as MM:SS
      expect(screen.getByText(/1:05/)).toBeInTheDocument();
      expect(screen.getByText(/2:05/)).toBeInTheDocument();
    }
  });

  it('handles fullscreen toggle', async () => {
    const mockRequestFullscreen = vi.fn().mockImplementation(() => Promise.resolve());
    const mockExitFullscreen = vi.fn().mockImplementation(() => Promise.resolve());

    // Mock the container element's requestFullscreen
    HTMLElement.prototype.requestFullscreen = mockRequestFullscreen;
    document.exitFullscreen = mockExitFullscreen;

    render(<VideoPlayer videoUrl={mockVideoUrl} />);

    // Wait for the component to load
    const video = document.querySelector('video');
    if (video) {
      fireEvent.loadedMetadata(video);
    }

    // Find fullscreen button (may need to adjust selector based on actual implementation)
    const fullscreenButton = document.querySelector('[data-testid="fullscreen-button"]') || 
                             screen.getByRole('button', { name: /fullscreen/i });
    
    if (fullscreenButton) {
      fireEvent.click(fullscreenButton);
      expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);
    }
  });
});