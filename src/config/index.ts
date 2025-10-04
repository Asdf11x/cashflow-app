import deCosts from './investments/deRealEstateCosts.json';
import type { RealEstateCostsConfig } from './costs';

export function getDefaultCostsConfig(): RealEstateCostsConfig {
  return deCosts as RealEstateCostsConfig;
}

// Optionally also provide a fetcher for /public
export async function fetchCostsConfig(url: string): Promise<RealEstateCostsConfig> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load costs config: ${res.status}`);
  return (await res.json()) as RealEstateCostsConfig;
}
