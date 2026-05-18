
/* ------------------------------ Speed Options ----------------------------- */
const second = 1000;
const minute = second * 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
const SPEED_CANDIDATES_MS = [
  second,
  second * 5,
  second * 15,
  second * 30,
  minute,
  minute * 5,
  minute * 15,
  minute * 30,
  hour,
  hour * 3,
  hour * 6,
  hour * 12,
  day,
  day * 3,
  week,
  week * 2,
  month,
  month * 3,
  month * 6,
  year,
] as const;
const TIME_LABELS = ['yr', 'mo', 'wk', 'day', 'hr', 'min', 'sec', 'ms'] as const;
const TIME_VALUES = [year, month, week, day, hour, minute, second, 1] as const;
// const TARGET_SWEEP_SECONDS = [20, 45, 90, 180, 300, 600] as const;
export function formatSpeedLabel(speedMs: number): string {
  for (let i = 0; i < TIME_VALUES.length; i++) {
    const value = TIME_VALUES[i];
    if (speedMs >= value) {
      return `${speedMs / value} ${TIME_LABELS[i]}/s`;
    }
  }
  return `${speedMs} ms/s`;
}

export function selectSpeedOptions({
  rangeMs, defaultSpeed, minSteps = 4, targetSteps = 50, maxSteps = 10000, minSpeed = SPEED_CANDIDATES_MS[0], maxSpeed = SPEED_CANDIDATES_MS[SPEED_CANDIDATES_MS.length - 1],
}: {
  rangeMs: number;
  defaultSpeed?: number;
  minSteps?: number;
  targetSteps?: number;
  maxSteps?: number;
  minSpeed?: number;
  maxSpeed?: number;
}): [number, number[]] {
  defaultSpeed = defaultSpeed ?? selectBestSpeedOption(rangeMs, targetSteps);
  minSpeed = Math.min(minSpeed, rangeMs / maxSteps, defaultSpeed / 2);
  maxSpeed = Math.max(maxSpeed, rangeMs / minSteps, defaultSpeed * 2);
  // console.log(formatSpeedLabel(maxSpeed), formatSpeedLabel(rangeMs / 1000), formatSpeedLabel(defaultSpeed), formatSpeedLabel(rangeMs / minSteps), formatSpeedLabel(rangeMs / maxSteps));
  const options = SPEED_CANDIDATES_MS.filter((s) => s >= minSpeed && s <= maxSpeed);
  return [defaultSpeed, options];
}

export function selectBestSpeedOption(rangeMs: number, targetDivisions: number): number {
  const targetSpeed = rangeMs / targetDivisions;
  return SPEED_CANDIDATES_MS.reduce((best, candidate) => Math.abs(candidate - targetSpeed) < Math.abs(best - targetSpeed) ? candidate : best,
    SPEED_CANDIDATES_MS[0]);
}
