# Mock Mode Quick Reference

## TL;DR

```bash
# Development (testnet unstable)
ZEROG_MOCK_MODE=true

# Production (testnet stable)
ZEROG_MOCK_MODE=false
```

## When to Use Mock Mode

✅ **Use Mock Mode When:**
- 0G testnet is down or unstable
- Developing UI without blockchain dependency
- Running tests in CI/CD
- Demo without real uploads
- No private key available

❌ **Don't Use Mock Mode When:**
- Submitting for hackathon (need verifiable proof)
- Production deployment
- Need explorer verification
- Testing actual 0G Storage integration

## Behavior Comparison

| Feature | Mock Mode | Production Mode |
|---------|-----------|-----------------|
| Upload to 0G | ❌ No | ✅ Yes |
| Root Hash | ✅ Deterministic keccak256 | ✅ Merkle tree root |
| Private Key | ❌ Not required | ✅ Required |
| Explorer Verification | ❌ Not verifiable | ✅ Verifiable |
| Network Calls | ❌ None | ✅ RPC + Indexer |
| Speed | ⚡ Instant | 🐢 Network dependent |
| Use Case | Development/Testing | Production/Demo |

## Code Examples

### TypeScript (Agent)

```typescript
import { SecurityAgent } from '@sifix/agent';

const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  storage: {
    indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
    privateKey: process.env.ZEROG_PRIVATE_KEY, // Optional in mock mode
    mockMode: process.env.ZEROG_MOCK_MODE === 'true'
  }
});

const result = await agent.analyzeTransaction({
  from: '0x...',
  to: '0x...',
  data: '0x...',
  value: 0n
});

console.log('Root Hash:', result.storageRootHash);
// Mock: 0x25b5d5379b3de11fed9158195d191930f16402cc93c388cda49f50a5aa743651
// Production: 0x... (verifiable on explorer)
```

### Environment Variables

```bash
# .env
RPC_URL=https://evmrpc-testnet.0g.ai
OPENAI_API_KEY=sk-...
ZEROG_INDEXER_URL=https://indexer-storage-testnet-standard.0g.ai
ZEROG_PRIVATE_KEY=0x...  # Optional in mock mode
ZEROG_MOCK_MODE=true     # Set to 'false' for production
```

## Testing

```bash
# Run tests
npm test

# Test mock mode specifically
npm test -- src/storage/client.spec.ts

# Run example
npx tsx examples/mock-mode.ts
```

## Switching Between Modes

### Development → Production

1. Set `ZEROG_MOCK_MODE=false` in `.env`
2. Ensure `ZEROG_PRIVATE_KEY` is set
3. Verify testnet is operational
4. Restart application

### Production → Development

1. Set `ZEROG_MOCK_MODE=true` in `.env`
2. `ZEROG_PRIVATE_KEY` becomes optional
3. Restart application

## Troubleshooting

### "Private key required for storage operations"

**Cause:** Production mode without private key

**Fix:**
```bash
# Option 1: Add private key
ZEROG_PRIVATE_KEY=0x...

# Option 2: Enable mock mode
ZEROG_MOCK_MODE=true
```

### Hash not verifiable on explorer

**Cause:** Running in mock mode

**Fix:** Switch to production mode (see above)

### Testnet connection timeout

**Cause:** 0G testnet unstable

**Fix:** Enable mock mode to continue development

## Hackathon Submission Checklist

Before submitting for 0G APAC Hackathon:

- [ ] Set `ZEROG_MOCK_MODE=false`
- [ ] Verify `ZEROG_PRIVATE_KEY` is configured
- [ ] Test actual upload to 0G Storage
- [ ] Verify root hash on explorer: https://chainscan-newton.0g.ai/storage
- [ ] Include explorer link in UI
- [ ] Screenshot showing verifiable proof

## Version History

- **v1.2.3** (2026-05-07): Mock mode implementation
- **v1.2.2**: Storage client with 0G SDK integration
- **v1.2.1**: Initial 0G Storage support

## Links

- GitHub: https://github.com/sifix-ai/sifix-agent
- npm: https://www.npmjs.com/package/@sifix/agent
- 0G Explorer: https://chainscan-newton.0g.ai/storage
- 0G Docs: https://docs.0g.ai/
