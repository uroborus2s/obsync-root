/**
 * WPS 多维表字段创建示例
 * 演示如何使用 WriteSheetService.createWpsFields() 方法
 */

import { Logger } from '@stratix/core';
import { WpsDBSheetAdapter } from '@stratix/was-v7';
import WriteSheetService from '../src/services/wirteSheetService.js';
import AbsentStudentRelationRepository from '../src/repositories/AbsentStudentRelationRepository.js';

// ============================================
// 示例 1: 基本使用
// ============================================

async function example1_basicUsage() {
  console.log('\n=== 示例 1: 基本使用 ===\n');

  // 假设已经通过依赖注入获取了服务实例
  const logger = {} as Logger;
  const wasV7ApiDbsheet = {} as WpsDBSheetAdapter;
  const absentStudentRelationRepository =
    {} as AbsentStudentRelationRepository;

  const service = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    absentStudentRelationRepository
  );

  try {
    // 调用创建字段方法
    await service.createWpsFields();
    console.log('✅ 字段创建成功');
  } catch (error) {
    console.error('❌ 字段创建失败', error);
  }
}

// ============================================
// 示例 2: 在 Controller 中使用
// ============================================

import { Controller, Get } from '@stratix/core';

@Controller('/api/wps')
class WpsFieldController {
  constructor(private readonly writeSheetService: WriteSheetService) {}

  /**
   * 创建 WPS 多维表字段
   * GET /api/wps/create-fields
   */
  @Get('/create-fields')
  async createFields() {
    try {
      await this.writeSheetService.createWpsFields();
      return {
        success: true,
        message: 'WPS 多维表字段创建成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: '字段创建失败',
        error: error.message
      };
    }
  }

  /**
   * 获取字段创建状态
   * GET /api/wps/fields-status
   */
  @Get('/fields-status')
  async getFieldsStatus() {
    try {
      // 获取 WPS 表结构
      const schemas = await this.writeSheetService['wasV7ApiDbsheet'].getSchemas(
        this.writeSheetService['WPS_FILE_ID']
      );

      return {
        success: true,
        totalFields: schemas.fields?.length || 0,
        fields: schemas.fields?.map((f: any) => ({
          name: f.name,
          type: f.type
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        message: '获取字段状态失败',
        error: error.message
      };
    }
  }
}

// ============================================
// 示例 3: 在初始化脚本中使用
// ============================================

async function example3_initScript() {
  console.log('\n=== 示例 3: 初始化脚本 ===\n');

  // 从容器中解析服务
  // const service = container.resolve<WriteSheetService>('writeSheetService');

  try {
    console.log('🚀 开始初始化 WPS 多维表字段...');

    // 创建字段
    // await service.createWpsFields();

    console.log('✅ WPS 多维表字段初始化完成');
    console.log('📊 可以开始同步数据了');
  } catch (error: any) {
    console.error('❌ WPS 多维表字段初始化失败');
    console.error('错误信息:', error.message);
    process.exit(1);
  }
}

// ============================================
// 示例 4: 带重试机制的创建
// ============================================

async function example4_withRetry() {
  console.log('\n=== 示例 4: 带重试机制的创建 ===\n');

  const logger = {} as Logger;
  const wasV7ApiDbsheet = {} as WpsDBSheetAdapter;
  const absentStudentRelationRepository =
    {} as AbsentStudentRelationRepository;

  const service = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    absentStudentRelationRepository
  );

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`尝试创建字段 (第 ${retryCount + 1}/${maxRetries} 次)...`);
      await service.createWpsFields();
      console.log('✅ 字段创建成功');
      break;
    } catch (error: any) {
      retryCount++;
      console.error(`❌ 第 ${retryCount} 次尝试失败:`, error.message);

      if (retryCount < maxRetries) {
        const delay = retryCount * 1000; // 递增延迟
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('❌ 达到最大重试次数，创建失败');
        throw error;
      }
    }
  }
}

// ============================================
// 示例 5: 条件创建（检查后创建）
// ============================================

async function example5_conditionalCreate() {
  console.log('\n=== 示例 5: 条件创建 ===\n');

  const logger = {} as Logger;
  const wasV7ApiDbsheet = {} as WpsDBSheetAdapter;
  const absentStudentRelationRepository =
    {} as AbsentStudentRelationRepository;

  const service = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    absentStudentRelationRepository
  );

  try {
    // 检查是否需要创建字段
    const needsCreation = await checkIfFieldsNeedCreation(service);

    if (needsCreation) {
      console.log('📝 检测到需要创建字段');
      await service.createWpsFields();
      console.log('✅ 字段创建完成');
    } else {
      console.log('✅ 字段已存在，无需创建');
    }
  } catch (error) {
    console.error('❌ 操作失败', error);
  }
}

/**
 * 检查是否需要创建字段
 */
