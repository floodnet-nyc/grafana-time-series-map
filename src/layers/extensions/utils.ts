export function numericOption(options: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(options[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export function getFeatureProperties(datum: any) {
  return datum?.feature?.properties ?? datum?.properties ?? {};
}
