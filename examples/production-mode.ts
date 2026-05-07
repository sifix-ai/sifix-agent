/**
 * Example: Production Mode with Real 0G Storage
 * 
 * Use this when 0G testnet is operational and you want
 * verifiable on-chain storage.
 */

import { SecurityAgent } from '../src/index.js';

async function main() {
  // Validate required env vars
  if (!process.env.ZEROG_PRIVATE_KEY) {
    throw new Error('ZEROG_PRIVATE_KEY is required for production mode');
  }

  // Initialize agent with real storage
  const agent = new SecurityAgent({
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    aiProvider: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL || 'gpt-4-turbo-preview'
    },
    storage: {
      indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
      privateKey: process.env.ZEROG_PRIVATE_KEY,
      mockMode: false  // 🚀 PRODUCTION MODE
    }
  });

  console.log('🚀 Running in PRODUCTION MODE - real uploads to 0G Storage\n');

  // Analyze a transaction
  const result = await agent.analyzeTransaction({
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x1234567890123456789012345678901234567890',
    data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a',
    value: 0n
  });

  console.log('\n📊 Analysis Result:');
  console.log('Risk Score:', result.analysis.riskScore);
  console.log('Recommendation:', result.analysis.recommendation);
  console.log('Reasoning:', result.analysis.reasoning);
  
  if (result.storageRootHash) {
    console.log('\n🔗 Storage Root Hash:', result.storageRootHash);
    console.log('✅ Uploaded to 0G Storage');
    console.log('🔍 Verify on explorer: https://chainscan-newton.0g.ai/storage');
    console.log('   Search for root hash:', result.storageRootHash);
  }
}

main().catch(console.error);
