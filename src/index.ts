import { TransactionSimulator } from './core/simulator.js';
import { AIAnalyzer } from './ai/analyzer.js';
import type { MessageContext, RiskAnalysis } from './ai/analyzer.js';
import { StorageClient } from './storage/client.js';
import { ComputeClient } from './compute/client.js';
import type { ThreatIntelProvider } from './threat-intel/provider.js';
import type { Address, Hash } from 'viem';

export interface AgentConfig {
  rpcUrl: string;
  aiProvider?: {
    apiKey: string;
    baseURL?: string;
    model?: string;
  };
  compute?: {
    privateKey: string;
    providerAddress: string;
    ledgerCa?: string;
    inferenceCa?: string;
  };
  storage?: {
    indexerUrl: string;
    privateKey?: string;
    mockMode?: boolean;
  };
  /**
   * Threat intelligence provider — inject your own implementation
   * (e.g. PrismaThreatIntel in dApp) to enable learning from past scans.
   * Without this, each scan is analyzed in isolation (no history).
   */
  threatIntel?: ThreatIntelProvider;
  /**
   * Optional on-chain agent identity metadata (Agentic ID / ERC-7857)
   * embedded into stored scan evidence for provenance.
   */
  agentIdentity?: {
    tokenId?: string;
    contractAddress?: string;
    network?: string;
    model?: string;
  };
  // Legacy support (deprecated)
  openaiApiKey?: string;
  zeroGStorageUrl?: string;
}

export interface AnalysisResult {
  simulation: any;
  threatIntel: any;
  analysis: any;
  timestamp: string;
  storageRootHash?: string;
  storageExplorer?: string;
  computeProvider?: 'openai' | '0g-compute';
}

export class SecurityAgent {
  private simulator: TransactionSimulator;
  private analyzer: AIAnalyzer;
  private storage?: StorageClient;
  private computeClient?: ComputeClient;
  private threatIntelProvider?: ThreatIntelProvider;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.threatIntelProvider = config.threatIntel;
    this.simulator = new TransactionSimulator(config.rpcUrl);
    
    // Initialize 0G Compute client if configured
    if (config.compute) {
      this.computeClient = new ComputeClient({
        rpcUrl: config.rpcUrl,
        privateKey: config.compute.privateKey,
        providerAddress: config.compute.providerAddress,
        ledgerCa: config.compute.ledgerCa,
        inferenceCa: config.compute.inferenceCa,
      });
    }

    // Initialize AI analyzer
    // Priority: 0G Compute > aiProvider > legacy openaiApiKey
    if (this.computeClient) {
      // Use 0G Compute for AI inference
      this.analyzer = new AIAnalyzer(
        { apiKey: '', baseURL: undefined, model: '0g-compute' },
        this.computeClient
      );
    } else {
      const aiConfig = config.aiProvider || {
        apiKey: config.openaiApiKey || '',
        baseURL: undefined,
        model: 'gpt-4-turbo-preview'
      };
      this.analyzer = new AIAnalyzer(aiConfig);
    }
    
