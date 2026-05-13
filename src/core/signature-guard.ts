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

  constructor(opts?: { maxMessageBytes?: number; blockedDomains?: string[] }) {
    this.maxMessageBytes = opts?.maxMessageBytes ?? 4096;
    this.blockedDomains = new Set(
      (opts?.blockedDomains ?? []).map(d => d.toLowerCase()),
    );
  }

  check(params: {
    from: Address;
    method: 'personalSign' | 'eth_signTypedData';
    message: string;
    typedData?: MessageContext['typedData'];
  }): SignatureGuardResult {
    const checks: SignatureCheck[] = [];
    let score = 0;
    let blocked = false;

    // 1. Validate signer address format
    checks.push(this.validateAddress(params.from));

    // 2. Validate message size
    checks.push(this.validateMessageSize(params.message));

    // 3. Method-specific checks
    if (params.method === 'personalSign') {
      checks.push(this.checkPersonalSignPayload(params.message));
    }

    if (params.method === 'eth_signTypedData' && params.typedData) {
      checks.push(...this.checkTypedData(params.typedData));
    }

    // 4. Aggregate
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

  private checkTypedData(td: MessageContext['typedData']): SignatureCheck[] {
    const checks: SignatureCheck[] = [];
    if (!td) return checks;

    const dangerousTypes = ['Permit', 'PermitSingle', 'PermitBatch', 'PermitTransferFrom', 'SignatureTransfer', 'AllowanceTransfer', 'Claim'];
    if (dangerousTypes.some(t => t.toLowerCase() === td.primaryType.toLowerCase())) {
      checks.push({ name: 'typed-data-primary-type', passed: false, severity: 'critical', message: `Dangerous EIP-712 type "${td.primaryType}" — likely granting token approval` });
    }

    if (td.message && typeof td.message === 'object') {
      const MAX_UINT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      for (const val of Object.values(td.message)) {
        if (String(val).toLowerCase() === MAX_UINT) {
          checks.push({ name: 'typed-data-unlimited-approval', passed: false, severity: 'critical', message: 'MAX_UINT256 — unlimited token approval' });
          break;
        }
      }
    }

    const contract = td.domain?.verifyingContract?.toLowerCase();
    if (contract && this.blockedDomains.has(contract)) {
      checks.push({ name: 'typed-data-blocked-contract', passed: false, severity: 'critical', message: `Blocked contract: ${contract}` });
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
}
