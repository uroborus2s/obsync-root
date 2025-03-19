/**
 * 产品模型示例
 * 展示如何使用 SourceTrackableModel
 */

import { BaseModel } from '../base-model.js';
import { SourceTrackableModel, SyncStatus } from '../source-trackable-model.js';

/**
 * 产品模型
 */
export class Product extends SourceTrackableModel {
  /**
   * 表名
   */
  static tableName = 'products';

  /**
   * 字段定义
   */
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string' },
    description: { type: 'text', nullable: true },
    price: { type: 'decimal', precision: 10, scale: 2 },
    sku: { type: 'string', unique: true },
    category: { type: 'string', nullable: true },
    stock: { type: 'integer', default: 0 },
    is_active: { type: 'boolean', default: true },

    // 源跟踪字段
    source: { type: 'string' },
    source_id: { type: 'string' },
    source_updated_at: { type: 'datetime' },
    source_data: { type: 'text' },
    sync_status: { type: 'string', defaultTo: SyncStatus.PENDING }
  };

  /**
   * 关系定义
   */
  static relations = {
    // 示例关系
    variants: {
      type: 'hasMany',
      model: 'ProductVariant',
      foreignKey: 'product_id'
    }
  };

  /**
   * 模型钩子
   */
  static hooks = {
    // 同步前处理数据
    beforeSync: (sourceData: any, source: string, model: BaseModel | null) => {
      console.log(`准备同步产品: ${sourceData.name || sourceData.title}`);

      // 可以在这里对源数据进行预处理
      if (sourceData.variants && Array.isArray(sourceData.variants)) {
        // 处理变体数据
        sourceData.variants_count = sourceData.variants.length;
      }

      return sourceData;
    },

    // 同步后处理
    afterSync: async (model: BaseModel, sourceData: any, source: string) => {
      console.log(`产品同步完成: ${model.getAttribute('name')}`);

      // 可以在这里处理关联数据
      if (sourceData.variants && Array.isArray(sourceData.variants)) {
        // 这里可以同步产品变体
        // 示例代码，实际实现需要根据项目需求调整
        // await ProductVariant.syncBatchFromSource(
        //   sourceData.variants.map((v: any) => ({
        //     ...v,
        //     product_id: model.getPrimaryKeyValue()
        //   })),
        //   source
        // );
      }
    },

    // 同步错误处理
    onSyncError: (error: Error, sourceData: any, source: string) => {
      console.error(`产品同步失败: ${sourceData.name || sourceData.title}`);
      console.error(`错误信息: ${error.message}`);

      // 可以在这里记录错误日志或发送通知
    }
  };

  /**
   * 转换源数据为模型数据
   * @param sourceData 源数据
   * @param existingModel 现有模型（如果存在）
   * @returns 转换后的模型数据
   */
  static transformSourceData(
    sourceData: any,
    existingModel: BaseModel | null = null
  ): Record<string, any> {
    // 从源数据中提取需要的字段
    return {
      name: sourceData.name || sourceData.title,
      description: sourceData.description || sourceData.body_html,
      price: sourceData.price || 0,
      sku: sourceData.sku || sourceData.code,
      category: sourceData.category || sourceData.product_type,
      stock: sourceData.stock || sourceData.inventory_quantity || 0,
      is_active:
        sourceData.is_active !== undefined ? sourceData.is_active : true
    };
  }

  /**
   * 获取产品价格（格式化）
   * @returns 格式化的价格字符串
   */
  public getFormattedPrice(): string {
    const price = this.getAttribute('price');
    return `¥${parseFloat(price).toFixed(2)}`;
  }

  /**
   * 检查产品是否有库存
   * @returns 是否有库存
   */
  public hasStock(): boolean {
    return this.getAttribute('stock') > 0;
  }

  /**
   * 更新库存
   * @param quantity 数量变化（正数增加，负数减少）
   * @returns 是否成功
   */
  public async updateStock(quantity: number): Promise<boolean> {
    const currentStock = this.getAttribute('stock');
    const newStock = Math.max(0, currentStock + quantity);

    this.setAttribute('stock', newStock);
    return this.save();
  }
}
