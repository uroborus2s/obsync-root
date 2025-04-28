import {
  CacheSerializer,
  MessagePackSerializerOptions
} from '../types/serializer.js';

// 工具函数代替@stratix/utils
const type = {
  isUndefined: (value: any): boolean => typeof value === 'undefined'
};

// 延迟导入msgpackr（可选依赖）
let msgpackr: any = null;

/**
 * 初始化msgpackr
 * @returns msgpackr实例
 */
async function getMsgpackr() {
  if (!msgpackr) {
    try {
      // 动态导入msgpackr
      const msgpackrModule = await import('msgpackr');
      // ES模块直接使用导入的模块，无需.default
      msgpackr = msgpackrModule;
    } catch (error) {
      throw new Error(
        '使用MessagePack序列化器需要安装msgpackr依赖: npm install msgpackr'
      );
    }
  }
  return msgpackr;
}

/**
 * MessagePack序列化器
 * 使用msgpackr进行高性能的二进制序列化
 */
export class MessagePackSerializer implements CacheSerializer {
  private readonly options: MessagePackSerializerOptions;
  private encoder: any;
  private decoder: any;
  private initialized: boolean = false;

  /**
   * 创建MessagePack序列化器实例
   * @param options 序列化选项
   */
  constructor(options: MessagePackSerializerOptions = {}) {
    this.options = options;
    this.initSerializer();
  }

  /**
   * 初始化序列化器
   */
  private async initSerializer(): Promise<void> {
    const msgpackr = await getMsgpackr();
    this.encoder = new msgpackr.Encoder(this.options);
    this.decoder = new msgpackr.Decoder(this.options);
    this.initialized = true;
  }

  /**
   * 确保序列化器已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initSerializer();
    }
  }

  /**
   * 序列化数据为MessagePack格式
   * @param data 要序列化的数据
   * @returns 序列化后的Buffer
   */
  async serialize<T>(data: T): Promise<Buffer> {
    await this.ensureInitialized();

    try {
      // 处理undefined值（MessagePack支持undefined）
      if (type.isUndefined(data)) {
        return this.encoder.encode({ _type: 'undefined' });
      }

      // 序列化数据
      return this.encoder.encode(data);
    } catch (error) {
      throw new Error(`MessagePack序列化失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从MessagePack格式反序列化数据
   * @param data MessagePack Buffer或字符串
   * @returns 反序列化后的数据
   */
  async deserialize<T>(data: string | Buffer): Promise<T> {
    await this.ensureInitialized();

    try {
      // 确保数据是Buffer
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;

      // 反序列化数据
      const parsed = this.decoder.decode(buffer);

      // 处理特殊类型标记
      if (parsed && typeof parsed === 'object' && '_type' in parsed) {
        if (parsed._type === 'undefined') {
          return undefined as unknown as T;
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`MessagePack反序列化失败: ${(error as Error).message}`);
    }
  }
}
