/**
 * 模型注册表
 * 用于管理模型的注册和查找
 */

import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * 模型注册表类，管理模型的注册和检索
 */
export class ModelRegistry {
  /**
   * 已注册模型的映射
   */
  private static models: Map<string, any> = new Map();

  /**
   * 注册一个模型类
   * @param modelClass 要注册的模型类
   */
  public static register(modelClass: any): void {
    const modelName = modelClass.name;

    // 确保模型有tableName属性
    if (!modelClass.tableName) {
      modelClass.tableName = this.toTableName(modelName);
    }

    this.models.set(modelName, modelClass);
  }

  /**
   * 根据名称获取模型类
   * @param name 模型名称
   * @returns 模型类
   * @throws 如果模型未注册
   */
  public static getModel(name: string): any {
    const modelClass = this.models.get(name);

    if (!modelClass) {
      throw new Error(`Model [${name}] is not registered.`);
    }

    return modelClass;
  }

  /**
   * 检查模型是否已注册
   * @param name 模型名称
   * @returns 是否已注册
   */
  public static hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * 获取所有已注册的模型名称
   * @returns 模型名称数组
   */
  public static getModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * 获取所有已注册的模型
   * @returns 模型类的映射
   */
  public static getAllModels(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, model] of this.models.entries()) {
      result[name] = model;
    }

    return result;
  }

  /**
   * 从目录自动注册模型
   * @param directory 模型目录路径
   * @param baseClassName 基类名，用于过滤模型
   */
  public static async autoRegisterFromDirectory(
    directory: string,
    baseClassName?: string
  ): Promise<void> {
    try {
      // 检查目录是否存在
      if (!fs.existsSync(directory)) {
        throw new Error(`Directory [${directory}] does not exist.`);
      }

      // 查找所有模型文件
      const files = await glob('**/*.{ts,js}', { cwd: directory });

      for (const file of files) {
        try {
          const filePath = path.resolve(directory, file);

          // 导入模型模块
          const module = await import(`file://${filePath}`);

          // 遍历模块导出
          for (const key in module) {
            const exportedItem = module[key];

            // 检查是否为类并且是模型
            if (
              typeof exportedItem === 'function' &&
              exportedItem.prototype &&
              (!baseClassName || this.inheritsFrom(exportedItem, baseClassName))
            ) {
              this.register(exportedItem);
            }
          }
        } catch (error) {
          console.error(`Error loading model from file [${file}]:`, error);
        }
      }
    } catch (error) {
      console.error(
        `Error auto-registering models from directory [${directory}]:`,
        error
      );
      throw error;
    }
  }

  /**
   * 检查一个类是否继承自特定名称的类
   * @param childClass 子类
   * @param baseClassName 基类名称
   * @returns 是否继承关系
   */
  private static inheritsFrom(childClass: any, baseClassName: string): boolean {
    let prototype = Object.getPrototypeOf(childClass);

    while (prototype) {
      if (prototype.name === baseClassName) {
        return true;
      }
      prototype = Object.getPrototypeOf(prototype);
    }

    return false;
  }

  /**
   * 将类名转换为表名（小写蛇形命名法）
   * @param className 类名
   * @returns 表名
   */
  private static toTableName(className: string): string {
    return className.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  /**
   * 清除所有已注册的模型
   */
  public static clearAll(): void {
    this.models.clear();
  }
}
