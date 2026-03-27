import { AwilixContainer, RESOLVER } from '@stratix/core';
import { createHash, createHmac } from 'crypto';
import type { SignatureParams } from '../types/index.js';

/**
 * WPS API 签名工具类
 * 根据WPS开放平台签名算法实现
 */
export class SignatureService {
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
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
   * 生成KSO-1签名
   * @param method HTTP方法
   * @param requestUri 请求URI（包含query参数）
   * @param contentType 内容类型
   * @param ksoDate RFC1123格式的日期
   * @param requestBody 请求体
   */
  private generateKso1Signature(
    method: string,
    requestUri: string,
    contentType: string,
    ksoDate: string,
    requestBody: string
  ): string {
    // 计算请求体的SHA256哈希
    const bodyHash = this.calculateSha256Hash(requestBody);

    // 构建签名字符串：KSO-1 + Method + RequestURI + ContentType + KsoDate + sha256(RequestBody)
    const signatureString =
      'KSO-1' + method + requestUri + contentType + ksoDate + bodyHash;

    // 使用HMAC-SHA256生成签名
    const signature = createHmac('sha256', this.appSecret)
      .update(signatureString)
      .digest('hex');

    // 构建完整的Authorization头值：KSO-1 accessKey:signature
    return `KSO-1 ${this.appId}:${signature}`;
  }

  /**
   * 计算字符串的SHA256哈希
   * 参考Java实现：当requestBody为null或空时，直接返回空字符串，不计算哈希
   */
  private calculateSha256Hash(data: string): string {
    // 如果请求体为空或null，直接返回空字符串（与Java实现保持一致）
    if (!data || data.length === 0) {
      return '';
    }
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * 创建签名（保留旧方法以兼容）
   * 签名算法：HMAC-SHA256(appSecret, timestamp + nonce + appId)
   */
  private createSignature(timestamp: string, nonce: string): string {
    const stringToSign = timestamp + nonce + this.appId;
    return createHmac('sha256', this.appSecret)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * 生成请求签名（支持完整的HTTP请求参数）
   * @param method HTTP方法
   * @param url 完整URL或路径
   * @param contentType 内容类型
   * @param requestBody 请求体
   */
  generateRequestSignature(
    method: string,
    url: string,
    contentType: string = 'application/json',
    requestBody: string = ''
  ): SignatureParams {
    // 生成RFC1123格式的时间戳
    const ksoDate = new Date().toUTCString();

    // 解析URL获取路径和查询参数
    let requestUri = url;
    try {
      const urlObj = new URL(url, 'https://example.com');
      requestUri = urlObj.pathname + urlObj.search;
    } catch {
      // 如果URL解析失败，直接使用原始URL
      requestUri = url;
    }

    // 构建KSO-1签名
    const signature = this.generateKso1Signature(
      method,
      requestUri,
      contentType,
      ksoDate,
      requestBody
    );

    return {
      timestamp: ksoDate,
      signature: signature
    };
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
}
