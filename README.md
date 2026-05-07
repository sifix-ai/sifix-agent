# SIFIX Agent

AI-powered transaction security analyzer for Web3 wallets.

## Features

- **Transaction Simulation**: Simulates transactions before execution using viem
- **AI Risk Analysis**: AI-powered risk assessment with detailed explanations
- **Flexible AI Provider**: Support for OpenAI, Groq, Anthropic, OpenRouter, Ollama, and any OpenAI-compatible API
- **5-Tier Risk Scoring**: SAFE, LOW, MEDIUM, HIGH, CRITICAL
- **On-Chain Reporting**: Reports HIGH/CRITICAL threats to SifixReputation contract

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
  openaiApiKey?: string;             // Legacy (deprecated)
  zeroGStorageUrl?: string;          // 0G Storage endpoint (future)
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
