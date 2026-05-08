import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk';

export interface ComputeConfig {
  rpcUrl: string;
  privateKey: string;
  providerAddress: string;
  ledgerCa?: string;
  inferenceCa?: string;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 0G Compute client for decentralized AI inference
 * Wraps the 0G Compute TS SDK broker for use in SIFIX agent
 */
export class ComputeClient {
  private config: ComputeConfig;
  private broker: any = null;
  private endpoint: string = '';
  private model: string = '';
  private initialized: boolean = false;

  constructor(config: ComputeConfig) {
    this.config = config;
    console.log('[Compute] Initialized with provider:', config.providerAddress);
  }

  /**
   * Initialize broker, acknowledge provider, fetch service metadata
   * Must be called before first inference request
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    const wallet = new ethers.Wallet(this.config.privateKey, provider);

    console.log('[Compute] Creating broker...');
    this.broker = await createZGComputeNetworkBroker(
      wallet,
      this.config.ledgerCa,
      this.config.inferenceCa
    );

    // Acknowledge provider signer (required before first use)
    console.log('[Compute] Acknowledging provider signer...');
    await this.broker.inference.acknowledgeProviderSigner(this.config.providerAddress);

    // Get service metadata (endpoint + model name)
    const meta = await this.broker.inference.getServiceMetadata(this.config.providerAddress);
    this.endpoint = meta.endpoint;
    this.model = meta.model;

    console.log(`[Compute] Service ready — model: ${this.model}, endpoint: ${this.endpoint}`);
    this.initialized = true;
  }

  /**
   * Send a chat completion request through 0G Compute
   * OpenAI-compatible /chat/completions endpoint
   */
  async chatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    response_format?: { type: string };
    temperature?: number;
    max_tokens?: number;
  }): Promise<ChatCompletionResponse> {
    await this.init();

    // Build request body
    const body: Record<string, any> = {
      model: this.model,
      messages: params.messages,
    };

    if (params.response_format) {
      body.response_format = params.response_format;
    }
    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }
    if (params.max_tokens !== undefined) {
      body.max_tokens = params.max_tokens;
    }

    // Get authenticated headers from broker
    const requestContent = params.messages.map((m) => m.content).join('\n');
    const headers = await this.broker.inference.getRequestHeaders(
      this.config.providerAddress,
      requestContent
    );

    // Make the request
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`0G Compute inference failed (${response.status}): ${errorText}`);
    }

    const result = await response.json() as any;
    const choice = result.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: result.model || this.model,
      usage: result.usage
        ? {
            prompt_tokens: result.usage.prompt_tokens || 0,
            completion_tokens: result.usage.completion_tokens || 0,
            total_tokens: result.usage.total_tokens || 0,
          }
        : undefined,
    };
  }

  /**
   * List available AI services on 0G Compute network
   */
  async listServices(): Promise<any[]> {
    await this.init();
    return await this.broker.inference.listService();
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get provider endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
