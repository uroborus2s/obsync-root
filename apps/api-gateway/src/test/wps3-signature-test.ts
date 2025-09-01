/**
 * WPS-3签名算法测试脚本
 * 用于验证WPS-3签名实现的正确性
 */

import { createHash } from 'crypto';

/**
 * 测试用的WPS-3签名实现
 */
class WPS3SignatureTest {
  /**
   * 生成RFC1123格式的日期字符串
   */
  private generateRFC1123Date(): string {
    return new Date().toUTCString();
  }

  /**
   * 计算字符串的MD5哈希值（十六进制）
   */
  private calculateMD5(content: string): string {
    return createHash('md5').update(content, 'utf8').digest('hex');
  }

  /**
   * 计算SHA1哈希值（十六进制）
   */
  private calculateSHA1(content: string): string {
    return createHash('sha1').update(content, 'utf8').digest('hex');
  }

  /**
   * 生成WPS-3签名
   */
  private generateWPS3Signature(
    secretKey: string,
    contentMd5: string,
    url: string,
    contentType: string,
    date: string
  ): string {
    const signString =
      secretKey.toLowerCase() + contentMd5 + url + contentType + date;
    return this.calculateSHA1(signString);
  }

  /**
   * 生成WPS-3认证头
   */
  private generateWPS3AuthHeader(appId: string, signature: string): string {
    return `WPS-3:${appId}:${signature}`;
  }

  /**
   * 运行测试用例
   */
  public runTests(): void {
    console.log('🧪 开始WPS-3签名算法测试...\n');

    // 测试1: MD5计算
    console.log('📋 测试1: MD5计算');
    const emptyStringMd5 = this.calculateMD5('');
    console.log(`空字符串MD5: ${emptyStringMd5}`);
    console.log(`预期值: d41d8cd98f00b204e9800998ecf8427e`);
    console.log(
      `✅ 测试${emptyStringMd5 === 'd41d8cd98f00b204e9800998ecf8427e' ? '通过' : '失败'}\n`
    );

    // 测试2: SHA1计算
    console.log('📋 测试2: SHA1计算');
    const testSha1 = this.calculateSHA1('test');
    console.log(`"test"的SHA1: ${testSha1}`);
    console.log(`预期值: a94a8fe5ccb19ba61c4c0873d391e987982fbbd3`);
    console.log(
      `✅ 测试${testSha1 === 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3' ? '通过' : '失败'}\n`
    );

    // 测试3: RFC1123日期格式
    console.log('📋 测试3: RFC1123日期格式');
    const date = this.generateRFC1123Date();
    console.log(`生成的日期: ${date}`);
    console.log(`格式示例: Wed, 23 Jan 2013 06:43:08 GMT`);
    const dateRegex =
      /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/;
    console.log(`✅ 格式${dateRegex.test(date) ? '正确' : '错误'}\n`);

    // 测试4: 完整签名流程
    console.log('📋 测试4: 完整WPS-3签名流程');
    const testParams = {
      appId: 'test_app_id',
      secretKey: 'TEST_SECRET_KEY',
      url: '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token',
      contentType: 'application/json',
      date: 'Wed, 23 Jan 2013 06:43:08 GMT',
      requestBody: ''
    };

    const contentMd5 = this.calculateMD5(testParams.requestBody);
    console.log(`Content-MD5: ${contentMd5}`);

    const signature = this.generateWPS3Signature(
      testParams.secretKey,
      contentMd5,
      testParams.url,
      testParams.contentType,
      testParams.date
    );
    console.log(`生成的签名: ${signature}`);

    const authHeader = this.generateWPS3AuthHeader(testParams.appId, signature);
    console.log(`X-Auth头: ${authHeader}`);

    // 验证签名字符串构造
    const expectedSignString =
      testParams.secretKey.toLowerCase() +
      contentMd5 +
      testParams.url +
      testParams.contentType +
      testParams.date;

    console.log(`\n🔍 签名字符串详情:`);
    console.log(`SecretKey (小写): ${testParams.secretKey.toLowerCase()}`);
    console.log(`Content-MD5: ${contentMd5}`);
    console.log(`URL: ${testParams.url}`);
    console.log(`Content-Type: ${testParams.contentType}`);
    console.log(`Date: ${testParams.date}`);
    console.log(`\n完整签名字符串: ${expectedSignString}`);
    console.log(`SHA1结果: ${signature}`);
    console.log(`✅ 签名生成完成\n`);

    // 测试5: 验证签名格式
    console.log('📋 测试5: 验证X-Auth头格式');
    const authHeaderRegex = /^WPS-3:[^:]+:[a-f0-9]{40}$/;
    console.log(`X-Auth头: ${authHeader}`);
    console.log(`格式正则: ^WPS-3:[^:]+:[a-f0-9]{40}$`);
    console.log(
      `✅ 格式${authHeaderRegex.test(authHeader) ? '正确' : '错误'}\n`
    );

    console.log('🎉 WPS-3签名算法测试完成!');
  }

