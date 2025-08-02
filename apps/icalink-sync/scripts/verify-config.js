#!/usr/bin/env tsx
// 配置验证工具脚本
// 用于验证环境配置是否正确
import { loadEnvironment, EnvironmentLoader } from '../src/config/environment.js';
import createConfigWithEnvironment from '../src/stratix.config.js';
/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
🔍 Stratix 配置验证工具

用法：
  tsx scripts/verify-config.ts [选项]

选项：
  --help, -h          显示帮助信息
  --env <env>         指定环境 (development|production)
  --verbose, -v       显示详细信息
  --check-files       检查相关文件是否存在

示例：
  # 验证当前环境配置
  tsx scripts/verify-config.ts

  # 验证生产环境配置
  tsx scripts/verify-config.ts --env production

  # 显示详细信息
  tsx scripts/verify-config.ts --verbose

环境变量：
  NODE_ENV                    环境类型 (development|production)
  STRATIX_SENSITIVE_CONFIG    加密的敏感配置信息
  STRATIX_ENCRYPTION_KEY      加密密钥
  `);
}
/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        env: undefined,
        verbose: false,
        help: false,
        checkFiles: false
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--help':
            case '-h':
                result.help = true;
                break;
            case '--env':
                result.env = args[++i];
                break;
            case '--verbose':
            case '-v':
                result.verbose = true;
                break;
            case '--check-files':
                result.checkFiles = true;
                break;
            default:
                if (arg.startsWith('-')) {
                    console.error(`❌ 未知选项: ${arg}`);
                    process.exit(1);
                }
                break;
        }
    }
    return result;
}
/**
 * 检查文件是否存在
 */
function checkFiles() {
    console.log('📁 检查相关文件...');
    const files = [
        'prod.env.json',
        'src/config/environment.ts',
        'src/stratix.config.ts',
        'scripts/generate-encrypted-config.ts'
    ];
    const fs = require('fs');
    const path = require('path');
    for (const file of files) {
        const exists = fs.existsSync(path.resolve(process.cwd(), file));
        console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    }
    console.log('');
}
/**
 * 验证环境变量
 */
function checkEnvironmentVariables(verbose) {
    console.log('🌍 检查环境变量...');
    const envVars = [
        { name: 'NODE_ENV', required: false, current: process.env.NODE_ENV },
        { name: 'STRATIX_SENSITIVE_CONFIG', required: false, current: process.env.STRATIX_SENSITIVE_CONFIG },
        { name: 'STRATIX_ENCRYPTION_KEY', required: false, current: process.env.STRATIX_ENCRYPTION_KEY }
    ];
    for (const envVar of envVars) {
        const status = envVar.current ? '✅' : '⚠️';
        const value = envVar.current
            ? (verbose ? envVar.current : `${envVar.current.substring(0, 20)}...`)
            : '未设置';
        console.log(`   ${status} ${envVar.name}: ${value}`);
    }
    console.log('');
}
/**
 * 验证配置加载
 */
async function verifyConfigLoading(verbose) {
    console.log('⚙️ 验证配置加载...');
    try {
        // 1. 验证环境配置加载
        console.log('   🔧 加载环境配置...');
        const sensitiveConfig = loadEnvironment();
        console.log('   ✅ 环境配置加载成功');
        if (verbose) {
            console.log('   📋 配置概览:');
            console.log(`      - Web端口: ${sensitiveConfig.web?.port || '未设置'}`);
            console.log(`      - Web主机: ${sensitiveConfig.web?.host || '未设置'}`);
            console.log(`      - 日志级别: ${sensitiveConfig.logger?.loglevle || '未设置'}`);
            console.log(`      - 数据库: ${Object.keys(sensitiveConfig.databases || {}).join(', ') || '未设置'}`);
            console.log(`      - WAS V7 AppId: ${sensitiveConfig.wasV7?.appId ? '已配置' : '未配置'}`);
            console.log(`      - ICA Link API: ${sensitiveConfig.icalink_api?.appUrl ? '已配置' : '未配置'}`);
        }
        // 2. 验证 Stratix 配置创建
        console.log('   🔧 创建 Stratix 配置...');
        const stratixConfig = createConfigWithEnvironment(sensitiveConfig);
        console.log('   ✅ Stratix 配置创建成功');
        if (verbose) {
            console.log('   📋 Stratix 配置概览:');
            console.log(`      - 服务器端口: ${stratixConfig.server?.port || '未设置'}`);
            console.log(`      - 服务器主机: ${stratixConfig.server?.host || '未设置'}`);
            console.log(`      - 日志级别: ${stratixConfig.logger?.level || '未设置'}`);
            console.log(`      - 插件数量: ${stratixConfig.plugins?.length || 0}`);
            console.log(`      - 自动加载: ${stratixConfig.autoLoad ? '已启用' : '未启用'}`);
        }
        // 3. 验证配置结构
        console.log('   🔍 验证配置结构...');
        const isValid = EnvironmentLoader.validateConfig(sensitiveConfig);
        if (isValid) {
            console.log('   ✅ 配置结构验证通过');
            return true;
        }
        else {
            console.log('   ❌ 配置结构验证失败');
            return false;
        }
    }
    catch (error) {
        console.log('   ❌ 配置加载失败');
        console.error(`      错误: ${error instanceof Error ? error.message : error}`);
        return false;
    }
}
/**
 * 验证数据库连接配置
 */
function verifyDatabaseConfig(sensitiveConfig, verbose) {
    console.log('🗄️ 验证数据库配置...');
    try {
        const databases = sensitiveConfig.databases;
        if (!databases) {
            console.log('   ❌ 数据库配置缺失');
            return false;
        }
        const dbNames = Object.keys(databases);
        console.log(`   📊 发现 ${dbNames.length} 个数据库配置: ${dbNames.join(', ')}`);
        for (const dbName of dbNames) {
            const db = databases[dbName];
            const requiredFields = ['host', 'port', 'user', 'database'];
            const missingFields = requiredFields.filter(field => !db[field]);
            if (missingFields.length > 0) {
                console.log(`   ❌ 数据库 ${dbName} 缺少字段: ${missingFields.join(', ')}`);
                return false;
            }
            console.log(`   ✅ 数据库 ${dbName} 配置完整`);
            if (verbose) {
                console.log(`      - 主机: ${db.host}:${db.port}`);
                console.log(`      - 数据库: ${db.database}`);
                console.log(`      - 用户: ${db.user}`);
                console.log(`      - 密码: ${db.password ? '已设置' : '未设置'}`);
            }
        }
        return true;
    }
    catch (error) {
        console.log('   ❌ 数据库配置验证失败');
        console.error(`      错误: ${error instanceof Error ? error.message : error}`);
        return false;
    }
}
/**
 * 主函数
 */
async function main() {
    try {
        const options = parseArgs();
        if (options.help) {
            showHelp();
            return;
        }
        // 设置环境
        if (options.env) {
            process.env.NODE_ENV = options.env;
            console.log(`🌍 设置环境: ${options.env}`);
        }
        console.log('🔍 Stratix 配置验证工具');
        console.log('='.repeat(40));
        console.log(`📊 当前环境: ${process.env.NODE_ENV || 'development'}`);
        console.log('');
        // 检查文件
        if (options.checkFiles) {
            checkFiles();
        }
        // 检查环境变量
        checkEnvironmentVariables(options.verbose);
        // 验证配置加载
        const configValid = await verifyConfigLoading(options.verbose);
        if (!configValid) {
            console.log('❌ 配置验证失败');
            process.exit(1);
        }
        // 验证数据库配置
        const sensitiveConfig = loadEnvironment();
        const dbValid = verifyDatabaseConfig(sensitiveConfig, options.verbose);
        if (!dbValid) {
            console.log('❌ 数据库配置验证失败');
            process.exit(1);
        }
        console.log('');
        console.log('🎉 所有配置验证通过！');
        console.log('');
        console.log('💡 下一步:');
        console.log('   1. 启动应用: npm start 或 tsx src/index.ts');
        console.log('   2. 检查日志确认所有服务正常启动');
        console.log('   3. 访问健康检查端点验证服务状态');
    }
    catch (error) {
        console.error('❌ 配置验证失败:', error);
        process.exit(1);
    }
}
// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=verify-config.js.map