// Real test of 0G Storage upload with working endpoint
import { StorageClient } from './dist/storage/client.js';

const config = {
  rpcUrl: 'https://evmrpc-testnet.0g.ai', // Working endpoint
  indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
  privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
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

async function testStorage() {
  console.log('🧪 Testing 0G Storage with working endpoint...\n');
  
  const client = new StorageClient(config);
  
  try {
    console.log('📤 Uploading analysis to 0G Storage...');
    const rootHash = await client.storeAnalysis(mockAnalysis);
    
    console.log('\n✅ SUCCESS!');
    console.log(`Root Hash: ${rootHash}`);
    console.log(`\n🔗 Explorer link: https://chainscan-newton.0g.ai/tx/${rootHash}`);
    
    // Check balance
    const balance = await client.checkBalance();
    console.log(`\n💰 Wallet balance: ${balance.toString()} wei`);
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testStorage();