    // Initialize storage client if configured
    if (config.storage) {
      this.storage = new StorageClient({
        rpcUrl: config.rpcUrl,
        indexerUrl: config.storage.indexerUrl,
        privateKey: config.storage.privateKey,
        mockMode: config.storage.mockMode
      });
    }
  }

  /**
   * Initialize 0G Compute broker (call before first analysis if using compute)
   * This sets up the broker, acknowledges provider, and fetches service metadata
   */
  async init(): Promise<void> {
    if (this.computeClient && !this.computeClient.isInitialized()) {
      console.log('[Agent] Initializing 0G Compute broker...');
      await this.computeClient.init();
      console.log(`[Agent] 0G Compute ready — model: ${this.computeClient.getModel()}`);
    }
  }

  /**
   * Main entry point: analyze transaction before signing
   */
  async analyzeTransaction(params: {
    from: Address;
    to: Address;
    data?: Hash;
    value?: bigint;
  }) {
    console.log(`[Agent] Analyzing transaction: ${params.from} → ${params.to}`);

    // Ensure compute is initialized
    await this.init();

    // Step 1: Simulate transaction
    const simulation = await this.simulator.simulate(params);
    console.log(`[Agent] Simulation complete: ${simulation.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 2: Fetch threat intelligence (from provider or 0G Storage)
    const threatIntel = await this.fetchThreatIntel(params.to);
    if (threatIntel) {
      console.log(`[Agent] Threat intel: ${threatIntel.totalScans} past scans, avg risk ${threatIntel.avgRiskScore}/100`);
    } else {
      console.log(`[Agent] Threat intel: none (new address)`);
    }

    // Step 3: AI analysis (via 0G Compute or OpenAI-compatible provider)
    const analysis = await this.analyzer.analyze({
      from: params.from,
      to: params.to,
      simulation,
      threatIntel,
    });
    console.log(`[Agent] Risk score: ${analysis.riskScore}/100 (${analysis.recommendation}) via ${analysis.provider}`);

    const result: AnalysisResult = {
      simulation,
      threatIntel,
      analysis,
      timestamp: new Date().toISOString(),
      storageRootHash: undefined,
      computeProvider: analysis.provider,
    };

    // Step 4: Store analysis on 0G Storage (if configured)
    if (this.storage) {
      try {
        const storageResult = await this.storage.storeAnalysis({
          from: params.from,
          to: params.to,
          value: params.value?.toString(),
          data: params.data,
          riskScore: analysis.riskScore,
          riskLevel: this.getRiskLevel(analysis.riskScore),
          recommendation: analysis.recommendation,
          reasoning: analysis.reasoning,
          threats: analysis.threats,
          confidence: analysis.confidence,
          timestamp: result.timestamp,
          simulationSuccess: simulation.success,
          gasUsed: simulation.gasUsed.toString(),
        });
        console.log(`[Agent] Analysis stored on 0G Storage: ${storageResult.rootHash}`);
        result.storageRootHash = storageResult.rootHash;
        result.storageExplorer = storageResult.explorerUrl;
      } catch (error) {
        console.error(`[Agent] Failed to store analysis:`, error);
      }
    }

    // Step 5: Save scan result to threat intel provider (DB index)
    await this.saveScanHistory(result, params.from, params.to);

    return result;
  }

  /**
   * Analyze message signature request (personalSign / eth_signTypedData)
   * 
   * Usage:
   * ```ts
   * const result = await agent.analyzeMessageSignature({
   *   from: '0x...',
   *   method: 'eth_signTypedData',
   *   message: '...',
   *   typedData: { ... }
   * });
   * 
   * console.log(`Risk: ${result.analysis.riskScore}/100`);
   * console.log(`Recommendation: ${result.analysis.recommendation}`);
   * console.log(`Threats: ${result.analysis.threats.join(', ')}`);
   * ```
   */
  async analyzeMessageSignature(params: {
    from: Address;
    method: 'personalSign' | 'eth_signTypedData';
    message: string;
    typedData?: MessageContext['typedData'];
  }): Promise<RiskAnalysis> {
    console.log(`[Agent] Analyzing message signature: ${params.method} from ${params.from}`);

    // Ensure compute is initialized
    await this.init();

    // Fetch threat intelligence for the signer
    const threatIntel = await this.fetchThreatIntel(params.from);
    if (threatIntel) {
      console.log(`[Agent] Threat intel: ${threatIntel.totalScans} past scans, avg risk ${threatIntel.avgRiskScore}/100`);
    } else {
      console.log(`[Agent] Threat intel: none (new signer)`);
    }

    // AI analysis via messageContext
    const analysis = await this.analyzer.analyze({
      from: params.from,
      to: params.from, // For messages, 'to' is same as 'from'
      simulation: {
        success: true,
        gasUsed: BigInt(0),
        balanceChanges: [],
        events: [],
      },
      threatIntel,
      messageContext: {
        method: params.method,
        message: params.message,
        typedData: params.typedData,
      },
    });
    console.log(`[Agent] Risk score: ${analysis.riskScore}/100 (${analysis.recommendation}) via ${analysis.provider}`);

    // Save scan result to threat intel provider (DB index)
    if (this.threatIntelProvider) {
      try {
        await this.threatIntelProvider.saveScanResult({
          from: params.from,
          to: params.from,
          riskScore: analysis.riskScore,
          riskLevel: this.getRiskLevel(analysis.riskScore),
          recommendation: analysis.recommendation,
          reasoning: analysis.reasoning,
          threats: analysis.threats,
          confidence: analysis.confidence,
          timestamp: new Date().toISOString(),
        });
        console.log(`[Agent] Message signature scan result saved to threat intel provider`);
      } catch (error) {
        console.warn(`[Agent] Failed to save scan result:`, error);
      }
    }

    return analysis;
  }

  /**
   * Get risk level from risk score
   */
  private getRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    if (riskScore >= 20) return 'LOW';
    return 'SAFE';
  }

  /**
   * Fetch threat intelligence from ThreatIntelProvider + 0G Storage
   */
  private async fetchThreatIntel(address: Address) {
    if (!this.threatIntelProvider) {
      return null;
    }

    try {
      const intel = await this.threatIntelProvider.getAddressIntel(address);
      if (intel) {
        console.log(`[Agent] Threat intel found: ${intel.totalScans} past scans, avg risk ${intel.avgRiskScore}/100`);
      }
      return intel;
    } catch (error) {
      console.warn(`[Agent] Failed to fetch threat intel for ${address}:`, error);
      return null;
    }
  }

  /**
   * Save scan result to ThreatIntelProvider for future lookups
   */
  private async saveScanHistory(result: AnalysisResult, from: Address, to: Address) {
    if (!this.threatIntelProvider) return;

    try {
      await this.threatIntelProvider.saveScanResult({
        from,
        to,
        riskScore: result.analysis.riskScore,
        riskLevel: this.getRiskLevel(result.analysis.riskScore),
        recommendation: result.analysis.recommendation,
        reasoning: result.analysis.reasoning,
        threats: result.analysis.threats,
        confidence: result.analysis.confidence,
        timestamp: result.timestamp,
        rootHash: result.storageRootHash,
        storageExplorer: result.storageExplorer,
      });
      console.log(`[Agent] Scan result saved to threat intel provider`);
    } catch (error) {
      console.warn(`[Agent] Failed to save scan result:`, error);
    }
  }
}

export type { AIConfig, MessageContext, RiskAnalysis } from './ai/analyzer';
export { StorageClient } from './storage/client.js';
export type { StorageConfig, TransactionAnalysisData } from './storage/client.js';
export { ComputeClient } from './compute/client.js';
export type { ComputeConfig, ChatCompletionResponse } from './compute/client.js';
export type { ThreatIntelProvider, AddressThreatIntel, ScanSummary } from './threat-intel/provider.js';
