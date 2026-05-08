import type { Address } from 'viem';

/**
 * Summary of a previous scan result, used as historical context
 * for new analyses. The SDK doesn't care where this comes from —
 * the consumer (dApp) provides the implementation.
 */
export interface ScanSummary {
  /** Address that was scanned */
  address: Address;
  /** Risk score 0-100 */
  riskScore: number;
  /** Risk level label */
  riskLevel: string;
  /** AI recommendation */
  recommendation: string;
  /** Key threats identified */
  threats: string[];
  /** When the scan happened */
  timestamp: string;
  /** 0G Storage root hash (if stored) */
  rootHash?: string;
}

/**
 * Aggregated threat intelligence for an address,
 * computed from scan history by the provider.
 */
export interface AddressThreatIntel {
  /** The address this intel is about */
  address: Address;
  /** Total number of scans involving this address */
  totalScans: number;
  /** Average risk score across all scans */
  avgRiskScore: number;
  /** Highest risk score ever recorded */
  maxRiskScore: number;
  /** All unique threats seen across scans */
  knownThreats: string[];
  /** Last recommendation given */
  lastRecommendation: string | null;
  /** Risk level distribution */
  riskDistribution: {
    safe: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** Recent scan summaries (last 10) */
  recentScans: ScanSummary[];
  /** First seen timestamp */
  firstSeen: string | null;
  /** Last seen timestamp */
  lastSeen: string | null;
}

/**
 * Interface that the consumer (dApp) must implement to provide
 * historical scan data to the agent. This keeps the SDK database-agnostic.
 *
 * Usage:
 * ```ts
 * class PrismaThreatIntel implements ThreatIntelProvider {
 *   async getAddressIntel(address) { ... }
 *   async saveScanResult(result) { ... }
 * }
 *
 * const agent = new SecurityAgent({
 *   ...config,
 *   threatIntel: new PrismaThreatIntel(),
 * });
 * ```
 */
export interface ThreatIntelProvider {
  /**
   * Get aggregated threat intelligence for an address.
   * Called before each analysis to provide historical context.
   */
  getAddressIntel(address: Address): Promise<AddressThreatIntel | null>;

  /**
   * Save a scan result for future lookups.
   * Called after each analysis completes.
   */
  saveScanResult(result: {
    from: Address;
    to: Address;
    riskScore: number;
    riskLevel: string;
    recommendation: string;
    reasoning: string;
    threats: string[];
    confidence: number;
    timestamp: string;
    rootHash?: string;
    storageExplorer?: string;
  }): Promise<void>;
}
