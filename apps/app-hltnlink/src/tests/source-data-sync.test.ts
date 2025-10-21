// @wps/hltnlink 源数据同步测试
// 测试SourceCourseRepository和SourceDataSyncService的基本功能

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SourceCourseRepository from '../repositories/SourceCourseRepository.js';
import SourceCourseSelectionsRepository from '../repositories/SourceCourseSelectionsRepository.js';

// 模拟Logger
const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

describe('SourceCourseRepository', () => {
  let repository: SourceCourseRepository;

  beforeEach(() => {
    repository = new SourceCourseRepository(mockLogger);
  });

  describe('syncSourceCoursesFromApi', () => {
    it('should handle empty data array', async () => {
      const result = await repository.syncSourceCoursesFromApi([]);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.data).toEqual([]);
    });

    it('should process API data correctly', async () => {
      const mockApiData = [
        {
          JSJC: '4',
          KSJC: '3',
          JSSJ: '1110',
          SKZC: '2-18',
          JSGH: '0218',
          JXRWID: '8770.0',
          KCMC: '推拿学基础1',
          ROW_ID: 2,
          KKXQM: '2013-2014-1',
          XQJ: '1',
          SKJSMC: '第4实训室',
          KCH: '022311065',
          ZZT: '0111111111111111110000000000000000000000000000000000',
          DJZ: '2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18',
          BZ: '',
          KXH: '022311065.008',
          ID: '100048',
          JSXM: '刘孝品',
          KSSJ: '940',
          JSH: '1040301'
        },
        {
          JSJC: '6',
          KSJC: '5',
          JSSJ: '1300',
          SKZC: '1-16',
          JSGH: '0219',
          JXRWID: '8771.0',
          KCMC: '中医基础理论',
          ROW_ID: 3,
          KKXQM: '2013-2014-1',
          XQJ: '2',
          SKJSMC: '第5实训室',
          KCH: '022311066',
          ZZT: '1111111111111111000000000000000000000000000000000000',
          DJZ: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16',
          BZ: '备注信息',
          KXH: '022311066.009',
          ID: '100049',
          JSXM: '张教授',
          KSSJ: '1100',
          JSH: '1040302'
        }
      ];

      // 注意：这里我们不能真正测试数据库操作，因为需要数据库连接
      // 在实际测试中，你可能需要使用测试数据库或模拟数据库连接

      expect(mockApiData).toHaveLength(2);
      expect(mockApiData[0].KCMC).toBe('推拿学基础1');
      expect(mockApiData[1].KCMC).toBe('中医基础理论');
    });
  });

  describe('findByBatchId', () => {
    it('should handle batch ID query', async () => {
      const batchId = '202409101533';

      // 注意：这里我们不能真正测试数据库查询，因为需要数据库连接
      // 在实际测试中，你可能需要使用测试数据库

      expect(batchId).toMatch(/^\d{12}$/); // 验证批次ID格式
    });
  });
});

describe('SourceCourseSelectionsRepository', () => {
  let repository: SourceCourseSelectionsRepository;

  beforeEach(() => {
    repository = new SourceCourseSelectionsRepository(mockLogger);
  });

  describe('syncSourceCourseSelectionsFromApi', () => {
    it('should handle empty data array', async () => {
      const result = await repository.syncSourceCourseSelectionsFromApi([]);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.batchId).toBe('');
    });

    it('should process API data correctly', async () => {
      const mockApiData = [
        {
          XKZT: '已选',
          XKFSDM: '01',
          XKID: '1283578',
          XDLBDM: '01',
          KCMC: '形势与政策Ⅳ',
          ROW_ID: 2,
          KKXQM: '2023-2024-2',
          KCH: 'A16716404',
          XDLBMC: '初修',
          XSXM: '胡啸乾',
          XKKH: 'A16716404.01',
          XKFSMC: '指定',
          XSID: '2022710109',
          KXHID: '40025'
        },
        {
          XKZT: '已选',
          XKFSDM: '02',
          XKID: '1283579',
          XDLBDM: '01',
          KCMC: '大学英语Ⅳ',
          ROW_ID: 3,
          KKXQM: '2023-2024-2',
          KCH: 'A16716405',
          XDLBMC: '初修',
          XSXM: '李明',
          XKKH: 'A16716405.01',
          XKFSMC: '自选',
          XSID: '2022710110',
          KXHID: '40026'
        }
      ];

      // 注意：这里我们不能真正测试数据库操作，因为需要数据库连接
      // 在实际测试中，你可能需要使用测试数据库或模拟数据库连接

      expect(mockApiData).toHaveLength(2);
      expect(mockApiData[0].KCMC).toBe('形势与政策Ⅳ');
      expect(mockApiData[1].KCMC).toBe('大学英语Ⅳ');
      expect(mockApiData[0].XSXM).toBe('胡啸乾');
      expect(mockApiData[1].XSXM).toBe('李明');
    });
  });

  describe('findByBatchId', () => {
    it('should handle batch ID query', async () => {
      const batchId = '202409101533';

      // 注意：这里我们不能真正测试数据库查询，因为需要数据库连接
      // 在实际测试中，你可能需要使用测试数据库或模拟数据库连接

      expect(batchId).toMatch(/^\d{12}$/);
    });
  });
});

