// Test with different file sizes to isolate the issue
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const config = {
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
  privateKey: process.env.PRIVATE_KEY,
};

async function testDifferentSizes() {
  console.log('🧪 Testing different file sizes\n');
  
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const indexer = new Indexer(config.indexerUrl);
  
  // Test cases with different sizes
  const testCases = [
    { name: 'Tiny (10 bytes)', data: 'test12345\n' },
    { name: 'Small (100 bytes)', data: 'x'.repeat(100) },
    { name: 'Medium (1 KB)', data: 'x'.repeat(1024) },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   Size: ${testCase.data.length} bytes`);
    
    const tempPath = path.join(os.tmpdir(), `0g-test-${Date.now()}.txt`);
    fs.writeFileSync(tempPath, testCase.data);
    
    const file = await ZgFile.fromFilePath(tempPath);
    
    try {
      const [tree, treeErr] = await file.merkleTree();
      if (treeErr) {
        console.error(`   ❌ Merkle tree failed:`, treeErr);
        continue;
      }
      
      const rootHash = tree.rootHash();
      console.log(`   Root hash: ${rootHash}`);
      
      // Try upload
      console.log(`   Uploading...`);
      const [tx, uploadErr] = await indexer.upload(
        file,
        config.rpcUrl,
        wallet
      );
      
      if (uploadErr) {
        console.error(`   ❌ Upload failed:`, uploadErr.message);
        
        // Check if it's the same estimateGas error
        if (uploadErr.message.includes('estimateGas')) {
          console.error(`   ⚠️  Same estimateGas error - not size-related`);
        }
      } else {
        console.log(`   ✅ SUCCESS! Tx: ${tx}`);
        break; // If one succeeds, we know it works
      }
      
    } finally {
      await file.close();
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
    
    // Wait between attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testDifferentSizes().catch(error => {
  console.error('\n💥 Error:', error);
  process.exit(1);
});
