# 0G Storage Upload Issue - May 7, 2026

## Problem Summary

Upload ke 0G Storage gagal dengan error `require(false)` saat `estimateGas` ke Flow contract.

## Error Details

```
Error: execution reverted (no data present; likely require(false) occurred
action="estimateGas"
data="0x"
to: "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296" (Flow Contract)
```

## Investigation Results

### ✅ Yang Sudah Dicek dan OK

1. **Network connectivity**: ✅ Working
   - RPC: `https://evmrpc-testnet.0g.ai`
   - Block number: 32020303
   - Wallet balance: 0.0355 A0GI

2. **Indexer connectivity**: ✅ Working
   - Indexer: `https://indexer-storage-testnet-turbo.0g.ai` (sesuai docs)
   - Node selection: 2 nodes selected successfully
   - Nodes reachable: `http://34.83.53.209:5678`, `http://34.169.28.106:5678`

3. **File preparation**: ✅ Working
   - Merkle tree generation: Success
   - Root hash: `0xc4c449d6d44e0cdcb5ade954def7309a39b91e8a94e9546885d5c10127a837cb`
   - File size: 451 bytes (1 segment, 2 chunks)

4. **Contract state**: ✅ No duplicate
   - Total submissions: 92752
   - Current epoch: 8469
   - Root hash check: Not found (can be submitted)

5. **Storage fee calculation**: ✅ Calculated
   - Fee: 61467289924 wei
   - Gas price: 4000000007

### ❌ Yang Gagal

**Transaction submission ke Flow contract:**
```
Function: 0xef3e12dc (submit)
Data: {
  rootHash: 0xc4c449d6d44e0cdcb5ade954def7309a39b91e8a94e9546885d5c10127a837cb
  size: 451 (0x1c3)
  numSegments: 1
}
```

Error terjadi saat `estimateGas` - contract menolak transaksi dengan `require(false)`.

## Possible Root Causes

1. **Contract validation issue**: Ada validasi di `submission.valid()` yang gagal
2. **Network state**: Testnet mungkin sedang maintenance atau ada perubahan contract
3. **SDK version mismatch**: Mungkin ada breaking change di contract yang belum di-update di SDK
4. **Gas estimation issue**: Contract state menyebabkan estimasi gas gagal

## Workaround: Mock Mode

Untuk hackathon, kita gunakan **mock mode** yang:
- Generate deterministic hash dengan `keccak256(JSON.stringify(analysis))`
- Tidak melakukan upload ke 0G Storage
- Tetap menyimpan hash untuk verifikasi
- UI tetap menampilkan "stored on 0G Storage" dengan disclaimer

### Implementation

```typescript
const client = new StorageClient({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
  privateKey: process.env.PRIVATE_KEY,
  mockMode: true, // Enable mock mode
});

const rootHash = await client.storeAnalysis(analysis);
// Returns: keccak256 hash (deterministic, verifiable)
```

## Next Steps

1. ✅ **Immediate**: Use mock mode untuk demo hackathon
2. 🔄 **Short-term**: Monitor 0G testnet status dan coba lagi
3. 📝 **Long-term**: Report issue ke 0G Storage team dengan detail lengkap

## References

- 0G Storage SDK: https://github.com/0gfoundation/0g-storage-ts-sdk
- Flow Contract: `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296`
- Indexer (Turbo): `https://indexer-storage-testnet-turbo.0g.ai`
- RPC: `https://evmrpc-testnet.0g.ai`

## Test Files

- `test-debug-upload.mjs`: Detailed upload debugging
- `test-check-flow-contract.mjs`: Contract state checker
- `test-file-sizes.mjs`: Test different file sizes

---

**Status**: BLOCKED - Waiting for 0G testnet fix or SDK update
**Workaround**: Mock mode enabled ✅
**Impact**: Demo dapat berjalan dengan mock mode, hash tetap verifiable
