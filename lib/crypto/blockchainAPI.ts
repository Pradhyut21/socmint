/**
 * Real Blockchain API Integration
 * Traces cryptocurrency addresses across multiple blockchains
 */

export interface CryptoAddress {
  address: string;
  blockchain: 'bitcoin' | 'ethereum' | 'litecoin';
  balance: number;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  firstSeen?: string;
  lastSeen?: string;
}

export interface CryptoTransaction {
  hash: string;
  timestamp: string;
  amount: number;
  from: string[];
  to: string[];
  confirmations: number;
  fee?: number;
}

/**
 * Detect cryptocurrency type from address format
 */
export function detectCryptoType(address: string): 'bitcoin' | 'ethereum' | 'litecoin' | null {
  // Bitcoin: starts with 1, 3, or bc1
  if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
    return 'bitcoin';
  }
  
  // Ethereum: starts with 0x, 42 chars
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'ethereum';
  }
  
  // Litecoin: starts with L or M
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address)) {
    return 'litecoin';
  }
  
  return null;
}

/**
 * Get Bitcoin address details via Blockchain.info API (FREE)
 */
export async function getBitcoinAddress(address: string): Promise<CryptoAddress | null> {
  try {
    const response = await fetch(`https://blockchain.info/rawaddr/${address}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`[BITCOIN] API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    return {
      address,
      blockchain: 'bitcoin',
      balance: data.final_balance / 100000000, // Convert satoshis to BTC
      totalReceived: data.total_received / 100000000,
      totalSent: data.total_sent / 100000000,
      transactionCount: data.n_tx,
      firstSeen: data.txs && data.txs.length > 0 ? new Date(data.txs[data.txs.length - 1].time * 1000).toISOString() : undefined,
      lastSeen: data.txs && data.txs.length > 0 ? new Date(data.txs[0].time * 1000).toISOString() : undefined
    };
  } catch (error) {
    console.error('[BITCOIN] Error:', error);
    return null;
  }
}

/**
 * Get Ethereum address details via Etherscan API (FREE tier: 5 calls/sec)
 */
export async function getEthereumAddress(address: string): Promise<CryptoAddress | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'; // Free tier works without key
  
  try {
    // Get balance
    const balanceResponse = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
    );
    
    const balanceData = await balanceResponse.json();
    
    if (balanceData.status !== '1') {
      console.error(`[ETHEREUM] API error: ${balanceData.message}`);
      return null;
    }
    
    // Get transaction count
    const txCountResponse = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${apiKey}`
    );
    
    const txCountData = await txCountResponse.json();
    
    // Get first and last transaction (if any)
    const txListResponse = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${apiKey}`
    );
    
    const txListData = await txListResponse.json();
    
    const balance = parseFloat(balanceData.result) / 1e18; // Convert wei to ETH
    const txCount = parseInt(txCountData.result, 16);
    
    let firstSeen, lastSeen;
    if (txListData.status === '1' && txListData.result.length > 0) {
      firstSeen = new Date(parseInt(txListData.result[0].timeStamp) * 1000).toISOString();
      lastSeen = new Date(parseInt(txListData.result[txListData.result.length - 1].timeStamp) * 1000).toISOString();
    }
    
    return {
      address,
      blockchain: 'ethereum',
      balance,
      totalReceived: 0, // Etherscan doesn't provide this directly
      totalSent: 0,
      transactionCount: txCount,
      firstSeen,
      lastSeen
    };
  } catch (error) {
    console.error('[ETHEREUM] Error:', error);
    return null;
  }
}

/**
 * Get Litecoin address details via BlockCypher API (FREE tier: 200 req/hour)
 */
export async function getLitecoinAddress(address: string): Promise<CryptoAddress | null> {
  try {
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    
    if (!response.ok) {
      console.error(`[LITECOIN] API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    return {
      address,
      blockchain: 'litecoin',
      balance: data.balance / 100000000, // Convert to LTC
      totalReceived: data.total_received / 100000000,
      totalSent: data.total_sent / 100000000,
      transactionCount: data.n_tx,
      firstSeen: undefined, // BlockCypher doesn't provide this in balance endpoint
      lastSeen: undefined
    };
  } catch (error) {
    console.error('[LITECOIN] Error:', error);
    return null;
  }
}

/**
 * Main function: Trace any cryptocurrency address
 */
export async function traceCryptoAddress(address: string): Promise<CryptoAddress | null> {
  const type = detectCryptoType(address);
  
  if (!type) {
    console.log('[CRYPTO] Unknown address format');
    return null;
  }
  
  console.log(`[CRYPTO] Tracing ${type} address: ${address}`);
  
  switch (type) {
    case 'bitcoin':
      return getBitcoinAddress(address);
    case 'ethereum':
      return getEthereumAddress(address);
    case 'litecoin':
      return getLitecoinAddress(address);
    default:
      return null;
  }
}

/**
 * Get recent transactions for an address
 */
export async function getCryptoTransactions(
  address: string,
  limit: number = 10
): Promise<CryptoTransaction[]> {
  const type = detectCryptoType(address);
  
  if (!type) {
    return [];
  }
  
  try {
    if (type === 'bitcoin') {
      const response = await fetch(`https://blockchain.info/rawaddr/${address}?limit=${limit}`);
      const data = await response.json();
      
      return data.txs?.slice(0, limit).map((tx: any) => ({
        hash: tx.hash,
        timestamp: new Date(tx.time * 1000).toISOString(),
        amount: tx.out.reduce((sum: number, out: any) => sum + out.value, 0) / 100000000,
        from: tx.inputs.map((inp: any) => inp.prev_out?.addr).filter(Boolean),
        to: tx.out.map((out: any) => out.addr).filter(Boolean),
        confirmations: tx.block_height ? 1 : 0,
        fee: tx.fee / 100000000
      })) || [];
    }
    
    if (type === 'ethereum') {
      const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
      const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status !== '1') {
        return [];
      }
      
      return data.result?.map((tx: any) => ({
        hash: tx.hash,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        amount: parseFloat(tx.value) / 1e18,
        from: [tx.from],
        to: [tx.to],
        confirmations: parseInt(tx.confirmations),
        fee: (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18
      })) || [];
    }
    
    return [];
  } catch (error) {
    console.error('[CRYPTO] Error getting transactions:', error);
    return [];
  }
}

/**
 * Check if address is associated with known scams/sanctions
 * (Basic implementation - expand with real databases)
 */
export async function checkCryptoRisk(address: string): Promise<{
  isRisky: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
}> {
  // This is a simplified version - in production, integrate with:
  // - Chainalysis API
  // - Elliptic API
  // - OFAC sanctions list
  // - Known scam databases
  
  const type = detectCryptoType(address);
  if (!type) {
    return { isRisky: false, riskLevel: 'low', reasons: [] };
  }
  
  const addressInfo = await traceCryptoAddress(address);
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (addressInfo) {
    // High transaction count could indicate mixer/tumbler
    if (addressInfo.transactionCount > 1000) {
      reasons.push('High transaction volume (possible mixer/tumbler)');
      riskLevel = 'medium';
    }
    
    // Large balance
    if (addressInfo.balance > 10) {
      reasons.push(`Large balance: ${addressInfo.balance.toFixed(2)} ${type.toUpperCase()}`);
    }
    
    // Recent activity
    if (addressInfo.lastSeen) {
      const daysSinceActivity = (Date.now() - new Date(addressInfo.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 7) {
        reasons.push('Recent activity (within 7 days)');
      }
    }
  }
  
  return {
    isRisky: riskLevel !== 'low',
    riskLevel,
    reasons
  };
}
