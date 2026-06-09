import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimePlaybackControls } from './TimePlaybackControls';
import type { UsePlaybackResult } from '../../hooks/usePlayback';

jest.mock('@grafana/ui', () => ({
  useStyles2: () => ({
    container: 'container',
    sliderWrap: 'sliderWrap',
    timeLabel: 'timeLabel',
  }),
  IconButton: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      play-pause
    </button>
  ),
  Slider: ({
    onChange,
    onAfterChange,
  }: {
    onChange?: (value: number) => void;
    onAfterChange?: (value?: number) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange?.(0.25)}>
        slider-change
      </button>
      <button type="button" onClick={() => onAfterChange?.(0.25)}>
        slider-after-change
      </button>
    </div>
  ),
  Combobox: () => <div>speed</div>,
}));

function createPlayback(overrides: Partial<UsePlaybackResult> = {}): UsePlaybackResult {
  return {
    cursorTimeMs: 1500,
    cursorTimeMsRef: { current: 1500 },
    getCursorTimeMs: jest.fn(() => 1500),
    playing: false,
    scrubbing: false,
    followLive: false,
    playbackSpeed: 1,
    speeds: [1],
    setCursorState: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    scrubTo: jest.fn(),
    seekTo: jest.fn(),
    setSpeed: jest.fn(),
    ...overrides,
  };
}

describe('TimePlaybackControls', () => {
  it('starts scrubbing on slider change and ends scrubbing on after change', () => {
    const playback = createPlayback();
    render(<TimePlaybackControls width={600} fromTimeMs={1000} toTimeMs={2000} playback={playback} />);

    fireEvent.click(screen.getByRole('button', { name: 'slider-change' }));
    expect(playback.scrubTo).toHaveBeenCalledWith(1250);

    fireEvent.click(screen.getByRole('button', { name: 'slider-after-change' }));
    expect(playback.seekTo).toHaveBeenCalledWith(1250);
  });
});