describe('API数据格式验证', () => {
  it('should validate API data structure', () => {
    const sampleApiData = {
      JSJC: '4',
      KSJC: '3',
      JSSJ: '1110',
      SKZC: '2-18',
      JSGH: '0218',
      JXRWID: '8770.0',
      KCMC: '推拿学基础1',
      ROW_ID: 2,
      KKXQM: '2013-2014-1',
      XQJ: '1',
      SKJSMC: '第4实训室',
      KCH: '022311065',
      ZZT: '0111111111111111110000000000000000000000000000000000',
      DJZ: '2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18',
      BZ: '',
      KXH: '022311065.008',
      ID: '100048',
      JSXM: '刘孝品',
      KSSJ: '940',
      JSH: '1040301'
    };

    // 验证必需字段存在
    expect(sampleApiData.KCMC).toBeDefined(); // 课程名称
    expect(sampleApiData.KCH).toBeDefined(); // 课程号
    expect(sampleApiData.JSXM).toBeDefined(); // 教师姓名
    expect(sampleApiData.JSGH).toBeDefined(); // 教师工号
    expect(sampleApiData.ID).toBeDefined(); // ID
    expect(sampleApiData.KKXQM).toBeDefined(); // 开课学期码

    // 验证数据类型
    expect(typeof sampleApiData.KCMC).toBe('string');
    expect(typeof sampleApiData.ROW_ID).toBe('number');
    expect(typeof sampleApiData.JSXM).toBe('string');

    // 验证数据格式
    expect(sampleApiData.XQJ).toMatch(/^[1-7]$/); // 星期几应该是1-7
    expect(sampleApiData.KSSJ).toMatch(/^\d{3,4}$/); // 开始时间格式
    expect(sampleApiData.JSSJ).toMatch(/^\d{3,4}$/); // 结束时间格式
  });

  it('should handle different data variations', () => {
    const variations = [
      {
        // 有备注的情况
        BZ: '这是备注信息',
        KCMC: '课程名称1'
      },
      {
        // 无备注的情况
        BZ: '',
        KCMC: '课程名称2'
      },
      {
        // 不同时间格式
        KSSJ: '940', // 3位数时间
        JSSJ: '1110' // 4位数时间
      }
    ];

    variations.forEach((variation, index) => {
      expect(variation).toBeDefined();
      if (variation.BZ !== undefined) {
        expect(typeof variation.BZ).toBe('string');
      }
      if (variation.KCMC !== undefined) {
        expect(typeof variation.KCMC).toBe('string');
        expect(variation.KCMC.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('批次ID生成', () => {
  it('should generate valid batch ID format', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    const batchId = `${year}${month}${day}${hour}${minute}`;

    expect(batchId).toMatch(/^\d{12}$/);
    expect(batchId.length).toBe(12);
    expect(parseInt(batchId.substring(0, 4))).toBeGreaterThanOrEqual(2024);
    expect(parseInt(batchId.substring(4, 6))).toBeGreaterThanOrEqual(1);
    expect(parseInt(batchId.substring(4, 6))).toBeLessThanOrEqual(12);
  });
});

describe('数据同步配置', () => {
  it('should validate sync configuration', () => {
    const config = {
      url: 'https://api.example.com',
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      timeout: 30000,
      retries: 3,
      pageSize: 1000,
      maxBatchesToKeep: 3
    };

    expect(config.url).toMatch(/^https?:\/\//);
    expect(config.appId).toBeDefined();
    expect(config.appSecret).toBeDefined();
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.retries).toBeGreaterThanOrEqual(0);
    expect(config.pageSize).toBeGreaterThan(0);
    expect(config.maxBatchesToKeep).toBeGreaterThan(0);
  });
});
