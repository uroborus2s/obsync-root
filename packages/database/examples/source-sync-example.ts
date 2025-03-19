/**
 * SourceTrackableModel 使用示例
 * 展示如何使用 SourceTrackableModel 同步外部数据源
 */

import knex from 'knex';
import { DatabaseManager } from '../src/lib/database-manager.js';
import { ModelRegistry } from '../src/lib/model-registry.js';
import { Product } from '../src/models/examples/product-model.js';
import { SyncStatus } from '../src/models/source-trackable-model.js';

/**
 * 初始化数据库
 */
async function initDatabase() {
  // 创建 Knex 实例
  const knexInstance = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true
  });

  // 创建数据库管理器
  const dbManager = new DatabaseManager();
  dbManager.registerConnection('default', { client: knexInstance } as any);

  // 设置数据库管理器
  Product.setDatabaseManager(dbManager);

  // 注册模型
  ModelRegistry.register(Product);

  // 创建表
  await knexInstance.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.decimal('price', 10, 2).defaultTo(0);
    table.string('sku').unique();
    table.string('category').nullable();
    table.integer('stock').defaultTo(0);
    table.boolean('is_active').defaultTo(true);

    // 源跟踪字段
    table.string('source').notNullable();
    table.string('source_id').notNullable();
    table.datetime('source_updated_at').notNullable();
    table.text('source_data').notNullable();
    table.string('sync_status').defaultTo(SyncStatus.PENDING);

    // 时间戳
    table.timestamps(true, true);

    // 索引
    table.index(['source', 'source_id']);
  });

  console.log('数据库初始化完成');
  return knexInstance;
}

/**
 * 模拟外部 API 获取产品数据
 */
async function fetchProductsFromAPI(): Promise<any[]> {
  // 模拟 API 响应
  return [
    {
      id: 'ext-001',
      title: '智能手机',
      body_html: '最新款智能手机，搭载高性能处理器',
      price: 4999.0,
      code: 'SP-001',
      product_type: '电子产品',
      inventory_quantity: 100,
      variants: [
        { id: 'v-001', title: '黑色', price: 4999.0 },
        { id: 'v-002', title: '白色', price: 4999.0 }
      ],
      updated_at: new Date()
    },
    {
      id: 'ext-002',
      title: '无线耳机',
      body_html: '高音质无线蓝牙耳机，续航持久',
      price: 999.0,
      code: 'SP-002',
      product_type: '配件',
      inventory_quantity: 200,
      variants: [
        { id: 'v-003', title: '标准版', price: 999.0 },
        { id: 'v-004', title: '豪华版', price: 1299.0 }
      ],
      updated_at: new Date()
    }
  ];
}

/**
 * 同步产品数据
 */
async function syncProducts() {
  try {
    console.log('开始同步产品数据...');

    // 从 API 获取产品数据
    const productsData = await fetchProductsFromAPI();
    console.log(`获取到 ${productsData.length} 个产品`);

    // 批量同步产品
    const products = await Product.syncBatchFromSource(
      productsData,
      'external-shop'
    );
    console.log(`成功同步 ${products.length} 个产品`);

    // 显示同步结果
    for (const product of products) {
      console.log(
        `- ${product.getAttribute('name')} (${product.getAttribute('sku')}): ¥${product.getAttribute('price')}`
      );
      console.log(
        `  库存: ${product.getAttribute('stock')} | 状态: ${product.getAttribute('sync_status')}`
      );
    }

    // 查找特定产品并更新
    const smartphone = await Product.findBy({ sku: 'SP-001' });
    if (smartphone) {
      console.log('\n更新产品库存...');
      await smartphone.updateStock(-10);
      console.log(
        `${smartphone.getAttribute('name')} 当前库存: ${smartphone.getAttribute('stock')}`
      );
    }

    // 查找所有产品
    console.log('\n所有产品:');
    const allProducts = await Product.all();
    for (const p of allProducts) {
      console.log(`- ${p.getAttribute('name')} (${p.getFormattedPrice()})`);
    }
  } catch (error) {
    console.error('同步产品时出错:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  let knexInstance;

  try {
    // 初始化数据库
    knexInstance = await initDatabase();

    // 同步产品
    await syncProducts();
  } catch (error) {
    console.error('程序执行出错:', error);
  } finally {
    // 关闭数据库连接
    if (knexInstance) {
      await knexInstance.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行示例
main();
