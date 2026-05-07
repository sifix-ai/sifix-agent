import { TransactionSimulator } from './core/simulator';
import { AIAnalyzer } from './ai/analyzer';
import type { Address, Hash } from 'viem';

export interface AgentConfig {
  rpcUrl: string;
  aiProvider?: {
    apiKey: string;
    baseURL?: string;
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
}

export class SecurityAgent {
  private simulator: TransactionSimulator;
  private analyzer: AIAnalyzer;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.simulator = new TransactionSimulator(config.rpcUrl);
    
    // Support both new aiProvider config and legacy openaiApiKey
    const aiConfig = config.aiProvider || {
      apiKey: config.openaiApiKey || '',
      baseURL: undefined,
      model: 'gpt-4-turbo-preview'
    };
    
    this.analyzer = new AIAnalyzer(aiConfig);
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

    // Step 1: Simulate transaction
    const simulation = await this.simulator.simulate(params);
    console.log(`[Agent] Simulation complete: ${simulation.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 2: Fetch threat intelligence from 0G Storage
    const threatIntel = await this.fetchThreatIntel(params.to);
    console.log(`[Agent] Threat intel: ${threatIntel ? `${threatIntel.riskScore}/100` : 'none'}`);

    // Step 3: AI analysis
    const analysis = await this.analyzer.analyze({
      from: params.from,
      to: params.to,
      simulation,
      threatIntel,
    });
    console.log(`[Agent] Risk score: ${analysis.riskScore}/100 (${analysis.recommendation})`);

    return {
      simulation,
      threatIntel,
      analysis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch threat intelligence from 0G Storage
   */
  private async fetchThreatIntel(address: Address) {
    // TODO: Implement 0G Storage query
    // For now, return mock data
    return null;
  }
}

export type { AIConfig } from './ai/analyzer';