  /**
   * 生成实际请求的完整示例
   */
  public generateRequestExample(): void {
    console.log('\n📝 生成实际请求示例...\n');

    const appId = 'your_app_id';
    const secretKey = 'your_secret_key';
    const contentType = 'application/json';
    const date = this.generateRFC1123Date();
    const requestBody = '';
    const contentMd5 = this.calculateMD5(requestBody);

    // 1. getServerAccessToken 示例
    console.log('🔑 1. getServerAccessToken 请求示例:');
    const tokenUrl = '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token';
    const tokenSignature = this.generateWPS3Signature(
      secretKey,
      contentMd5,
      tokenUrl,
      contentType,
      date
    );
    const tokenAuthHeader = this.generateWPS3AuthHeader(appId, tokenSignature);

    console.log(`GET ${tokenUrl} HTTP/1.1`);
    console.log(`Host: openapi.wps.cn`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Date: ${date}`);
    console.log(`Content-Md5: ${contentMd5}`);
    console.log(`X-Auth: ${tokenAuthHeader}`);
    console.log(`User-Agent: Stratix-Gateway/1.0.0\n`);

    // 2. getJSAPITicket 示例
    console.log('🎫 2. getJSAPITicket 请求示例:');
    const ticketUrl =
      '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_ticket?jsapi_token=sample_access_token';
    const ticketSignature = this.generateWPS3Signature(
      secretKey,
      contentMd5,
      ticketUrl,
      contentType,
      date
    );
    const ticketAuthHeader = this.generateWPS3AuthHeader(
      appId,
      ticketSignature
    );

    console.log(`GET ${ticketUrl} HTTP/1.1`);
    console.log(`Host: openapi.wps.cn`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Date: ${date}`);
    console.log(`Content-Md5: ${contentMd5}`);
    console.log(`X-Auth: ${ticketAuthHeader}`);
    console.log(`User-Agent: Stratix-Gateway/1.0.0\n`);

    console.log('📋 JavaScript fetch示例:');
    console.log(`
// 1. 获取服务端访问令牌
const tokenResponse = await fetch('https://openapi.wps.cn${tokenUrl}', {
  method: 'GET',
  headers: {
    'Content-Type': '${contentType}',
    'Date': '${date}',
    'Content-Md5': '${contentMd5}',
    'X-Auth': '${tokenAuthHeader}',
    'User-Agent': 'Stratix-Gateway/1.0.0'
  }
});

// 2. 获取JS-API调用凭证
const ticketResponse = await fetch('https://openapi.wps.cn${ticketUrl}', {
  method: 'GET',
  headers: {
    'Content-Type': '${contentType}',
    'Date': '${date}',
    'Content-Md5': '${contentMd5}',
    'X-Auth': '${ticketAuthHeader}',
    'User-Agent': 'Stratix-Gateway/1.0.0'
  }
});
    `);
  }
}

// 运行测试
if (require.main === module) {
  const test = new WPS3SignatureTest();
  test.runTests();
  test.generateRequestExample();
}

export default WPS3SignatureTest;
