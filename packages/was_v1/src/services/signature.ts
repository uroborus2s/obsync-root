import { createHash } from '@stratix/utils/crypto/index.js';
import { formatRFC1123 } from '@stratix/utils/time/index.js';

/**
 * 生成WPS3签名
 * @param appKey 应用密钥
 * @param contentMd5 内容MD5值，GET请求使用URI的MD5，POST请求使用Body的MD5
 * @param url 不带域名的URL，包含URI和查询参数
 * @param contentType Content-Type，一般为'application/json'
 * @param date RFC1123格式的日期
 * @returns 签名字符串
 */
export function generateWPS3Signature(
  appKey: string,
  contentMd5: string,
  url: string,
  contentType: string,
  date: string
): string {
  // 按照WPS3签名规则拼接字符串
  const signString = appKey + contentMd5 + url + contentType + date;

  // 使用SHA1算法计算签名
  const signature = createHash('sha1').update(signString).digest('hex');

  return signature;
}

/**
 * 生成WPS3 X-Auth头
 * @param appId 应用ID
 * @param signature 签名字符串
 * @returns X-Auth头值
 */
export function generateWPS3Auth(appId: string, signature: string): string {
  return `WPS-3:${appId}:${signature}`;
}

/**
 * 计算内容MD5
 * @param data 请求数据
 * @returns MD5哈希值（十六进制）
 */
export function calculateContentMd5(data: any): string {
  // 当HTTP请求有body数据时计算body的MD5，否则计算空字符串的MD5
  const content = data ? JSON.stringify(data) : '';
  return createHash('md5').update(content).digest('hex');
}

/**
 * 生成WPS3请求头
 * @param appId 应用ID
 * @param appKey 应用密钥
 * @param method HTTP方法
 * @param url 请求URL（不带域名）
 * @param data 请求数据
 * @returns 包含WPS3签名的请求头
 */
export function generateWPS3Headers(
  appId: string,
  appKey: string,
  method: string,
  url: string,
  data?: any
): Record<string, string> {
  // 设置Content-Type
  const contentType = 'application/json';

  // 生成RFC1123格式的日期
  const date = formatRFC1123(new Date());

  // 计算Content-MD5
  const contentMd5 = calculateContentMd5(data);

  // 生成签名
  const signature = generateWPS3Signature(
    appKey,
    contentMd5,
    url,
    contentType,
    date
  );

  // 生成X-Auth头
  const xAuth = generateWPS3Auth(appId, signature);

  // 返回完整请求头
  return {
    'Content-Type': contentType,
    'Content-Md5': contentMd5,
    Date: date,
    'X-Auth': xAuth
  };
}
