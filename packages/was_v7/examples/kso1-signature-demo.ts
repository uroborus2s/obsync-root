/**
 * KSO-1 签名机制演示示例
 * 展示如何使用新的KSO-1签名规则
 */

import { SignatureService } from '../src/services/signatureService.js';

// 模拟配置
const appId = 'demo-app-id';
const appSecret = 'demo-app-secret';

async function demonstrateKso1Signature() {
  console.log('🚀 KSO-1 签名机制演示\n');

  // 创建签名服务实例
  const signatureService = new SignatureService(appId, appSecret);

  // 1. 基本GET请求签名
  console.log('1. 基本GET请求签名:');
  console.log('================================');
  
  const getSignature = signatureService.generateSignature();
  console.log('GET 签名结果:');
  console.log(`  时间戳 (RFC1123): ${getSignature.timestamp}`);
  console.log(`  随机数: ${getSignature.nonce}`);
  console.log(`  签名: ${getSignature.signature}`);
  console.log();

  // 2. 带参数的POST请求签名
  console.log('2. 带参数的POST请求签名:');
  console.log('================================');
  
  const requestBody = JSON.stringify({
    name: 'Test User',
    email: 'test@example.com'
  });
  
  const postSignature = signatureService.generateRequestSignature(
    'POST',
    '/v7/contacts/users?page_size=10&page_token=abc123',
    'application/json',
    requestBody
  );
  
  console.log('POST 签名结果:');
  console.log(`  时间戳 (RFC1123): ${postSignature.timestamp}`);
  console.log(`  随机数: ${postSignature.nonce}`);
  console.log(`  签名: ${postSignature.signature}`);
  console.log();

  // 3. 解析签名组成部分
  console.log('3. 签名组成部分分析:');
  console.log('================================');
  
  // 手动构建签名字符串来展示过程
  const method = 'POST';
  const requestUri = '/v7/contacts/users?page_size=10&page_token=abc123';
  const contentType = 'application/json';
  const ksoDate = postSignature.timestamp;
  const bodyHash = require('crypto').createHash('sha256').update(requestBody, 'utf8').digest('hex');
  
  const signatureString = 'KSO-1' + method + requestUri + contentType + ksoDate + bodyHash;
  
  console.log('签名字符串组成:');
  console.log(`  版本: KSO-1`);
  console.log(`  方法: ${method}`);
  console.log(`  URI: ${requestUri}`);
  console.log(`  内容类型: ${contentType}`);
  console.log(`  时间戳: ${ksoDate}`);
  console.log(`  请求体哈希: ${bodyHash}`);
  console.log(`  完整签名字符串: ${signatureString}`);
  console.log();

  // 4. 验证Authorization头格式
  console.log('4. Authorization头格式验证:');
  console.log('================================');
  
  const authHeader = postSignature.signature;
  console.log(`Authorization: ${authHeader}`);
  
  // 解析Authorization头
  const authMatch = authHeader.match(/^KSO-1 (.+):(.+)$/);
  if (authMatch) {
    console.log('解析结果:');
    console.log(`  版本: KSO-1`);
    console.log(`  AccessKey: ${authMatch[1]}`);
    console.log(`  Signature: ${authMatch[2]}`);
  }
  console.log();

  // 5. 不同请求方法的签名对比
  console.log('5. 不同请求方法的签名对比:');
  console.log('================================');
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const url = '/v7/contacts/users';
  
  methods.forEach(method => {
    const signature = signatureService.generateRequestSignature(method, url);
    console.log(`${method.padEnd(6)}: ${signature.signature.split(':')[1].substring(0, 16)}...`);
  });
  console.log();

  // 6. 空请求体和非空请求体的哈希对比
  console.log('6. 请求体哈希对比:');
  console.log('================================');
  
  const emptyBodySignature = signatureService.generateRequestSignature('POST', '/test', 'application/json', '');
  const nonEmptyBodySignature = signatureService.generateRequestSignature('POST', '/test', 'application/json', '{"test": "data"}');
  
  console.log('空请求体签名:', emptyBodySignature.signature.split(':')[1].substring(0, 16) + '...');
  console.log('非空请求体签名:', nonEmptyBodySignature.signature.split(':')[1].substring(0, 16) + '...');
  console.log();

  // 7. 性能测试
  console.log('7. 性能测试:');
  console.log('================================');
  
  const iterations = 1000;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    signatureService.generateRequestSignature('POST', '/test', 'application/json', '{"test": "data"}');
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`生成 ${iterations} 个签名耗时: ${totalTime}ms`);
  console.log(`平均每个签名耗时: ${avgTime.toFixed(2)}ms`);
  console.log();

  console.log('✅ KSO-1 签名演示完成！');
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateKso1Signature().catch(console.error);
}

export { demonstrateKso1Signature };
