import type { Address } from 'viem';
import type { MessageContext } from '../ai/analyzer.js';

export interface SignatureGuardResult {
  safe: boolean;
  score: number;
  checks: SignatureCheck[];
  blocked: boolean;
}

export interface SignatureCheck {
  name: string;
  passed: boolean;
  severity: 'info' | 'warn' | 'critical';
  message: string;
}

export class SignatureGuard {
  private maxMessageBytes: number;
  private blockedDomains: Set<string>;
  private blockedContracts: Set<string>;
  private trustedContracts: Set<string>;
  private selectorCache: Map<string, string[]>;

  constructor(opts?: { maxMessageBytes?: number; blockedDomains?: string[]; blockedContracts?: string[]; trustedContracts?: string[] }) {
    this.maxMessageBytes = opts?.maxMessageBytes ?? 4096;
    this.blockedDomains = new Set((opts?.blockedDomains ?? []).map(d => d.toLowerCase()));
    this.blockedContracts = new Set((opts?.blockedContracts ?? []).map(c => c.toLowerCase()));
    this.trustedContracts = new Set((opts?.trustedContracts ?? []).map(c => c.toLowerCase()));
    this.selectorCache = new Map();
  }

  async check(params: {
    from: Address;
    method: 'personalSign' | 'eth_signTypedData';
    message: string;
    typedData?: MessageContext['typedData'];
  }): Promise<SignatureGuardResult> {
    const checks: SignatureCheck[] = [];
    let score = 0;
    let blocked = false;

    checks.push(this.validateAddress(params.from));
    checks.push(this.validateMessageSize(params.message));

    if (params.method === 'personalSign') {
      checks.push(this.checkPersonalSignPayload(params.message));
      checks.push(...await this.check4ByteFromMessage(params.message));
    }

    if (params.method === 'eth_signTypedData' && params.typedData) {
      checks.push(...await this.checkTypedData(params.typedData));
    }

    for (const check of checks) {
      if (!check.passed) {
        switch (check.severity) {
          case 'critical': score += 35; blocked = true; break;
          case 'warn': score += 15; break;
          case 'info': score += 5; break;
        }
      }
    }

    return { safe: score === 0, score: Math.min(score, 100), checks, blocked };
  }

