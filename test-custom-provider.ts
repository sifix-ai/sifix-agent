import { SecurityAgent } from './src/index';

async function testCustomProvider() {
  console.log('Testing custom Anthropic-compatible provider...\n');

  const agent = new SecurityAgent({
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    aiProvider: {
      apiKey: 'sk-30219bc58d0c41ad-x8gv9t-83b19c4e',
      baseURL: 'http://43.156.177.86:20128/v1',
      model: 'glm/glm-5.1' // GLM-5.1 model
    }
  });

  try {
    const result = await agent.analyzeTransaction({
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      to: '0x1234567890123456789012345678901234567890',
      value: 1000000000000000000n, // 1 ETH
      data: '0x'
    });

    console.log('✅ Analysis Result:');
    console.log('Risk Score:', result.analysis.riskScore);
    console.log('Recommendation:', result.analysis.recommendation);
    console.log('Reasoning:', result.analysis.reasoning);
    console.log('\nThreats:', result.analysis.threats);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testCustomProvider();
