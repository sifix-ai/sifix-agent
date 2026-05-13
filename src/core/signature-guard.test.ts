import { describe, expect, it, vi } from 'vitest';
import { SignatureGuard } from './signature-guard.js';

describe('SignatureGuard', () => {
  it('flags dangerous selector from personal_sign payload via 4byte', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ text_signature: 'approve(address,uint256)' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const guard = new SignatureGuard();
    const result = await guard.check({
      from: '0x1111111111111111111111111111111111111111',
      method: 'personalSign',
      message: '0x095ea7b30000000000000000000000000000000000000000000000000000000000000000',
    });

    expect(result.blocked).toBe(true);
    expect(result.checks.some(check => check.name === 'selector-dangerous')).toBe(true);
  });

  it('flags blocked and untrusted contracts in typed data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ text_signature: 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const guard = new SignatureGuard({
      blockedContracts: ['0x9999999999999999999999999999999999999999'],
      trustedContracts: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
      blockedDomains: ['evil.app'],
    });

    const result = await guard.check({
      from: '0x1111111111111111111111111111111111111111',
      method: 'eth_signTypedData',
      message: 'permit payload',
      typedData: {
        primaryType: 'Permit',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Permit: [
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
          ],
        },
        domain: {
          name: 'evil.app',
          chainId: 1,
          verifyingContract: '0x9999999999999999999999999999999999999999',
        },
        message: {
          spender: '0x1234567890123456789012345678901234567890',
          value: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
      },
    });

    expect(result.blocked).toBe(true);
    expect(result.checks.some(check => check.name === 'typed-data-blocked-contract')).toBe(true);
    expect(result.checks.some(check => check.name === 'typed-data-untrusted-spender')).toBe(true);
    expect(result.checks.some(check => check.name === 'typed-data-4byte-match')).toBe(true);
  });
});
