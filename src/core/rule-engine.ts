import type { Address, Hash } from 'viem';
import type { SimulationResult } from './simulator.js';
import type { AddressThreatIntel } from '../threat-intel/provider.js';

export interface RuleEngineResult {
  score: number;
  flags: RuleFlag[];
  blocked: boolean;
}

export interface RuleFlag {
  rule: string;
  severity: 'info' | 'warn' | 'critical';
  message: string;
}

export interface RuleContext {
  from: Address;
  to: Address;
  data?: Hash;
  value?: bigint;
  simulation: SimulationResult;
  threatIntel: AddressThreatIntel | null;
}

export interface Rule {
  name: string;
  evaluate(ctx: RuleContext): RuleFlag[];
}

// ─── Built-in rules ────────────────────────────────────────────────

const highValueTransfer: Rule = {
  name: 'high-value-transfer',
  evaluate(ctx) {
    const flags: RuleFlag[] = [];
    const ethValue = ctx.value ?? BigInt(0);
    const threshold = BigInt('5000000000000000000'); // 5 ETH
    if (ethValue > threshold && (!ctx.data || ctx.data === '0x')) {
      flags.push({
        rule: 'high-value-transfer',
        severity: 'warn',
        message: `High-value native transfer (${(Number(ethValue) / 1e18).toFixed(2)} ETH) with no calldata`,
      });
    }
    return flags;
  },
};

const simulationRevert: Rule = {
  name: 'simulation-revert',
  evaluate(ctx) {
    if (!ctx.simulation.success && ctx.simulation.revertReason) {
      return [{
        rule: 'simulation-revert',
        severity: 'critical',
        message: `Simulation reverted: ${ctx.simulation.revertReason.slice(0, 200)}`,
      }];
    }
    return [];
  },
};

const selfSend: Rule = {
  name: 'self-send',
  evaluate(ctx) {
    if (ctx.from.toLowerCase() === ctx.to.toLowerCase()) {
      return [{
        rule: 'self-send',
        severity: 'info',
        message: 'Sender and recipient are the same address',
      }];
    }
    return [];
  },
};

const DANGEROUS_SELECTORS: Record<string, string> = {
  '0x095ea7b3': 'approve(spender,amount) — unlimited approval risk',
  '0x2e1a7d4d': 'withdraw(amount) — exchange withdrawal',
  '0xd0e30db0': 'deposit() — ETH deposit to contract',
  '0xf3fef3a3': 'withdraw(address,uint256) — token withdrawal',
  '0x5ae401dc': 'multicall(deadline,datas) — batch execution',
  '0xac9650d8': 'multicall(bytes[]) — unbatched multicall',
  '0x1b2ef1ca': 'sweepToken(address,uint256,address) — admin sweep',
  '0xdf28c423': 'renounceOwnership() — ownership renunciation',
  '0x715018a6': 'renounceOwnership() — ownership renunciation (v2)',
};

const dangerousSelector: Rule = {
  name: 'dangerous-selector',
  evaluate(ctx) {
    if (!ctx.data || ctx.data.length < 10) return [];
    const selector = ctx.data.slice(0, 10).toLowerCase();
    const description = DANGEROUS_SELECTORS[selector];
    if (description) {
      return [{
        rule: 'dangerous-selector',
        severity: 'warn',
        message: `Dangerous function selector: ${description}`,
      }];
    }
    return [];
  },
};

const highGasUsage: Rule = {
  name: 'high-gas-usage',
  evaluate(ctx) {
    const gasEstimate = ctx.simulation.gasEstimate ?? ctx.simulation.gasUsed;
    if (gasEstimate > BigInt(500_000)) {
      return [{
        rule: 'high-gas-usage',
        severity: 'warn',
        message: `Unusually high gas estimate: ${gasEstimate.toString()}`,
      }];
    }
    return [];
  },
};

const knownMaliciousAddress: Rule = {
  name: 'known-malicious-address',
  evaluate(ctx) {
    if (!ctx.threatIntel) return [];
    const flags: RuleFlag[] = [];
    if (ctx.threatIntel.avgRiskScore >= 70) {
      flags.push({
        rule: 'known-malicious-address',
        severity: 'critical',
        message: `Target has high historical risk (avg ${ctx.threatIntel.avgRiskScore}/100 across ${ctx.threatIntel.totalScans} scans)`,
      });
    } else if (ctx.threatIntel.avgRiskScore >= 50) {
      flags.push({
        rule: 'known-malicious-address',
        severity: 'warn',
        message: `Target has moderate historical risk (avg ${ctx.threatIntel.avgRiskScore}/100)`,
      });
    }
    if (ctx.threatIntel.knownThreats.length > 0) {
      flags.push({
        rule: 'known-threats',
        severity: 'critical',
        message: `Known threats: ${ctx.threatIntel.knownThreats.join(', ')}`,
      });
    }
    return flags;
  },
};

const contractCreation: Rule = {
  name: 'contract-creation',
  evaluate(ctx) {
    if (ctx.to === '0x0000000000000000000000000000000000000000') {
      return [{
        rule: 'contract-creation',
        severity: 'warn',
        message: 'Transaction creates a new contract (to = zero address)',
      }];
    }
    return [];
  },
};

// ─── Engine ────────────────────────────────────────────────────────

const DEFAULT_RULES: Rule[] = [
  simulationRevert,
  highValueTransfer,
  selfSend,
  dangerousSelector,
  highGasUsage,
  knownMaliciousAddress,
  contractCreation,
];

export class RuleEngine {
  private rules: Rule[];

  constructor(customRules?: Rule[]) {
    this.rules = customRules ?? DEFAULT_RULES;
  }

  evaluate(ctx: RuleContext): RuleEngineResult {
    const allFlags: RuleFlag[] = [];

    for (const rule of this.rules) {
      try {
        const flags = rule.evaluate(ctx);
        allFlags.push(...flags);
      } catch (err) {
        console.warn(`[RuleEngine] Rule "${rule.name}" threw:`, err);
      }
    }

    let score = 0;
    let blocked = false;

    for (const flag of allFlags) {
      switch (flag.severity) {
        case 'critical':
          score += 30;
          blocked = true;
          break;
        case 'warn':
          score += 15;
          break;
        case 'info':
          score += 5;
          break;
      }
    }

    return {
      score: Math.min(score, 100),
      flags: allFlags,
      blocked,
    };
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  getRuleNames(): string[] {
    return this.rules.map(r => r.name);
  }
}
