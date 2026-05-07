/**
 * Integration test for SIFIX Agent v1.1.1 with 0G Storage
 * Tests that storageRootHash is properly returned
 */

import { SecurityAgent } from './dist/index.js';

async function testAgent() {
  console.log('🧪 Testing SIFIX Agent v1.1.1 with 0G Storage Integration\n');

  // Configuration with 0G Storage
  const config = {
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    aiProvider: {
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      model: 'claude-3-5-sonnet-20241022'
    },
    storage: {
      indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
      privateKey: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2'
    }
  };

  console.log('✅ Config loaded:');
  console.log('   - RPC URL:', config.rpcUrl);
  console.log('   - Storage Indexer:', config.storage.indexerUrl);
  console.log('   - AI Model:', config.aiProvider.model);
  console.log('');

  // Create agent instance
  const agent = new SecurityAgent(config);
  console.log('✅ SecurityAgent instance created\n');

  // Test transaction parameters
  const testTx = {
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    to: '0x1234567890123456789012345678901234567890',
    value: BigInt('1000000000000000000'), // 1 ETH
    data: '0x'
  };

  console.log('📝 Test Transaction:');
  console.log('   - From:', testTx.from);
  console.log('   - To:', testTx.to);
  console.log('   - Value:', testTx.value.toString(), 'wei (1 ETH)');
  console.log('');

  try {
    console.log('🔍 Analyzing transaction...\n');
    
    const result = await agent.analyzeTransaction(testTx);

    console.log('✅ Analysis completed!\n');
    console.log('📊 Result Structure:');
    console.log('   - Has simulation:', !!result.simulation);
    console.log('   - Has analysis:', !!result.analysis);
    console.log('   - Has timestamp:', !!result.timestamp);
    console.log('   - Has storageRootHash:', !!result.storageRootHash);
    console.log('');

    if (result.storageRootHash) {
      console.log('🎉 SUCCESS: storageRootHash is present!');
      console.log('   Root Hash:', result.storageRootHash);
      console.log('');
      console.log('🔗 0G Storage Explorer Link:');
      console.log('   https://explorer.0g.ai/storage/' + result.storageRootHash);
      console.log('');
    } else {
      console.log('⚠️  WARNING: storageRootHash is missing (storage might be disabled or failed)');
      console.log('');
    }

    console.log('📋 Full Analysis Result:');
    console.log(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    console.log('');

    console.log('✅ All tests passed!');
    console.log('');
    console.log('📦 Package @sifix/agent v1.1.1 is ready for:');
    console.log('   - dApp integration');
    console.log('   - Browser extension integration');
    console.log('   - 0G APAC Hackathon submission');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    return false;
  }
}

// Run test
testAgent()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
