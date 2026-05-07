import { ZgFile, Indexer } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface StorageConfig {
  rpcUrl: string;
  indexerUrl: string;
  privateKey?: string;
}

export interface TransactionAnalysisData {
  from: string;
  to: string;
  value?: string;
  data?: string;
  riskScore: number;
  riskLevel: string;
  recommendation: string;
  reasoning: string;
  threats: string[];
  confidence: number;
  timestamp: string;
  simulationSuccess: boolean;
  gasUsed?: string;
}

/**
 * 0G Storage client for storing transaction analysis results
 */
export class StorageClient {
  private indexer: Indexer;
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private config: StorageConfig;
  private mockMode: boolean;

  constructor(config: StorageConfig & { mockMode?: boolean }) {
    this.config = config;
    this.mockMode = config.mockMode || false;
    
    // Use working RPC endpoint
    const workingRpcUrl = config.rpcUrl.includes('evmrpc-testnet-turbo') 
      ? 'https://evmrpc-testnet.0g.ai' 
      : config.rpcUrl;
    
    this.provider = new ethers.JsonRpcProvider(workingRpcUrl);
    this.indexer = new Indexer(config.indexerUrl);
    
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    }

    if (this.mockMode) {
      console.log('[Storage] Running in MOCK mode - no actual uploads to 0G Storage');
    } else {
      console.log(`[Storage] Using RPC: ${workingRpcUrl}`);
      console.log(`[Storage] Using Indexer: ${config.indexerUrl}`);
    }
  }

  /**
   * Store transaction analysis on 0G Storage
   * Returns root hash for later retrieval
   */
  async storeAnalysis(analysis: TransactionAnalysisData): Promise<string> {
    // MOCK MODE: Generate deterministic hash without actual upload
    // Used when 0G Storage network is unstable or for development
    if (this.mockMode) {
      const jsonData = JSON.stringify(analysis, null, 2);
      const hash = ethers.keccak256(ethers.toUtf8Bytes(jsonData));
      console.log(`[Storage] MOCK MODE: Generated deterministic hash ${hash}`);
      console.log(`[Storage] Note: No actual upload to 0G Storage (mockMode enabled)`);
      console.log(`[Storage] In production, this would be stored on-chain with proof`);
      return hash;
    }

    // Production mode requires wallet
    if (!this.wallet) {
      throw new Error('Private key required for storage operations');
    }

    // Convert analysis to JSON buffer
    const jsonData = Buffer.from(JSON.stringify(analysis, null, 2));
    const filename = `analysis-${analysis.from}-${Date.now()}.json`;

    // Write to temp file (SDK requires file path)
    const tempPath = path.join(os.tmpdir(), `0g-sifix-${Date.now()}-${filename}`);
    fs.writeFileSync(tempPath, jsonData);

    const file = await ZgFile.fromFilePath(tempPath);
    
    try {
      // Generate Merkle tree
      const [tree, treeErr] = await file.merkleTree();
      if (treeErr) {
        throw new Error(`Merkle tree generation failed: ${treeErr}`);
      }

      const rootHash = tree!.rootHash();
      console.log(`[Storage] Generated root hash: ${rootHash}`);

      // Upload to 0G Storage with retry logic
      const workingRpcUrl = this.config.rpcUrl.includes('evmrpc-testnet-turbo') 
        ? 'https://evmrpc-testnet.0g.ai' 
        : this.config.rpcUrl;
      
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[Storage] Upload attempt ${attempt}/${maxRetries}...`);
        
        const [tx, uploadErr] = await this.indexer.upload(
          file,
          workingRpcUrl,
          this.wallet
        );
        
        if (!uploadErr) {
          console.log(`[Storage] Upload complete. Tx: ${tx}`);
          return rootHash;
        }
        
        lastError = uploadErr;
        console.warn(`[Storage] Attempt ${attempt} failed: ${uploadErr.message}`);
        
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s backoff
          console.log(`[Storage] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError?.message}`);
    } finally {
      await file.close();
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Retrieve transaction analysis from 0G Storage
   */
  async retrieveAnalysis(rootHash: string): Promise<TransactionAnalysisData | null> {
    try {
      // Download to temp file
      const tempPath = path.join(os.tmpdir(), `0g-download-${Date.now()}.json`);
      
      const err = await this.indexer.download(rootHash, tempPath, false);
      
      if (err) {
        console.error(`[Storage] Download failed:`, err);
        return null;
      }

      // Read and parse JSON data
      const jsonStr = fs.readFileSync(tempPath, 'utf-8');
      const data = JSON.parse(jsonStr) as TransactionAnalysisData;
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      
      return data;
    } catch (error) {
      console.error(`[Storage] Retrieval error:`, error);
      return null;
    }
  }

  /**
   * Check if wallet has sufficient balance for storage operations
   */
  async checkBalance(): Promise<bigint> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }
    return await this.provider.getBalance(this.wallet.address);
  }
}
