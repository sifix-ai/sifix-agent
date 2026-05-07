// Debug 0G Storage upload with detailed logging
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const config = {
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
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

async function debugUpload() {
  console.log('🔍 Debug 0G Storage Upload\n');
  
  // 1. Check network connectivity
  console.log('1️⃣ Checking network connectivity...');
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log(`   ✅ Wallet: ${wallet.address}`);
    console.log(`   ✅ Balance: ${ethers.formatEther(balance)} A0GI`);
    
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Block number: ${blockNumber}`);
  } catch (error) {
    console.error(`   ❌ Network error:`, error.message);
    process.exit(1);
  }
  
  // 2. Check indexer connectivity
  console.log('\n2️⃣ Checking indexer connectivity...');
  const indexer = new Indexer(config.indexerUrl);
  
  try {
    // Try to select nodes
    console.log('   Selecting storage nodes...');
    const [nodes, nodesErr] = await indexer.selectNodes(1);
    
    if (nodesErr) {
      console.error(`   ❌ Node selection failed:`, nodesErr.message);
      console.error('   Full error:', nodesErr);
    } else {
      console.log(`   ✅ Selected ${nodes?.length || 0} nodes`);
      if (nodes && nodes.length > 0) {
        console.log(`   Node info:`, JSON.stringify(nodes[0], null, 2));
      }
    }
  } catch (error) {
    console.error(`   ❌ Indexer error:`, error.message);
    console.error('   Full error:', error);
  }
  
  // 3. Create test file
  console.log('\n3️⃣ Creating test file...');
  const jsonData = Buffer.from(JSON.stringify(mockAnalysis, null, 2));
  const tempPath = path.join(os.tmpdir(), `0g-debug-${Date.now()}.json`);
  fs.writeFileSync(tempPath, jsonData);
  console.log(`   ✅ File created: ${tempPath}`);
  console.log(`   ✅ File size: ${jsonData.length} bytes`);
  
  // 4. Generate merkle tree
  console.log('\n4️⃣ Generating merkle tree...');
  const file = await ZgFile.fromFilePath(tempPath);
  
  try {
    const [tree, treeErr] = await file.merkleTree();
    
    if (treeErr) {
      console.error(`   ❌ Merkle tree error:`, treeErr);
      process.exit(1);
    }
    
    const rootHash = tree.rootHash();
    console.log(`   ✅ Root hash: ${rootHash}`);
    
    // 5. Attempt upload with detailed error logging
    console.log('\n5️⃣ Attempting upload...');
    console.log(`   RPC: ${config.rpcUrl}`);
    console.log(`   Indexer: ${config.indexerUrl}`);
    
    const [tx, uploadErr] = await indexer.upload(
      file,
      config.rpcUrl,
      wallet
    );
    
    if (uploadErr) {
      console.error(`\n❌ Upload failed:`, uploadErr.message);
      console.error('\n📋 Error details:');
      console.error('   Type:', uploadErr.constructor.name);
      console.error('   Message:', uploadErr.message);
      
      if (uploadErr.code) {
        console.error('   Code:', uploadErr.code);
      }
      
      if (uploadErr.data) {
        console.error('   Data:', uploadErr.data);
      }
      
      if (uploadErr.transaction) {
        console.error('   Transaction:', JSON.stringify(uploadErr.transaction, null, 2));
      }
      
      if (uploadErr.stack) {
        console.error('\n📚 Stack trace:');
        console.error(uploadErr.stack);
      }
      
      process.exit(1);
    }
    
    console.log(`\n✅ SUCCESS!`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Root hash: ${rootHash}`);
    console.log(`\n🔗 Explorer: https://chainscan-newton.0g.ai/tx/${tx}`);
    
  } finally {
    await file.close();
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

debugUpload().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});
