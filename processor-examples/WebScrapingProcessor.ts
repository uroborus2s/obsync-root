// 高级网页爬虫处理器示例
// 展示如何处理复杂的异步操作、错误重试、资源管理

import puppeteer, { Browser } from 'puppeteer';
import { BaseTaskProcessor } from '../base/BaseTaskProcessor.js';
import { ExecutionContext, ProcessorResult } from '../interfaces/ITaskProcessor.js';

interface WebScrapingParams {
  targets: Array<{
    url: string;
    selectors: Record<string, string>;
    waitFor?: string;
    screenshot?: boolean;
  }>;
  options: {
    headless?: boolean;
    timeout?: number;
    userAgent?: string;
    viewport?: { width: number; height: number };
    proxy?: string;
    rateLimit?: number; // 请求间隔(ms)
  };
  output: {
    format: 'json' | 'csv' | 'xlsx';
    filePath?: string;
    includeMetadata?: boolean;
  };
}

export class WebScrapingProcessor extends BaseTaskProcessor {
  readonly name = 'webScraping';
  readonly version = '1.0.0';
  
  private browser: Browser | null = null;
  private activeSessions: Set<string> = new Set();
  
  async validateParameters(params: WebScrapingParams): Promise<boolean> {
    if (!params.targets || !Array.isArray(params.targets) || params.targets.length === 0) {
      return false;
    }
    
    for (const target of params.targets) {
      if (!target.url || !target.selectors) {
        return false;
      }
    }
    
    return true;
  }
  
  protected async beforeExecute(params: WebScrapingParams, context: ExecutionContext): Promise<void> {
    await super.beforeExecute(params, context);
    
    // 启动浏览器实例
    this.browser = await puppeteer.launch({
      headless: params.options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        ...(params.options.proxy ? [`--proxy-server=${params.options.proxy}`] : [])
      ]
    });
    
