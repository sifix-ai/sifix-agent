# SIFIX Agent

AI-powered transaction security analyzer for Web3 wallets.

## Features

- **Transaction Simulation**: Simulates transactions before execution using viem
- **AI Risk Analysis**: AI-powered risk assessment with detailed explanations
- **Flexible AI Provider**: Support for OpenAI, Groq, Anthropic, OpenRouter, Ollama, and any OpenAI-compatible API
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

### Basic Usage (OpenAI)

```typescript
import { SecurityAgent } from '@sifix/agent';

const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview' // optional, default
  }
});

const result = await agent.analyzeTransaction({
  from: '0x...',
  to: '0x...',
  data: '0x...',
  value: 0n
});

console.log(result.analysis.riskScore); // 0-100
console.log(result.analysis.recommendation); // 'BLOCK' | 'WARN' | 'ALLOW'
console.log(result.analysis.reasoning);
```

### Using Groq (Fast & Free)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile'
  }
});
```

### Using OpenRouter (Multi-Model)

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet'
  }
});
```

### Using Local Ollama

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: 'ollama', // dummy key
    baseURL: 'http://localhost:11434/v1',
    model: 'llama3.1:70b'
  }
});
```

### Legacy API (Deprecated)

```typescript
// Still supported for backward compatibility
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  openaiApiKey: process.env.OPENAI_API_KEY
});
```

## Architecture

```
src/
├── core/
│   └── simulator.ts    # Transaction simulation engine (viem)
├── ai/
│   └── analyzer.ts     # AI risk analysis (flexible provider)
└── index.ts            # SecurityAgent class
```

## Risk Levels

- **ALLOW** (0-39): No significant risks detected
- **WARN** (40-69): Moderate risks, review recommended
- **BLOCK** (70-100): Significant/severe threats, block recommended

## 0G Storage Integration

SIFIX stores transaction analysis results on 0G Storage for transparency and auditability. Each analysis gets a unique root hash that can be verified on the 0G Storage explorer.

### Mock Mode (Development/Testing)

When 0G testnet is unstable or unavailable, enable mock mode to continue development:

```typescript
const agent = new SecurityAgent({
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  aiProvider: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  storage: {
    indexerUrl: 'https://indexer-storage-testnet-standard.0g.ai',
    privateKey: process.env.ZEROG_PRIVATE_KEY,
    mockMode: true  // ⚠️ Generates deterministic hashes without actual uploads
  }
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
ZEROG_INDEXER_URL=https://indexer-storage-testnet-standard.0g.ai
ZEROG_PRIVATE_KEY=0x...
ZEROG_MOCK_MODE=false  # Set to 'true' for mock mode
```

## Configuration

### AgentConfig

```typescript
interface AgentConfig {
  rpcUrl: string;                    // 0G Newton Testnet RPC
  aiProvider?: {
    apiKey: string;                  // API key for your provider
    baseURL?: string;                // Custom API endpoint (optional)
    model?: string;                  // Model name (optional)
  };
  storage?: {
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

| Provider | baseURL | Example Model |
|----------|---------|---------------|
| OpenAI | (default) | `gpt-4-turbo-preview`, `gpt-4o` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet` |
| Ollama | `http://localhost:11434/v1` | `llama3.1:70b` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` |
| Any OpenAI-compatible API | Custom | Custom |

## License

MIT
