import { StorageClient } from './src/storage/client.js';
import { ethers } from 'ethers';

async function testStorage() {
  const indexerUrl = 'https://indexer-storage-testnet-turbo.0g.ai';
  const privateKey = '0xf07b68dc43c75f1ef6c997af7637f77b3198c74e8da1e7f268c24ab95e0d14ce';
  const rpcUrl = 'https://evmrpc-testnet.0g.ai';

  console.log('Initializing StorageClient...');
  const storage = new StorageClient(indexerUrl, privateKey, rpcUrl);

  const testData = {
    timestamp: new Date().toISOString(),
    test: 'Hello 0G Storage',
    riskScore: 75
  };

  console.log('Uploading test data:', testData);
  
  try {
    const rootHash = await storage.upload(testData);
    console.log('✅ Upload success!');
    console.log('Root Hash:', rootHash);
    console.log('Explorer:', `https://chainscan-newton.0g.ai/storage/${rootHash}`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

testStorage();