    context.logger.info('Browser instance started');
  }
  
  protected async doExecute(params: WebScrapingParams, context: ExecutionContext): Promise<ProcessorResult> {
    const { targets, options, output } = params;
    const results: any[] = [];
    const errors: any[] = [];
    
    try {
      const totalTargets = targets.length;
      
      for (let i = 0; i < totalTargets; i++) {
        const target = targets[i];
        const sessionId = `session_${i}_${Date.now()}`;
        this.activeSessions.add(sessionId);
        
        try {
          await context.progress(
            (i / totalTargets) * 90, 
            `Scraping ${i + 1}/${totalTargets}: ${target.url}`
          );
          
          const result = await this.scrapeTarget(target, options, context, sessionId);
          results.push({
            url: target.url,
            data: result,
            scrapedAt: new Date().toISOString(),
            sessionId
          });
          
          // 速率限制
          if (options.rateLimit && i < totalTargets - 1) {
            await this.delay(options.rateLimit);
          }
          
        } catch (error) {
          const errorInfo = {
            url: target.url,
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
            sessionId
          };
          
          errors.push(errorInfo);
          context.logger.error(`Failed to scrape ${target.url}`, errorInfo);
          
        } finally {
          this.activeSessions.delete(sessionId);
        }
      }
      
      // 保存结果
      await context.progress(95, 'Saving scraped data...');
      const savedPath = await this.saveResults(results, output, context);
      
      await context.progress(100, 'Web scraping completed');
      
      return {
        success: true,
        data: {
          totalTargets,
          successfulScrapes: results.length,
          failedScrapes: errors.length,
          results: output.filePath ? undefined : results, // 如果保存到文件，不返回大量数据
          savedPath,
          errors: errors.length > 0 ? errors : undefined,
          performance: {
            averageTimePerTarget: (Date.now() - context.metadata.startTime) / totalTargets,
            successRate: (results.length / totalTargets) * 100
          }
        },
        metadata: {
          browserVersion: await this.browser?.version(),
          userAgent: options.userAgent,
          outputFormat: output.format
        }
      };
      
    } catch (error) {
      throw new Error(`Web scraping failed: ${(error as Error).message}`);
    }
  }
  
  private async scrapeTarget(
    target: WebScrapingParams['targets'][0], 
    options: WebScrapingParams['options'],
    context: ExecutionContext,
    sessionId: string
  ): Promise<any> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.browser.newPage();
    
    try {
      // 设置用户代理
      if (options.userAgent) {
        await page.setUserAgent(options.userAgent);
      }
      
      // 设置视口
      if (options.viewport) {
        await page.setViewport(options.viewport);
      }
      
      // 设置超时
      page.setDefaultTimeout(options.timeout || 30000);
      
      // 拦截请求（可选：阻止图片、CSS等资源加载以提高速度）
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      context.logger.debug(`Navigating to ${target.url}`, { sessionId });
      
      // 导航到目标页面
      await page.goto(target.url, { 
        waitUntil: 'networkidle2',
        timeout: options.timeout || 30000
      });
      
      // 等待特定元素（如果指定）
      if (target.waitFor) {
        await page.waitForSelector(target.waitFor, { timeout: 10000 });
      }
      
      // 执行数据提取
      const scrapedData = await page.evaluate((selectors) => {
        const result: any = {};
        
        for (const [key, selector] of Object.entries(selectors)) {
          try {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length === 0) {
              result[key] = null;
            } else if (elements.length === 1) {
              const element = elements[0];
              result[key] = {
                text: element.textContent?.trim(),
                html: element.innerHTML,
                attributes: Array.from(element.attributes).reduce((acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                }, {} as Record<string, string>)
              };
            } else {
              result[key] = Array.from(elements).map(element => ({
                text: element.textContent?.trim(),
                html: element.innerHTML,
                attributes: Array.from(element.attributes).reduce((acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                }, {} as Record<string, string>)
              }));
            }
          } catch (error) {
            result[key] = { error: (error as Error).message };
          }
        }
        
        return result;
      }, target.selectors);
      
      // 截图（如果需要）
      let screenshot = null;
      if (target.screenshot) {
        screenshot = await page.screenshot({ 
          type: 'png',
          fullPage: true,
          encoding: 'base64'
        });
      }
      
      context.logger.debug(`Successfully scraped ${target.url}`, { 
        sessionId,
        dataKeys: Object.keys(scrapedData)
      });
      
      return {
        ...scrapedData,
        ...(screenshot && { screenshot }),
        metadata: {
          title: await page.title(),
          url: page.url(),
          timestamp: new Date().toISOString()
        }
      };
      
    } finally {
      await page.close();
    }
  }
  
  private async saveResults(
    results: any[], 
    output: WebScrapingParams['output'],
    context: ExecutionContext
  ): Promise<string | null> {
    if (!output.filePath) {
      return null;
    }
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // 确保目录存在
    const dir = path.dirname(output.filePath);
    await fs.mkdir(dir, { recursive: true });
    
    switch (output.format) {
      case 'json':
        await fs.writeFile(
          output.filePath, 
          JSON.stringify(results, null, 2), 
          'utf8'
        );
        break;
        
      case 'csv':
        const csvContent = await this.convertToCSV(results);
        await fs.writeFile(output.filePath, csvContent, 'utf8');
        break;
        
      case 'xlsx':
        const xlsxContent = await this.convertToXLSX(results);
        await fs.writeFile(output.filePath, xlsxContent);
        break;
        
      default:
        throw new Error(`Unsupported output format: ${output.format}`);
    }
    
    context.logger.info(`Results saved to ${output.filePath}`);
    return output.filePath;
  }
  
  private async convertToCSV(results: any[]): Promise<string> {
    if (results.length === 0) return '';
    
    // 扁平化数据结构
    const flattenedResults = results.map(result => this.flattenObject(result));
    
    // 获取所有可能的列
    const allKeys = new Set<string>();
    flattenedResults.forEach(result => {
      Object.keys(result).forEach(key => allKeys.add(key));
    });
    
    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];
    
    flattenedResults.forEach(result => {
      const row = headers.map(header => {
        const value = result[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  private async convertToXLSX(results: any[]): Promise<Buffer> {
    // 这里需要引入 xlsx 库
    const XLSX = await import('xlsx');
    
    const flattenedResults = results.map(result => this.flattenObject(result));
    const worksheet = XLSX.utils.json_to_sheet(flattenedResults);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scraped Data');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
  
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  protected async afterExecute(result: ProcessorResult, context: ExecutionContext): Promise<void> {
    await super.afterExecute(result, context);
    
    // 清理活跃会话
    this.activeSessions.clear();
  }
  
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.activeSessions.clear();
  }
}

// 使用示例
export const webScrapingExample = {
  name: '电商产品信息爬取',
  task_type: 'webScraping',
  task_config: {
    targets: [
      {
        url: 'https://example-shop.com/products/laptop',
        selectors: {
          title: 'h1.product-title',
          price: '.price-current',
          description: '.product-description',
          images: 'img.product-image',
          reviews: '.review-item'
        },
        waitFor: '.price-current',
        screenshot: true
      }
    ],
    options: {
      headless: true,
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (compatible; ProductBot/1.0)',
      viewport: { width: 1920, height: 1080 },
      rateLimit: 2000 // 2秒间隔
    },
    output: {
      format: 'json',
      filePath: '/data/scraped/products.json',
      includeMetadata: true
    }
  }
};