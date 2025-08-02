import { RESOLVER } from '@stratix/core';
import { createHash, createHmac, randomBytes } from 'crypto';
import type { SignatureParams } from '../types/index.js';

/**
 * WPS API 签名工具类
 * 根据WPS开放平台签名算法实现
 */
export class SignatureService {
  static [RESOLVER] = {
    injector: (container: any) => {
      const config = container.resolve('config');
      const appId = config.appId;
      const appSecret = config.appSecret;
      return { appId, appSecret };
    }
  };

  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  /**
   * 生成签名参数
   */
  generateSignature(): SignatureParams {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    const signature = this.createSignature(timestamp, nonce);

    return {
      timestamp,
      nonce,
      signature
    };
  }

  /**
   * 生成随机数
   */
  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * 创建签名
   * 签名算法：HMAC-SHA256(appSecret, timestamp + nonce + appId)
   */
  private createSignature(timestamp: string, nonce: string): string {
    const stringToSign = timestamp + nonce + this.appId;
    return createHmac('sha256', this.appSecret)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * 验证签名
   */
  verifySignature(
    timestamp: string,
    nonce: string,
    signature: string
  ): boolean {
    const expectedSignature = this.createSignature(timestamp, nonce);
    return signature === expectedSignature;
  }

  /**
   * 生成MD5哈希
   */
  static md5(data: string): string {
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * 生成SHA1哈希
   */
  static sha1(data: string): string {
    return createHash('sha1').update(data).digest('hex');
  }

  /**
   * 生成SHA256哈希
   */
  static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * 生成HMAC-SHA256签名
   */
  static hmacSha256(key: string, data: string): string {
    return createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * URL编码
   */
  static urlEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * 对象转查询字符串
   */
  static objectToQueryString(obj: Record<string, any>): string {
    const params = new URLSearchParams();

    Object.keys(obj)
      .sort() // 按字母顺序排序
      .forEach((key) => {
        const value = obj[key];
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

    return params.toString();
  }

  /**
   * 生成请求签名（用于特殊场景）
   */
  generateRequestSignature(
    method: string,
    url: string,
    params?: Record<string, any>,
    body?: any
  ): SignatureParams {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();

    // 构建签名字符串
    let stringToSign = method.toUpperCase() + '\n';
    stringToSign += url + '\n';

    // 添加查询参数
    if (params) {
      stringToSign += SignatureService.objectToQueryString(params) + '\n';
    } else {
      stringToSign += '\n';
    }

    // 添加请求体
    if (body) {
      if (typeof body === 'string') {
        stringToSign += body;
      } else {
        stringToSign += JSON.stringify(body);
      }
    }

    stringToSign += '\n' + timestamp + '\n' + nonce;

    const signature = createHmac('sha256', this.appSecret)
      .update(stringToSign)
      .digest('hex');

    return {
      timestamp,
      nonce,
      signature
    };
  }

  /**
   * 生成文件上传签名
   */
  generateUploadSignature(
    fileName: string,
    fileSize: number,
    contentType: string
  ): SignatureParams {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();

    const stringToSign = [
      fileName,
      fileSize.toString(),
      contentType,
      timestamp,
      nonce,
      this.appId
    ].join('\n');

    const signature = createHmac('sha256', this.appSecret)
      .update(stringToSign)
      .digest('hex');

    return {
      timestamp,
      nonce,
      signature
    };
  }
}
