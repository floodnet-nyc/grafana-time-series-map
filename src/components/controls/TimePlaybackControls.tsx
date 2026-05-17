import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, IconButton, Slider, Combobox } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { UsePlaybackResult } from '../../hooks/usePlayback';
import { formatSpeedLabel } from 'utils/playback/playbackModel';


function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  width: number;
  fromTimeMs: number;
  toTimeMs: number;
  playback: UsePlaybackResult;
}

export function TimePlaybackControls({ width, fromTimeMs, toTimeMs, playback }: Props) {
  const styles = useStyles2(getStyles);
  const { cursorTimeMs, playing, playbackSpeed, speeds, play, pause, scrubTo, setSpeed } = playback;
  const speedOptions = useMemo(() => speeds.map((value) => ({ label: formatSpeedLabel(value), value })), [speeds]);
  console.log('rendering playback controls', { cursorTimeMs, playing, playbackSpeed });

  const handleSliderChange = useCallback(
    (value: number) => scrubTo(fromTimeMs + value * (toTimeMs - fromTimeMs)),
    [fromTimeMs, toTimeMs, scrubTo],
  );

  const progress = toTimeMs > fromTimeMs ? (cursorTimeMs - fromTimeMs) / (toTimeMs - fromTimeMs) : 0;

  return (
    <div className={styles.container} style={{ width }}>
      <IconButton
        name={playing ? 'pause' : 'play'}
        tooltip={playing ? 'Pause' : 'Play'}
        size="lg"
        onClick={playing ? pause : play}
      />
      <div className={styles.sliderWrap}>
        <Slider
          inputId="time-playback-slider"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleSliderChange}
          showInput={false}
        />
        <span className={styles.timeLabel}>{formatTime(cursorTimeMs)}</span>
      </div>
      <Combobox
        width={14}
        options={speedOptions}
        value={playbackSpeed}
        onChange={(v) => setSpeed(v.value)}
      />
    </div>
  );
}

// width: 1696px;
// position: absolute;
// bottom: 60px;
// background: rgba(39, 18, 214, 0.36);
// border-radius: 30px;
// backdrop-filter: blur(10px);
// max-width: 400px;
// left: 50%;
// transform: translateX(-50%);
// padding: 1em 2em;
// /* color: black; */

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
      background: theme.colors.background.primary,
      borderTop: `1px solid ${theme.colors.border.weak}`,
      height: 48,
      overflow: 'hidden',
    }),
    sliderWrap: css({
      flex: 1,
      minWidth: 0,
      position: 'relative',
    }),
    timeLabel: css({
      position: 'absolute',
      top: 'calc(100% - 2px)',
      left: '0',
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
      minWidth: 120,
      textAlign: 'right',
    }),
  };
}
