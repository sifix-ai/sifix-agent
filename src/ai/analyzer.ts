import OpenAI from 'openai';
import { ComputeClient } from '../compute/client.js';
import type { SimulationResult } from '../core/simulator';
import type { AddressThreatIntel } from '../threat-intel/provider.js';
import type { Address } from 'viem';

export interface ThreatIntelligence {
  address: Address;
  riskScore: number;
  reports: {
    type: string;
    count: number;
    lastSeen: Date;
  }[];
  tags: string[];
}

export interface RiskAnalysis {
  riskScore: number; // 0-100
  confidence: number; // 0-1
  reasoning: string;
  threats: string[];
  recommendation: 'BLOCK' | 'WARN' | 'ALLOW';
  provider: 'openai' | '0g-compute'; // Which AI provider was used
}

export interface AIConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

/**
 * AI Risk Analyzer with support for both OpenAI-compatible providers
 * and 0G Compute decentralized inference
 */
export class AIAnalyzer {
  private openai: OpenAI | null = null;
  private computeClient: ComputeClient | null = null;
  private model: string;
  private provider: 'openai' | '0g-compute';

  constructor(config: AIConfig, computeClient?: ComputeClient) {
    if (computeClient) {
      // Use 0G Compute for inference
      this.computeClient = computeClient;
      this.model = computeClient.getModel() || '0g-compute';
      this.openai = null;
      this.provider = '0g-compute';
      console.log('[AI] Using 0G Compute for inference');
    } else {
      // Use OpenAI-compatible provider (OpenAI, Groq, OpenRouter, Ollama, etc.)
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      this.model = config.model || 'gpt-4-turbo-preview';
      this.computeClient = null;
      this.provider = 'openai';
      console.log(`[AI] Using OpenAI-compatible provider (${this.model})`);
    }
  }

  /**
   * Analyze transaction risk using AI + threat intelligence
   */
  async analyze(params: {
    from: Address;
    to: Address;
    simulation: SimulationResult;
    threatIntel: AddressThreatIntel | ThreatIntelligence | null;
  }): Promise<RiskAnalysis> {
    const prompt = this.buildPrompt(params);

    let content: string;

    if (this.computeClient) {
      // Route through 0G Compute
      content = await this.analyzeViaCompute(prompt);
    } else if (this.openai) {
      // Route through OpenAI-compatible API
      content = await this.analyzeViaOpenAI(prompt);
    } else {
      throw new Error('No AI provider configured');
    }

    const result = JSON.parse(content || '{}');

    return {
      riskScore: result.riskScore || 0,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No analysis available',
      threats: result.threats || [],
      recommendation: this.getRecommendation(result.riskScore),
      provider: this.provider,
    };
  }

  /**
   * Analyze via 0G Compute (decentralized inference)
   */
  private async analyzeViaCompute(prompt: string): Promise<string> {
    const response = await this.computeClient!.chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are a blockchain security expert analyzing transaction risks. 
Provide risk scores (0-100), confidence levels (0-1), and clear reasoning.
Focus on: phishing, rug pulls, malicious contracts, unusual patterns.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return response.content;
  }

  /**
   * Analyze via OpenAI-compatible API
   */
  private async analyzeViaOpenAI(prompt: string): Promise<string> {
    const completion = await this.openai!.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a blockchain security expert analyzing transaction risks. 
Provide risk scores (0-100), confidence levels (0-1), and clear reasoning.
Focus on: phishing, rug pulls, malicious contracts, unusual patterns.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    return completion.choices[0].message.content || '{}';
  }

  /**
   * Build analysis prompt from transaction data
   */
  private buildPrompt(params: {
    from: Address;
    to: Address;
    simulation: SimulationResult;
    threatIntel: AddressThreatIntel | ThreatIntelligence | null;
  }): string {
    const { from, to, simulation, threatIntel } = params;

    let prompt = `Analyze this blockchain transaction for security risks:

**Transaction:**
- From: ${from}
- To: ${to}
- Success: ${simulation.success}
${simulation.revertReason ? `- Revert Reason: ${simulation.revertReason}` : ''}

**Simulation Results:**
- Gas Used: ${simulation.gasUsed.toString()}
- Balance Changes: ${simulation.balanceChanges.length} detected
${simulation.balanceChanges.map((c: any) => `  • ${c.from} → ${c.to}: ${c.amount.toString()} (${c.token})`).join('\\n')}

`;

    if (threatIntel) {
      // Check if it's AddressThreatIntel (from provider) or legacy ThreatIntelligence
      if ('totalScans' in threatIntel) {
        // AddressThreatIntel — rich historical data
        const intel = threatIntel as AddressThreatIntel;
        prompt += `**Threat Intelligence (from ${intel.totalScans} past scans via 0G Storage):**
- Address: ${intel.address}
- Average Risk Score: ${intel.avgRiskScore}/100
- Highest Risk Score: ${intel.maxRiskScore}/100
- Known Threats: ${intel.knownThreats.length > 0 ? intel.knownThreats.join(', ') : 'None'}
- Last Recommendation: ${intel.lastRecommendation || 'N/A'}
- Risk Distribution: SAFE=${intel.riskDistribution.safe}, LOW=${intel.riskDistribution.low}, MEDIUM=${intel.riskDistribution.medium}, HIGH=${intel.riskDistribution.high}, CRITICAL=${intel.riskDistribution.critical}
- First Seen: ${intel.firstSeen || 'Unknown'}
- Last Seen: ${intel.lastSeen || 'Unknown'}

**Recent Scan History:**
${intel.recentScans.slice(0, 5).map(s => `  • ${s.timestamp}: Risk ${s.riskScore}/100 (${s.riskLevel}) — ${s.recommendation} — Threats: ${s.threats.join(', ') || 'None'}`).join('\n')}

⚠️ IMPORTANT: This address has historical scan data. Factor in the past risk patterns when making your assessment. If past scans show consistent HIGH/CRITICAL scores, the address is likely malicious.

`;
      } else {
        // Legacy ThreatIntelligence format
        const intel = threatIntel as ThreatIntelligence;
        prompt += `**Threat Intelligence (from 0G Storage):**
- Risk Score: ${intel.riskScore}/100
- Reports: ${intel.reports.length} total
${intel.reports.map(r => `  • ${r.type}: ${r.count} reports (last: ${r.lastSeen.toISOString()})`).join('\n')}
- Tags: ${intel.tags.join(', ')}

`;
      }
    } else {
      prompt += `**Threat Intelligence:** No historical data found (new address)\n\n`;
    }

    prompt += `Respond in JSON format:
{
  "riskScore": <0-100>,
  "confidence": <0-1>,
  "reasoning": "<human-readable explanation>",
  "threats": ["<threat1>", "<threat2>"]
}`;

    return prompt;
  }

  /**
   * Get recommendation based on risk score
   */
  private getRecommendation(riskScore: number): 'BLOCK' | 'WARN' | 'ALLOW' {
    if (riskScore >= 70) return 'BLOCK';
    if (riskScore >= 40) return 'WARN';
    return 'ALLOW';
  }
}
