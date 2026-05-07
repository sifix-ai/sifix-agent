// Check Flow contract state
import { ethers } from 'ethers';

const FLOW_CONTRACT = '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296';
const RPC_URL = 'https://evmrpc-testnet.0g.ai';

const FLOW_ABI = [
  'function paused() view returns (bool)',
  'function initialized() view returns (bool)',
  'function numSubmissions() view returns (uint256)',
  'function epoch() view returns (uint256)',
];

async function checkContract() {
  console.log('🔍 Checking Flow Contract State...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(FLOW_CONTRACT, FLOW_ABI, provider);
  
  try {
    console.log('Contract:', FLOW_CONTRACT);
    console.log('RPC:', RPC_URL);
    console.log();
    
    // Check if contract exists
    const code = await provider.getCode(FLOW_CONTRACT);
    console.log('✅ Contract exists:', code.length > 2);
    
    // Check paused state
    try {
      const paused = await contract.paused();
      console.log('Paused:', paused);
    } catch (e) {
      console.log('⚠️  Cannot read paused():', e.message);
    }
    
    // Check initialized
    try {
      const initialized = await contract.initialized();
      console.log('Initialized:', initialized);
    } catch (e) {
      console.log('⚠️  Cannot read initialized():', e.message);
    }
    
    // Check submissions
    try {
      const numSubmissions = await contract.numSubmissions();
      console.log('Total Submissions:', numSubmissions.toString());
    } catch (e) {
      console.log('⚠️  Cannot read numSubmissions():', e.message);
    }
    
    // Check epoch
    try {
      const epoch = await contract.epoch();
      console.log('Current Epoch:', epoch.toString());
    } catch (e) {
      console.log('⚠️  Cannot read epoch():', e.message);
    }
    
    // Check network
    const network = await provider.getNetwork();
    console.log('\n📡 Network Info:');
    console.log('Chain ID:', network.chainId.toString());
    console.log('Name:', network.name);
    
    // Check latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('Latest Block:', blockNumber);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkContract();
