# SIFIX Agent

AI-powered transaction security analyzer for Web3 wallets.

## Features

- **Transaction Simulation**: Simulates transactions before execution using viem
- **AI Risk Analysis**: GPT-4 powered risk assessment with detailed explanations
- **5-Tier Risk Scoring**: SAFE, LOW, MEDIUM, HIGH, CRITICAL
- **On-Chain Reporting**: Reports HIGH/CRITICAL threats to SifixReputation contract

## Installation

```bash
npm install @sifix/agent
# or
pnpm add @sifix/agent
```

## Usage

```typescript
import { SecurityAgent } from '@sifix/agent';

const agent = new SecurityAgent({
  rpcUrl: 'https://rpc-testnet.0g.ai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  contractAddress: '0x544a39149d5169E4e1bDf7F8492804224CB70152'
});

const result = await agent.analyzeTransaction({
  from: '0x...',
  to: '0x...',
  data: '0x...',
  value: '0x0'
});

console.log(result.riskLevel); // 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
console.log(result.explanation);
```

## Architecture

```
src/
├── core/
│   └── simulator.ts    # Transaction simulation engine
├── ai/
│   └── analyzer.ts     # GPT-4 risk analysis
└── index.ts            # SecurityAgent class
```

## Risk Levels

- **SAFE**: No risks detected
- **LOW**: Minor concerns, safe to proceed
- **MEDIUM**: Moderate risks, review recommended
- **HIGH**: Significant risks, caution advised (auto-reported)
- **CRITICAL**: Severe threats, block recommended (auto-reported)

## License

MIT
