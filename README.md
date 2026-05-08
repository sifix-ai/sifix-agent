# SIFIX Agent

AI-powered transaction security analyzer for Web3 wallets. Built on the full **0G Stack** — 0G Compute for AI inference + 0G Storage for decentralized evidence storage.

## Features

- **Transaction Simulation**: Simulates transactions before execution using viem
- **AI Risk Analysis**: AI-powered risk assessment with detailed explanations
- **0G Compute Integration**: Decentralized AI inference via 0G Compute Network
- **Flexible AI Provider**: Fallback support for OpenAI, Groq, Anthropic, OpenRouter, Ollama, and any OpenAI-compatible API
- **5-Tier Risk Scoring**: SAFE, LOW, MEDIUM, HIGH, CRITICAL
- **On-Chain Reporting**: Reports HIGH/CRITICAL threats to SifixReputation contract
- **0G Storage Integration**: Store analysis results on 0G decentralized storage (with mock mode fallback)

## Installation

```bash
npm install @sifix/agent
# or
pnpm add @sifix/agent
```

## Usage

### Full 0G Stack (Compute + Storage)

Use 0G Compute for AI inference and 0G Storage for evidence — fully decentralized.

```typescript
import { SecurityAgent } from '@sifix/agent';

const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  compute: {
    privateKey: process.env.ZEROG_PRIVATE_KEY!,
    providerAddress: process.env.ZEROG_COMPUTE_PROVIDER!, // 0G Compute provider address
  },
  storage: {
    indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
    privateKey: process.env.ZEROG_PRIVATE_KEY,
    mockMode: false, // true for dev/testing
  },
});

// Initialize 0G Compute broker (acknowledge provider, fetch metadata)
await agent.init();

const result = await agent.analyzeTransaction({
  from: '0x...',
  to: '0x...',
  data: '0x...',
  value: 0n,
});

console.log(result.analysis.riskScore);       // 0-100
console.log(result.analysis.recommendation);   // 'BLOCK' | 'WARN' | 'ALLOW'
console.log(result.analysis.provider);          // '0g-compute'
console.log(result.storageRootHash);            // 0G Storage root hash
console.log(result.storageExplorer);            // Explorer URL
```

### 0G Compute Only (No Storage)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  compute: {
    privateKey: process.env.ZEROG_PRIVATE_KEY!,
    providerAddress: process.env.ZEROG_COMPUTE_PROVIDER!,
  },
});

await agent.init();
const result = await agent.analyzeTransaction({ ... });
```

### OpenAI-Compatible Provider (Fallback)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
  },
});
```

### Using Groq (Fast & Free)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile',
  },
});
```

### Using OpenRouter (Multi-Model)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
  },
});
```

### Using Local Ollama

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: 'ollama', // dummy key
    baseURL: 'http://localhost:11434/v1',
    model: 'llama3.1:70b',
  },
});
```

### Legacy API (Deprecated)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  openaiApiKey: process.env.OPENAI_API_KEY,
});
```

## Architecture

```
src/
├── compute/
│   └── client.ts     # 0G Compute broker wrapper (decentralized AI inference)
├── core/
│   └── simulator.ts  # Transaction simulation engine (viem)
├── ai/
│   └── analyzer.ts   # AI risk analysis (0G Compute or OpenAI-compatible)
├── storage/
│   └── client.ts     # 0G Storage client (decentralized evidence storage)
└── index.ts          # SecurityAgent class (orchestrator)
```

### Flow

```
analyzeTransaction()
  → Simulate (viem, 0G testnet)
  → Fetch Threat Intel (0G Storage)
  → AI Analysis (0G Compute or fallback provider)
  → Store Evidence (0G Storage)
  → Return result + root hash
```

## Risk Levels

- **ALLOW** (0-39): No significant risks detected
- **WARN** (40-69): Moderate risks, review recommended
- **BLOCK** (70-100): Significant/severe threats, block recommended

## 0G Compute Integration

