import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { createClient } from 'redis';

interface SiweMessage {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  statement?: string;
}

export class WalletStrategy {
  private domain: string;

  constructor(
    private redis: ReturnType<typeof createClient>,
    ssoBaseUrl: string,
  ) {
    // 从 SSO_BASE_URL 提取域名，解析失败时回退
    try {
      this.domain = new URL(ssoBaseUrl).hostname;
    } catch {
      this.domain = 'localhost';
    }
  }

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = uuid();
    await this.redis.setEx(`nonce:${nonce}`, 300, JSON.stringify({
      walletAddress: walletAddress.toLowerCase(),
      createdAt: new Date().toISOString(),
    }));
    return nonce;
  }

  /** 构建 EIP-4361 标准签名消息 */
  buildSiweMessage(params: {
    address: string;
    chainId: number;
    nonce: string;
    issuedAt: string;
  }): string {
    return [
      `${this.domain} wants you to sign in with your Ethereum account:`,
      params.address,
      '',
      'Sign in to SSO Hub.',
      '',
      `URI: https://${this.domain}`,
      `Version: 1`,
      `Chain ID: ${params.chainId}`,
      `Nonce: ${params.nonce}`,
      `Issued At: ${params.issuedAt}`,
    ].join('\n');
  }

  /** 解析 EIP-4361 消息字段 */
  private parseSiwe(message: string): Partial<SiweMessage> {
    const result: Partial<SiweMessage> = {};
    const lines = message.split('\n');

    for (const line of lines) {
      if (line.startsWith('URI: ')) result.uri = line.slice(5).trim();
      else if (line.startsWith('Version: ')) result.version = line.slice(9).trim();
      else if (line.startsWith('Chain ID: ')) result.chainId = parseInt(line.slice(10).trim(), 10);
      else if (line.startsWith('Nonce: ')) result.nonce = line.slice(7).trim();
      else if (line.startsWith('Issued At: ')) result.issuedAt = line.slice(11).trim();
      else if (lines[0]?.includes('wants you to sign in')) {
        result.domain = lines[0].split(' ')[0];
        // 第二行是地址
        if (lines.length > 1 && lines[1].startsWith('0x')) {
          result.address = lines[1];
        }
      }
    }
    return result;
  }

  async verifySignature(
    message: string,
    signature: string,
    claimedAddress: string,
  ): Promise<{ valid: boolean; error?: string }> {
    const parsed = this.parseSiwe(message);

    // 1. 域名校验
    if (parsed.domain && parsed.domain !== this.domain) {
      return { valid: false, error: `Domain mismatch: expected ${this.domain}, got ${parsed.domain}` };
    }

    // 2. Nonce 校验
    if (!parsed.nonce) {
      return { valid: false, error: 'Missing nonce in SIWE message' };
    }

    const nonceData = await this.redis.get(`nonce:${parsed.nonce}`);
    if (!nonceData) {
      return { valid: false, error: 'Nonce expired or not found' };
    }

    const { walletAddress } = JSON.parse(nonceData);
    if (walletAddress !== claimedAddress.toLowerCase()) {
      return { valid: false, error: 'Address mismatch' };
    }

    // 3. 时效校验（5 分钟内）
    if (parsed.issuedAt) {
      const issuedMs = Date.parse(parsed.issuedAt);
      if (isNaN(issuedMs) || Date.now() - issuedMs > 5 * 60 * 1000) {
        return { valid: false, error: 'Signature expired (must be within 5 minutes)' };
      }
    }

    // 4. 签名验签
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    // 5. 消费 nonce（防重放）
    await this.redis.del(`nonce:${parsed.nonce}`);

    return { valid: true };
  }
}
