import { StorageClient } from './dist/storage/client.js';

const config = {
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
  privateKey: process.env.PRIVATE_KEY,
  mockMode: true, // Enable mock mode
};

const mockAnalysis = {
  from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  to: '0x1234567890123456789012345678901234567890',
  value: '1000000000000000000',
  riskScore: 25,
  riskLevel: 'LOW',
  recommendation: 'PROCEED_WITH_CAUTION',
  reasoning: 'Test transaction for 0G Storage integration',
  threats: ['Unknown contract'],
  confidence: 0.85,
  timestamp: new Date().toISOString(),
  simulationSuccess: true,
  gasUsed: '21000',
};

console.log('🧪 Testing MOCK mode (no actual upload)...\n');

const client = new StorageClient(config);
const rootHash = await client.storeAnalysis(mockAnalysis);

console.log('\n✅ Mock upload successful!');
console.log(`Root Hash: ${rootHash}`);
console.log(`\n🔗 Explorer link (mock): https://chainscan-newton.0g.ai/tx/${rootHash}`);
console.log('\nNote: This is a deterministic hash generated locally, no actual upload to 0G Storage.');