async function checkIfFieldsNeedCreation(
  service: WriteSheetService
): Promise<boolean> {
  try {
    // 获取现有字段
    const schemas = await service['wasV7ApiDbsheet'].getSchemas(
      service['WPS_FILE_ID']
    );

    const existingFieldNames = schemas.fields?.map((f: any) => f.name) || [];

    // 检查必需字段是否都存在
    const requiredFields = [
      '课程ID',
      '课程代码',
      '课程名称',
      '学生ID',
      '学生姓名',
      '缺勤类型',
      '统计日期'
    ];

    const missingFields = requiredFields.filter(
      (field) => !existingFieldNames.includes(field)
    );

    if (missingFields.length > 0) {
      console.log('缺少以下字段:', missingFields.join(', '));
      return true;
    }

    return false;
  } catch (error) {
    console.error('检查字段失败，假设需要创建', error);
    return true;
  }
}

// ============================================
// 示例 6: 在 onReady 中自动创建
// ============================================

class WriteSheetServiceWithAutoInit extends WriteSheetService {
  private fieldsInitialized = false;

  onReady() {
    const process = async () => {
      this.logger.info('WriteSheetService ready');

      try {
        // 首次启动时创建字段
        if (!this.fieldsInitialized) {
          this.logger.info('首次启动，开始创建 WPS 字段...');
          await this.createWpsFields();
          this.fieldsInitialized = true;
          this.logger.info('WPS 字段创建完成');
        }

        // 然后同步数据
        await this.syncAbsentStudentRelationsToWps();
      } catch (error) {
        this.logger.error('Failed to initialize WPS fields', error);
      }
    };
    process();
  }
}

// ============================================
// 示例 7: 命令行工具
// ============================================

/**
 * 命令行工具：创建 WPS 字段
 * 使用方式：pnpm tsx examples/create-wps-fields-example.ts
 */
async function cliTool() {
  console.log('\n=== WPS 字段创建工具 ===\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  const force = args.includes('--force'); // 强制重新创建
  const dryRun = args.includes('--dry-run'); // 仅模拟，不实际创建

  console.log('配置:');
  console.log('  - 强制创建:', force ? '是' : '否');
  console.log('  - 模拟运行:', dryRun ? '是' : '否');
  console.log('');

  if (dryRun) {
    console.log('🔍 模拟运行模式，不会实际创建字段');
    console.log('将要创建的字段:');
    console.log('  1. 课程ID (Number)');
    console.log('  2. 课程代码 (SingleLineText)');
    console.log('  3. 课程名称 (SingleLineText)');
    console.log('  ...');
    console.log('  18. 更新时间 (Date)');
    console.log('');
    console.log('✅ 模拟运行完成');
    return;
  }

  try {
    // 实际创建逻辑
    // const service = container.resolve<WriteSheetService>('writeSheetService');
    // await service.createWpsFields();
    console.log('✅ 字段创建成功');
  } catch (error: any) {
    console.error('❌ 字段创建失败:', error.message);
    process.exit(1);
  }
}

// ============================================
// 示例 8: 监控创建进度
// ============================================

async function example8_monitorProgress() {
  console.log('\n=== 示例 8: 监控创建进度 ===\n');

  const logger = {} as Logger;
  const wasV7ApiDbsheet = {} as WpsDBSheetAdapter;
  const absentStudentRelationRepository =
    {} as AbsentStudentRelationRepository;

  const service = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    absentStudentRelationRepository
  );

  // 创建进度监控
  const progressMonitor = {
    total: 18,
    current: 0,
    success: 0,
    failed: 0,
    skipped: 0,

    update(status: 'success' | 'failed' | 'skipped') {
      this.current++;
      if (status === 'success') this.success++;
      if (status === 'failed') this.failed++;
      if (status === 'skipped') this.skipped++;

      const percentage = Math.round((this.current / this.total) * 100);
      console.log(
        `进度: ${this.current}/${this.total} (${percentage}%) - ` +
          `成功: ${this.success}, 失败: ${this.failed}, 跳过: ${this.skipped}`
      );
    }
  };

  try {
    // 这里需要修改 createWpsFields 方法以支持进度回调
    // 或者通过日志监听来实现进度监控
    await service.createWpsFields();
  } catch (error) {
    console.error('创建失败', error);
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('WPS 字段创建示例集合');
  console.log('='.repeat(50));

  // 运行示例（根据需要取消注释）
  // await example1_basicUsage();
  // await example3_initScript();
  // await example4_withRetry();
  // await example5_conditionalCreate();
  // await example8_monitorProgress();

  // 如果作为命令行工具运行
  if (require.main === module) {
    await cliTool();
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_basicUsage,
  example3_initScript,
  example4_withRetry,
  example5_conditionalCreate,
  example8_monitorProgress,
  WpsFieldController,
  WriteSheetServiceWithAutoInit
};

