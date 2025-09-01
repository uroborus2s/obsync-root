/**
 * WPS JSAPI签名算法测试脚本
 * 验证JSAPI签名计算的正确性
 */

import { createHash } from 'crypto';

/**
 * WPS JSAPI签名测试类
 */
class WPSJSAPISignatureTest {
  /**
   * 计算SHA1哈希值（十六进制）
   */
  private calculateSHA1(content: string): string {
    return createHash('sha1').update(content, 'utf8').digest('hex');
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成JSAPI签名
   */
  private generateJSAPISignature(
    jsapiTicket: string,
    nonceStr: string,
    timestamp: number,
    url: string
  ): string {
    const verifyStr = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    return this.calculateSHA1(verifyStr);
  }

  /**
   * 运行JSAPI签名测试
   */
  public runJSAPISignatureTest(): void {
    console.log('🧪 开始WPS JSAPI签名算法测试...\n');

    // 测试用例1: 使用文档中的示例数据
    console.log('📋 测试用例1: 文档示例验证');
    const testCase1 = {
      jsapiTicket: '617bf955832a4d4d80d9d8d85917a427',
      nonceStr: 'Y7a8KkqX041bsSwT',
      timestamp: 1510045655000,
      url: 'https://m.haiwainet.cn/ttc/3541093/2018/0509/content_31312407_1.html?a=b&c=d'
    };

    console.log('输入参数:');
    console.log(`jsapi_ticket: ${testCase1.jsapiTicket}`);
    console.log(`noncestr: ${testCase1.nonceStr}`);
    console.log(`timestamp: ${testCase1.timestamp}`);
    console.log(`url: ${testCase1.url}`);

    // 构造验证字符串
    const verifyStr1 = `jsapi_ticket=${testCase1.jsapiTicket}&noncestr=${testCase1.nonceStr}&timestamp=${testCase1.timestamp}&url=${testCase1.url}`;
    console.log(`\n验证字符串: ${verifyStr1}`);

    const signature1 = this.generateJSAPISignature(
      testCase1.jsapiTicket,
      testCase1.nonceStr,
      testCase1.timestamp,
      testCase1.url
    );

    console.log(`计算得到的签名: ${signature1}`);
    console.log(`文档中的预期签名: 63fba76a53eb48628727741ead44731f53465d563`);
    console.log(`✅ 签名${signature1 === '63fba76a53eb48628727741ead44731f53465d563' ? '匹配' : '不匹配'}\n`);

    // 测试用例2: 当前时间戳测试
    console.log('📋 测试用例2: 当前时间戳测试');
    const testCase2 = {
      jsapiTicket: 'sample_ticket_123456789',
      nonceStr: this.generateNonceStr(16),
      timestamp: Math.floor(Date.now() / 1000),
      url: 'https://example.com/test?param1=value1&param2=value2'
    };

    console.log('输入参数:');
    console.log(`jsapi_ticket: ${testCase2.jsapiTicket}`);
    console.log(`noncestr: ${testCase2.nonceStr}`);
    console.log(`timestamp: ${testCase2.timestamp}`);
    console.log(`url: ${testCase2.url}`);

    const verifyStr2 = `jsapi_ticket=${testCase2.jsapiTicket}&noncestr=${testCase2.nonceStr}&timestamp=${testCase2.timestamp}&url=${testCase2.url}`;
    console.log(`\n验证字符串: ${verifyStr2}`);

    const signature2 = this.generateJSAPISignature(
      testCase2.jsapiTicket,
      testCase2.nonceStr,
      testCase2.timestamp,
      testCase2.url
    );

    console.log(`计算得到的签名: ${signature2}`);
    console.log(`✅ 签名生成完成\n`);

    // 测试用例3: URL编码测试
    console.log('📋 测试用例3: URL编码测试');
    const testCase3 = {
      jsapiTicket: 'test_ticket',
      nonceStr: 'TestNonce123',
      timestamp: 1234567890,
      url: 'https://example.com/path?name=测试&value=123'
    };

    console.log('输入参数:');
    console.log(`jsapi_ticket: ${testCase3.jsapiTicket}`);
    console.log(`noncestr: ${testCase3.nonceStr}`);
    console.log(`timestamp: ${testCase3.timestamp}`);
    console.log(`url: ${testCase3.url}`);

    const signature3 = this.generateJSAPISignature(
      testCase3.jsapiTicket,
      testCase3.nonceStr,
      testCase3.timestamp,
      testCase3.url
    );

    console.log(`计算得到的签名: ${signature3}`);
    console.log(`✅ URL编码测试完成\n`);

    console.log('🎉 WPS JSAPI签名算法测试完成!');
  }

  /**
   * 生成完整的JSAPI配置示例
   */
  public generateJSAPIConfigExample(): void {
    console.log('\n📝 生成WPS JSAPI配置示例...\n');

    const appID = 'your_wps_app_id';
    const jsapiTicket = 'sample_jsapi_ticket_from_wps_api';
    const timeStamp = Math.floor(Date.now() / 1000);
    const nonceStr = this.generateNonceStr(16);
    const url = 'https://your-domain.com/current-page?param=value';

    const signature = this.generateJSAPISignature(jsapiTicket, nonceStr, timeStamp, url);

    const jsapiConfig = {
      appID,
      timeStamp,
      nonceStr,
      signature
    };

    console.log('🔧 WPS JSAPI配置对象:');
    console.log(JSON.stringify(jsapiConfig, null, 2));

    console.log('\n📋 前端使用示例:');
    console.log(`
// 在前端页面中使用WPS JSAPI
window.WPS.config({
  appID: '${jsapiConfig.appID}',
  timeStamp: ${jsapiConfig.timeStamp},
  nonceStr: '${jsapiConfig.nonceStr}',
  signature: '${jsapiConfig.signature}',
  jsApiList: [
    // 需要使用的JS接口列表
    'openDocument',
    'saveDocument',
    // ... 其他接口
  ]
});

window.WPS.ready(function() {
  console.log('WPS JSAPI初始化成功');
  // 在这里调用WPS JSAPI
});

window.WPS.error(function(res) {
  console.error('WPS JSAPI初始化失败:', res);
});
    `);

    console.log('\n🌐 API调用示例:');
    console.log(`
// 后端API调用示例
const response = await fetch('/api/wps/jsapi-config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: window.location.href
  })
});

const jsapiConfig = await response.json();

// 使用返回的配置初始化WPS JSAPI
window.WPS.config(jsapiConfig);
    `);
  }

  /**
   * 验证签名算法的关键步骤
   */
  public validateSignatureSteps(): void {
    console.log('\n🔍 验证签名算法关键步骤...\n');

    const params = {
      jsapiTicket: 'test_ticket_123',
      nonceStr: 'RandomStr456',
      timestamp: 1609459200, // 2021-01-01 00:00:00
      url: 'https://example.com/test'
    };

    console.log('📋 步骤1: 参数准备');
    console.log(`jsapi_ticket: ${params.jsapiTicket}`);
    console.log(`noncestr: ${params.nonceStr}`);
    console.log(`timestamp: ${params.timestamp}`);
    console.log(`url: ${params.url}`);

    console.log('\n📋 步骤2: 构造验证字符串');
    const verifyStr = `jsapi_ticket=${params.jsapiTicket}&noncestr=${params.nonceStr}&timestamp=${params.timestamp}&url=${params.url}`;
    console.log(`验证字符串: ${verifyStr}`);

    console.log('\n📋 步骤3: SHA1签名');
    const signature = this.calculateSHA1(verifyStr);
    console.log(`SHA1签名结果: ${signature}`);

    console.log('\n📋 步骤4: 最终配置');
    const finalConfig = {
      appID: 'your_app_id',
      timeStamp: params.timestamp,
      nonceStr: params.nonceStr,
      signature
    };
    console.log(JSON.stringify(finalConfig, null, 2));

    console.log('\n✅ 签名算法验证完成!');
  }
}

// 运行测试
if (require.main === module) {
  const test = new WPSJSAPISignatureTest();
  test.runJSAPISignatureTest();
  test.generateJSAPIConfigExample();
  test.validateSignatureSteps();
}

export default WPSJSAPISignatureTest;
