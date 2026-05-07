// Check Flow contract state for root hash
import { ethers } from 'ethers';

const FLOW_CONTRACT = '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296';
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const ROOT_HASH = '0xc4c449d6d44e0cdcb5ade954def7309a39b91e8a94e9546885d5c10127a837cb';

// Flow contract ABI (minimal)
const FLOW_ABI = [
  'function numSubmissions() view returns (uint256)',
  'function getEpochRange(bytes32 digest) view returns (uint128, uint128)',
  'function epoch() view returns (uint128)',
];

async function checkContract() {
  console.log('🔍 Checking Flow Contract State\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(FLOW_CONTRACT, FLOW_ABI, provider);
  
  try {
    // 1. Check total submissions
    console.log('1️⃣ Total submissions in contract:');
    const numSubmissions = await contract.numSubmissions();
    console.log(`   ${numSubmissions.toString()} submissions\n`);
    
    // 2. Check current epoch
    console.log('2️⃣ Current epoch:');
    const currentEpoch = await contract.epoch();
    console.log(`   Epoch: ${currentEpoch.toString()}\n`);
    
    // 3. Check if our root hash exists
    console.log('3️⃣ Checking root hash:', ROOT_HASH);
    try {
      const [startEpoch, endEpoch] = await contract.getEpochRange(ROOT_HASH);
      
      if (startEpoch > 0n || endEpoch > 0n) {
        console.log(`   ⚠️  ROOT HASH ALREADY EXISTS!`);
        console.log(`   Start epoch: ${startEpoch.toString()}`);
        console.log(`   End epoch: ${endEpoch.toString()}`);
        console.log(`\n   This is why submission fails - duplicate root hash!`);
      } else {
        console.log(`   ✅ Root hash not found (can be submitted)`);
      }
    } catch (error) {
      console.log(`   ✅ Root hash not found (can be submitted)`);
      console.log(`   (getEpochRange reverted, which means it doesn't exist)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

checkContract();
