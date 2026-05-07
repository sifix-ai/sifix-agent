import { describe, it, expect } from 'vitest';
import { StorageClient } from './client.js';

describe('StorageClient Mock Mode', () => {
  it('should generate deterministic hash in mock mode', async () => {
    const client = new StorageClient({
      rpcUrl: 'https://evmrpc-testnet.0g.ai',
      indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
      mockMode: true
    });

    const analysisData = {
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to: '0x1234567890123456789012345678901234567890',
      riskScore: 75,
      riskLevel: 'HIGH',
      recommendation: 'BLOCK',
      reasoning: 'Test analysis',
      threats: ['Suspicious contract'],
      confidence: 0.95,
      timestamp: '2026-05-07T09:00:00.000Z',
      simulationSuccess: true,
      gasUsed: '21000'
    };

    const hash1 = await client.storeAnalysis(analysisData);
    const hash2 = await client.storeAnalysis(analysisData);

    // Same data should produce same hash
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should not require private key in mock mode', async () => {
    const client = new StorageClient({
      rpcUrl: 'https://evmrpc-testnet.0g.ai',
      indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
      mockMode: true
      // No privateKey provided
    });

    const analysisData = {
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to: '0x1234567890123456789012345678901234567890',
      riskScore: 50,
      riskLevel: 'MEDIUM',
      recommendation: 'WARN',
      reasoning: 'Test',
      threats: [],
      confidence: 0.8,
      timestamp: '2026-05-07T09:00:00.000Z',
      simulationSuccess: true,
      gasUsed: '21000'
    };

    // Should NOT throw in mock mode
    const hash = await client.storeAnalysis(analysisData);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should throw error in production mode without private key', async () => {
    const client = new StorageClient({
      rpcUrl: 'https://evmrpc-testnet.0g.ai',
      indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
      mockMode: false
      // No privateKey provided
    });

    const analysisData = {
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to: '0x1234567890123456789012345678901234567890',
      riskScore: 50,
      riskLevel: 'MEDIUM',
      recommendation: 'WARN',
      reasoning: 'Test',
      threats: [],
      confidence: 0.8,
      timestamp: '2026-05-07T09:00:00.000Z',
      simulationSuccess: true,
      gasUsed: '21000'
    };

    // Should throw in production mode
    await expect(client.storeAnalysis(analysisData)).rejects.toThrow(
      'Private key required for storage operations'
    );
  });
});
