import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai');
const privateKey = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const wallet = new ethers.Wallet(privateKey, provider);

console.log('Wallet Address:', wallet.address);

const balance = await provider.getBalance(wallet.address);
console.log('Balance:', ethers.formatEther(balance), 'A0GI');
console.log('Balance (wei):', balance.toString());

const storageFee = 61467289924n;
console.log('\nStorage Fee:', storageFee.toString(), 'wei');
console.log('Storage Fee:', ethers.formatEther(storageFee), 'A0GI');
console.log('\nSufficient?', balance >= storageFee ? '✅ YES' : '❌ NO');

if (balance < storageFee) {
  console.log('Need:', ethers.formatEther(storageFee - balance), 'more A0GI');
}
