import OpenAI from 'openai';
import type { SimulationResult } from '../core/simulator';
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
}

export class AIAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze transaction risk using AI + threat intelligence
   */
  async analyze(params: {
    from: Address;
    to: Address;
    simulation: SimulationResult;
    threatIntel: ThreatIntelligence | null;
  }): Promise<RiskAnalysis> {
    const prompt = this.buildPrompt(params);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      riskScore: result.riskScore || 0,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No analysis available',
      threats: result.threats || [],
      recommendation: this.getRecommendation(result.riskScore),
    };
  }

  /**
   * Build analysis prompt from transaction data
   */
  private buildPrompt(params: {
    from: Address;
    to: Address;
    simulation: SimulationResult;
    threatIntel: ThreatIntelligence | null;
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
      prompt += `**Threat Intelligence (from 0G Storage):**
- Risk Score: ${threatIntel.riskScore}/100
- Reports: ${threatIntel.reports.length} total
${threatIntel.reports.map(r => `  • ${r.type}: ${r.count} reports (last: ${r.lastSeen.toISOString()})`).join('\n')}
- Tags: ${threatIntel.tags.join(', ')}

`;
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
