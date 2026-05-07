// Quick test script to check 0G network endpoints
const https = require('https');
const http = require('http');

const endpoints = [
  'https://evmrpc-testnet-turbo.0g.ai',
  'https://rpc-testnet.0g.ai',
  'https://indexer-storage-testnet-turbo.0g.ai',
  'https://evmrpc-testnet.0g.ai',
  'http://rpc-testnet.0g.ai',
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'POST', timeout: 5000 }, (res) => {
      resolve({ url, status: res.statusCode, reachable: true });
    });
    
    req.on('error', (err) => {
      resolve({ url, status: null, reachable: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: null, reachable: false, error: 'timeout' });
    });
    
    req.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    }));
    req.end();
  });
}

(async () => {
  console.log('Testing 0G network endpoints...\n');
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${result.reachable ? '✅' : '❌'} ${result.url}`);
    if (!result.reachable) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Status: ${result.status}`);
    }
  }
})();
