/**
 * 并发事务支持测试
 * 验证多个事务可以同时运行而不会相互干扰
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Transaction } from 'kysely';
import { transactionContextManager, getCurrentTransaction, getCurrentTransactionId } from '../utils/transaction-context.js';

// Mock Transaction 工厂
const createMockTransaction = (id: string) => ({
  id,
  selectFrom: vi.fn().mockReturnThis(),
  insertInto: vi.fn().mockReturnThis(),
  updateTable: vi.fn().mockReturnThis(),
  deleteFrom: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  executeTakeFirst: vi.fn(),
  executeTakeFirstOrThrow: vi.fn()
}) as unknown as Transaction<any>;

describe('并发事务支持测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AsyncLocalStorage 并发隔离', () => {
    it('多个并发事务应该完全隔离', async () => {
      const transaction1 = createMockTransaction('trx1');
      const transaction2 = createMockTransaction('trx2');
      const transaction3 = createMockTransaction('trx3');

      const results: Array<{ transactionId: string; currentTransaction: any }> = [];

      // 模拟三个并发事务
      const promises = [
        transactionContextManager.runInTransaction(transaction1, async () => {
          // 模拟一些异步操作
          await new Promise(resolve => setTimeout(resolve, 10));
          
          const currentTrx = getCurrentTransaction();
          const trxId = getCurrentTransactionId();
          
          results.push({
            transactionId: trxId || 'unknown',
            currentTransaction: currentTrx
          });
          
          // 验证当前事务是正确的
          expect(currentTrx).toBe(transaction1);
          return 'result1';
        }),

        transactionContextManager.runInTransaction(transaction2, async () => {
          // 模拟不同的延迟
          await new Promise(resolve => setTimeout(resolve, 5));
          
          const currentTrx = getCurrentTransaction();
          const trxId = getCurrentTransactionId();
          
          results.push({
            transactionId: trxId || 'unknown',
            currentTransaction: currentTrx
          });
          
          // 验证当前事务是正确的
          expect(currentTrx).toBe(transaction2);
          return 'result2';
        }),

        transactionContextManager.runInTransaction(transaction3, async () => {
          // 模拟更长的延迟
          await new Promise(resolve => setTimeout(resolve, 15));
          
          const currentTrx = getCurrentTransaction();
          const trxId = getCurrentTransactionId();
          
          results.push({
            transactionId: trxId || 'unknown',
            currentTransaction: currentTrx
          });
          
          // 验证当前事务是正确的
          expect(currentTrx).toBe(transaction3);
          return 'result3';
        })
      ];

      // 等待所有事务完成
      const finalResults = await Promise.all(promises);

      // 验证结果
      expect(finalResults).toEqual(['result1', 'result2', 'result3']);
      expect(results).toHaveLength(3);

      // 验证每个事务都有唯一的ID
      const transactionIds = results.map(r => r.transactionId);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(3);

      // 验证事务对象正确对应
      expect(results.find(r => r.currentTransaction === transaction1)).toBeDefined();
      expect(results.find(r => r.currentTransaction === transaction2)).toBeDefined();
      expect(results.find(r => r.currentTransaction === transaction3)).toBeDefined();
    });

    it('嵌套异步调用应该保持事务上下文', async () => {
      const transaction = createMockTransaction('nested-trx');
      
      const nestedAsyncFunction = async (depth: number): Promise<string> => {
        if (depth === 0) {
          // 最深层验证事务上下文
          const currentTrx = getCurrentTransaction();
          expect(currentTrx).toBe(transaction);
          return 'deep';
        }
        
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // 验证中间层也能获取到事务
        const currentTrx = getCurrentTransaction();
        expect(currentTrx).toBe(transaction);
        
        // 递归调用
        return await nestedAsyncFunction(depth - 1);
      };

      await transactionContextManager.runInTransaction(transaction, async () => {
        const result = await nestedAsyncFunction(5);
        expect(result).toBe('deep');
      });
    });

    it('事务结束后上下文应该清理', async () => {
      const transaction = createMockTransaction('cleanup-trx');
      
      // 事务开始前
      expect(getCurrentTransaction()).toBeUndefined();
      
      await transactionContextManager.runInTransaction(transaction, async () => {
        // 事务中
        expect(getCurrentTransaction()).toBe(transaction);
      });
      
      // 事务结束后
      expect(getCurrentTransaction()).toBeUndefined();
    });
  });

  describe('高并发场景模拟', () => {
    it('应该支持大量并发事务', async () => {
      const concurrentCount = 100;
      const transactions = Array.from({ length: concurrentCount }, (_, i) => 
        createMockTransaction(`concurrent-trx-${i}`)
      );

      const promises = transactions.map((transaction, index) => 
        transactionContextManager.runInTransaction(transaction, async () => {
          // 模拟随机延迟
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          // 验证事务上下文正确
          const currentTrx = getCurrentTransaction();
          expect(currentTrx).toBe(transaction);
          
          return `result-${index}`;
        })
      );

      const results = await Promise.all(promises);
      
      // 验证所有事务都正确完成
      expect(results).toHaveLength(concurrentCount);
      results.forEach((result, index) => {
        expect(result).toBe(`result-${index}`);
      });
    });

    it('并发事务中的错误应该独立处理', async () => {
      const transaction1 = createMockTransaction('error-trx-1');
      const transaction2 = createMockTransaction('success-trx-2');

      const promises = [
        // 第一个事务抛出错误
        transactionContextManager.runInTransaction(transaction1, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          throw new Error('Transaction 1 failed');
        }).catch(error => error.message),

        // 第二个事务正常完成
        transactionContextManager.runInTransaction(transaction2, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          const currentTrx = getCurrentTransaction();
          expect(currentTrx).toBe(transaction2);
          return 'success';
        })
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).toBe('Transaction 1 failed');
      expect(results[1]).toBe('success');
    });
  });

  describe('真实场景模拟', () => {
    it('模拟多个用户同时进行转账操作', async () => {
      // 模拟三个用户同时进行转账
      const transferOperations = [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user3', to: 'user4', amount: 200 },
        { from: 'user5', to: 'user6', amount: 150 }
      ];

      const promises = transferOperations.map((transfer, index) => {
        const transaction = createMockTransaction(`transfer-${index}`);
        
        return transactionContextManager.runInTransaction(transaction, async () => {
          // 模拟转账操作的多个步骤
          
          // 1. 检查余额
          await new Promise(resolve => setTimeout(resolve, 2));
          const currentTrx1 = getCurrentTransaction();
          expect(currentTrx1).toBe(transaction);
          
          // 2. 扣除发送方余额
          await new Promise(resolve => setTimeout(resolve, 3));
          const currentTrx2 = getCurrentTransaction();
          expect(currentTrx2).toBe(transaction);
          
          // 3. 增加接收方余额
          await new Promise(resolve => setTimeout(resolve, 2));
          const currentTrx3 = getCurrentTransaction();
          expect(currentTrx3).toBe(transaction);
          
          // 4. 记录转账日志
          await new Promise(resolve => setTimeout(resolve, 1));
          const currentTrx4 = getCurrentTransaction();
          expect(currentTrx4).toBe(transaction);
          
          return {
            transferId: `transfer-${index}`,
            from: transfer.from,
            to: transfer.to,
            amount: transfer.amount,
            status: 'completed'
          };
        });
      });

      const results = await Promise.all(promises);
      
      // 验证所有转账都成功完成
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.transferId).toBe(`transfer-${index}`);
        expect(result.status).toBe('completed');
      });
    });
  });
});
