import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { createClient } from 'redis';

export class WalletStrategy {
  constructor(private redis: ReturnType<typeof createClient>) {}

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = uuid();
    await this.redis.setEx(`nonce:${nonce}`, 300, JSON.stringify({
      walletAddress: walletAddress.toLowerCase(),
      createdAt: new Date().toISOString(),
    }));
    return nonce;
  }

  async verifySignature(
    nonce: string,
    signature: string,
    claimedAddress: string,
  ): Promise<boolean> {
    const nonceData = await this.redis.get(`nonce:${nonce}`);
    if (!nonceData) return false;

    const { walletAddress } = JSON.parse(nonceData);
    if (walletAddress !== claimedAddress.toLowerCase()) return false;

    const message = `Sign this message to log in to SSO Hub.\nNonce: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    if (isValid) {
      await this.redis.del(`nonce:${nonce}`);
    }
    return isValid;
  }
}