  private async check4ByteFromMessage(message: string): Promise<SignatureCheck[]> {
    const m = message.trim();
    if (!/^0x[0-9a-fA-F]{10,}$/.test(m)) return [];
    const selector = m.slice(0, 10).toLowerCase();
    const signatures = await this.lookup4Byte(selector);
    if (signatures.length === 0) {
      return [{ name: 'selector-unknown', passed: false, severity: 'warn', message: `Unknown selector ${selector} (4byte miss)` }];
    }
    const dangerous = signatures.find(s => /permit\(|approve\(|setApprovalForAll\(|increaseAllowance\(|multicall\(/i.test(s));
    if (dangerous) {
      return [{ name: 'selector-dangerous', passed: false, severity: 'critical', message: `Dangerous selector ${selector}: ${dangerous}` }];
    }
    return [{ name: 'selector-known', passed: true, severity: 'info', message: `Selector ${selector}: ${signatures[0]}` }];
  }

  private async lookup4Byte(selector: string): Promise<string[]> {
    if (this.selectorCache.has(selector)) return this.selectorCache.get(selector)!;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const json = await res.json() as any;
      const out = Array.isArray(json?.results) ? json.results.map((r: any) => String(r.text_signature)).slice(0, 5) : [];
      this.selectorCache.set(selector, out);
      return out;
    } catch {
      return [];
    }
  }

  private validateAddress(address: Address): SignatureCheck {
    const valid = /^0x[0-9a-fA-F]{40}$/.test(address);
    return {
      name: 'address-format',
      passed: valid,
      severity: 'critical',
      message: valid ? 'Signer address format valid' : `Invalid signer address: ${address.slice(0, 20)}...`,
    };
  }

  private validateMessageSize(message: string): SignatureCheck {
    const byteLen = Buffer.byteLength(message, 'utf-8');
    if (byteLen > this.maxMessageBytes) {
      return { name: 'message-size', passed: false, severity: 'critical', message: `Message too large (${byteLen}B) — possible obfuscation` };
    }
    if (byteLen > 1024) {
      return { name: 'message-size', passed: false, severity: 'warn', message: `Large message (${byteLen}B) — may contain hidden data` };
    }
    return { name: 'message-size', passed: true, severity: 'info', message: `Message size normal (${byteLen}B)` };
  }

  private checkPersonalSignPayload(message: string): SignatureCheck {
    if (/^0x[0-9a-fA-F]+$/.test(message.trim()) && message.length > 132) {
      return { name: 'personal-sign-hex', passed: false, severity: 'warn', message: 'Hex-encoded message — user cannot verify content' };
    }
    if (/^0x[0-9a-fA-F]{64}$/.test(message.trim())) {
      return { name: 'personal-sign-tx-hash', passed: false, severity: 'warn', message: 'Message looks like tx hash — possible replay attack' };
    }
    return { name: 'personal-sign-payload', passed: true, severity: 'info', message: 'Payload looks readable' };
  }

  private async checkTypedData(td: MessageContext['typedData']): Promise<SignatureCheck[]> {
    const checks: SignatureCheck[] = [];
    if (!td) return checks;

    const dangerousTypes = ['Permit', 'PermitSingle', 'PermitBatch', 'PermitTransferFrom', 'SignatureTransfer', 'AllowanceTransfer', 'Claim'];
    const primaryType = String(td.primaryType || '');
    const lowerPrimaryType = primaryType.toLowerCase();
    if (dangerousTypes.some(t => t.toLowerCase() === lowerPrimaryType)) {
      checks.push({ name: 'typed-data-primary-type', passed: false, severity: 'critical', message: `Dangerous EIP-712 type "${td.primaryType}" — likely granting token approval` });
    }

    const values = this.flattenValues(td.message);
    const maxUintMatch = values.find(val => this.isUnlimitedValue(val));
    if (maxUintMatch) {
      checks.push({ name: 'typed-data-unlimited-approval', passed: false, severity: 'critical', message: `Unlimited approval value detected: ${maxUintMatch}` });
    }

    const spenderKey = Object.keys(td.message || {}).find(key => /spender|operator|delegate|approved/i.test(key));
    if (spenderKey && td.message && td.message[spenderKey]) {
      const spender = String(td.message[spenderKey]).toLowerCase();
      if (this.blockedContracts.has(spender)) {
        checks.push({ name: 'typed-data-blocked-spender', passed: false, severity: 'critical', message: `Blocked spender/operator: ${spender}` });
      } else if (!this.trustedContracts.has(spender)) {
        checks.push({ name: 'typed-data-untrusted-spender', passed: false, severity: 'warn', message: `Untrusted spender/operator: ${spender}` });
      }
    }

    const contract = String(td.domain?.verifyingContract || '').toLowerCase();
    if (contract) {
      if (this.blockedContracts.has(contract)) {
        checks.push({ name: 'typed-data-blocked-contract', passed: false, severity: 'critical', message: `Blocked contract: ${contract}` });
      } else if (!this.trustedContracts.has(contract)) {
        checks.push({ name: 'typed-data-untrusted-contract', passed: false, severity: 'warn', message: `Untrusted verifyingContract: ${contract}` });
      } else {
        checks.push({ name: 'typed-data-trusted-contract', passed: true, severity: 'info', message: `Trusted verifyingContract: ${contract}` });
      }

      const signatures = await this.lookupPermitType(primaryType, td.types);
      if (signatures.length > 0) {
        checks.push({ name: 'typed-data-4byte-match', passed: false, severity: 'warn', message: `4byte permit match: ${signatures[0]}` });
      }
    }

    const domainName = String(td.domain?.name || '').toLowerCase();
    if (domainName && this.blockedDomains.has(domainName)) {
      checks.push({ name: 'typed-data-blocked-domain', passed: false, severity: 'critical', message: `Blocked EIP-712 domain: ${domainName}` });
    }

    if (!td.domain?.chainId) {
      checks.push({ name: 'typed-data-no-chainid', passed: false, severity: 'warn', message: 'No chainId — cross-chain replay possible' });
    }

    if (!td.domain?.verifyingContract) {
      checks.push({ name: 'typed-data-no-contract', passed: false, severity: 'warn', message: 'No verifyingContract — cannot verify target' });
    }

    if (checks.length === 0) {
      checks.push({ name: 'typed-data-ok', passed: true, severity: 'info', message: `EIP-712 safe (${td.primaryType})` });
    }

    return checks;
  }

  private flattenValues(input: unknown): string[] {
    if (input == null) return [];
    if (Array.isArray(input)) return input.flatMap(item => this.flattenValues(item));
    if (typeof input === 'object') return Object.values(input as Record<string, unknown>).flatMap(item => this.flattenValues(item));
    return [String(input).toLowerCase()];
  }

  private isUnlimitedValue(value: string): boolean {
    return value === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      || value === '115792089237316195423570985008687907853269984665640564039457584007913129639935';
  }

  private async lookupPermitType(primaryType: string, types?: MessageContext['typedData']['types']): Promise<string[]> {
    if (!/permit|approval|allowance/i.test(primaryType)) return [];
    const selectorHints = ['0xd505accf', '0x8fcbaf0c', '0x2a2d80d1', '0x24856bc3'];
    for (const selector of selectorHints) {
      const matches = await this.lookup4Byte(selector);
      if (matches.length > 0) return matches;
    }
    if (types && Object.keys(types).some(key => /permit|allowance|transfer/i.test(key))) {
      return ['typed permit/allowance structure detected'];
    }
    return [];
  }
}