SIFIX uses 0G Compute Network for decentralized AI inference. Instead of calling OpenAI/Anthropic directly, requests go through the 0G Compute broker which routes to available AI service providers on the network.

**How it works:**
1. Create broker with wallet → `createZGComputeNetworkBroker(wallet)`
2. Acknowledge provider → `broker.inference.acknowledgeProviderSigner(address)`
3. Get service metadata → `broker.inference.getServiceMetadata(address)` (returns endpoint + model)
4. Make authenticated request → `broker.inference.getRequestHeaders(address)` + `fetch(endpoint)`

**Requirements:**
- Wallet with 0G testnet tokens
- Fund account: `0g-compute-cli deposit --amount 10`
- Transfer to provider: `0g-compute-cli transfer-fund --provider <ADDRESS> --amount 5`

## 0G Storage Integration

SIFIX stores transaction analysis results on 0G Storage for transparency and auditability. Each analysis gets a unique root hash that can be verified on the 0G Storage explorer.

### Mock Mode (Development/Testing)

When 0G testnet is unstable or unavailable, enable mock mode to continue development:

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  compute: { ... },
  storage: {
    indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
    privateKey: process.env.ZEROG_PRIVATE_KEY,
    mockMode: true, // ⚠️ Generates deterministic hashes without actual uploads
  },
});
```

**Mock mode behavior:**
- ✅ Generates deterministic keccak256 hash from analysis data
- ✅ UI and flow work exactly the same
- ✅ No network calls to 0G Storage
- ⚠️ Hash is NOT verifiable on 0G explorer (for demo/testing only)

**Production mode** (`mockMode: false` or omitted):
- ✅ Real upload to 0G Storage network
- ✅ Root hash verifiable on explorer
- ✅ Permanent decentralized storage
- ⚠️ Requires testnet to be operational

### Environment Variables

```bash
# .env
ZEROG_RPC_URL=https://evmrpc-testnet.0g.ai
ZEROG_PRIVATE_KEY=0x...
ZEROG_COMPUTE_PROVIDER=0x...   # 0G Compute provider address
ZEROG_INDEXER_URL=https://indexer-storage-testnet-standard.0g.ai
ZEROG_MOCK_MODE=false           # Set to 'true' for mock mode
```

## Configuration

### AgentConfig

```typescript
interface AgentConfig {
  rpcUrl: string;                    // 0G Newton Testnet RPC
  compute?: {                        // 0G Compute (decentralized AI inference)
    privateKey: string;              // Wallet private key
    providerAddress: string;         // 0G Compute provider address
    ledgerCa?: string;               // Optional: ledger contract address
    inferenceCa?: string;            // Optional: inference contract address
  };
  aiProvider?: {                     // OpenAI-compatible provider (fallback)
    apiKey: string;                  // API key for your provider
    baseURL?: string;                // Custom API endpoint (optional)
    model?: string;                  // Model name (optional)
  };
  storage?: {                        // 0G Storage (decentralized evidence storage)
    indexerUrl: string;              // 0G Storage indexer URL
    privateKey?: string;             // Private key for storage operations
    mockMode?: boolean;              // Enable mock mode (default: false)
  };
  openaiApiKey?: string;             // Legacy (deprecated)
  zeroGStorageUrl?: string;          // Legacy (deprecated)
}
```

### AIConfig

```typescript
interface AIConfig {
  apiKey: string;      // Required
  baseURL?: string;    // Optional: for non-OpenAI providers
  model?: string;      // Optional: default 'gpt-4-turbo-preview'
}
```

## Supported Providers

**0G Compute (Recommended)** — Decentralized AI inference on 0G Network

**OpenAI-Compatible (Fallback):**
- **Provider** | **baseURL** | **Example Model**
- OpenAI | (default) | `gpt-4-turbo-preview`, `gpt-4o`
- Groq | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile`
- OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet`
- Ollama | `http://localhost:11434/v1` | `llama3.1:70b`
- Together AI | `https://api.together.xyz/v1` | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`
- Any OpenAI-compatible API | Custom | Custom

## License

MIT
