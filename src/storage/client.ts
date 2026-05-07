import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
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

  constructor(config: StorageConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.indexer = new Indexer(config.indexerUrl);
    
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Store transaction analysis on 0G Storage
   * Returns root hash for later retrieval
   */
  async storeAnalysis(analysis: TransactionAnalysisData): Promise<string> {
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

      // Upload to 0G Storage
      const [tx, uploadErr] = await this.indexer.upload(
        file,
        this.config.rpcUrl,
        this.wallet
      );
      
      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr.message}`);
      }

      console.log(`[Storage] Upload complete. Tx: ${tx}`);
      return rootHash;
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
