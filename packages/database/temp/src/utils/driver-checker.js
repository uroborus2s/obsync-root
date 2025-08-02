// @stratix/database 驱动依赖检查工具
// 检查和验证数据库驱动的可用性
import { ConnectionError, DatabaseErrorHandler } from '../utils/error-handler.js';
/**
 * 驱动依赖映射
 */
export const DRIVER_DEPENDENCIES = {
    postgresql: ['pg'],
    mysql: ['mysql2'],
    sqlite: ['better-sqlite3'],
    mssql: ['tedious', 'tarn']
};
/**
 * 驱动检查器类
 */
export class DriverChecker {
    /**
     * 检查指定数据库类型的所有驱动
     */
    static checkDatabaseDrivers(type) {
        try {
            const requiredDrivers = DRIVER_DEPENDENCIES[type];
            if (!requiredDrivers) {
                throw new Error(`Unknown database type: ${type}`);
            }
            const drivers = [];
            const missingDrivers = [];
            for (const driverName of requiredDrivers) {
                const driverInfo = this.checkDriver(driverName);
                drivers.push(driverInfo);
                if (!driverInfo.available) {
                    missingDrivers.push(driverName);
                }
            }
            const result = {
                databaseType: type,
                drivers,
                allAvailable: missingDrivers.length === 0,
                missingDrivers
            };
            return DatabaseErrorHandler.success(result);
        }
        catch (error) {
            return DatabaseErrorHandler.failure(ConnectionError.create(error instanceof Error ? error.message : String(error)));
        }
    }
    /**
     * 检查单个驱动
     */
    static checkDriver(driverName) {
        // 检查缓存
        const cached = this.cache.get(driverName);
        if (cached) {
            return cached;
        }
        const driverInfo = {
            name: driverName,
            available: false
        };
        try {
            require(driverName);
            driverInfo.available = true;
            // 尝试获取版本信息
            try {
                const packageJson = require(`${driverName}/package.json`);
                driverInfo.version = packageJson.version;
            }
            catch {
                // 忽略版本获取错误
            }
        }
        catch (error) {
            driverInfo.available = false;
            driverInfo.error = error instanceof Error ? error.message : String(error);
        }
        // 缓存结果
        this.cache.set(driverName, driverInfo);
        return driverInfo;
    }
    /**
     * 检查所有支持的数据库驱动
     */
    static checkAllDrivers() {
        const results = {};
        for (const type of Object.keys(DRIVER_DEPENDENCIES)) {
            const checkResult = this.checkDatabaseDrivers(type);
            if (checkResult.success) {
                results[type] = checkResult.data;
            }
        }
        return results;
    }
    /**
     * 获取缺失驱动的安装建议
     */
    static getInstallationSuggestions(missingDrivers) {
        const suggestions = [];
        for (const driver of missingDrivers) {
            switch (driver) {
                case 'pg':
                    suggestions.push('PostgreSQL: npm install pg @types/pg', 'For production: also consider installing pg-pool');
                    break;
                case 'mysql2':
                    suggestions.push('MySQL: npm install mysql2', 'mysql2 is the recommended MySQL driver for Node.js');
                    break;
                case 'better-sqlite3':
                    suggestions.push('SQLite: npm install better-sqlite3 @types/better-sqlite3', 'better-sqlite3 is the fastest SQLite driver for Node.js');
                    break;
                case 'tedious':
                    suggestions.push('SQL Server: npm install tedious', 'tedious is the Microsoft SQL Server driver for Node.js');
                    break;
                case 'tarn':
                    suggestions.push('Connection pooling: npm install tarn', 'tarn is required for SQL Server connection pooling');
                    break;
                default:
                    suggestions.push(`Unknown driver: ${driver} - npm install ${driver}`);
            }
        }
        return suggestions;
    }
    /**
     * 生成驱动状态报告
     */
    static generateReport() {
        const results = this.checkAllDrivers();
        const lines = [];
        lines.push('=== Database Driver Status Report ===');
        lines.push('');
        for (const [type, result] of Object.entries(results)) {
            lines.push(`${type.toUpperCase()}:`);
            lines.push(`  Status: ${result.allAvailable ? '✅ Ready' : '❌ Missing drivers'}`);
            for (const driver of result.drivers) {
                const status = driver.available ? '✅' : '❌';
                const version = driver.version ? ` (v${driver.version})` : '';
                lines.push(`  ${status} ${driver.name}${version}`);
                if (!driver.available && driver.error) {
                    lines.push(`      Error: ${driver.error}`);
                }
            }
            if (result.missingDrivers.length > 0) {
                lines.push('  Installation suggestions:');
                const suggestions = this.getInstallationSuggestions(result.missingDrivers);
                for (const suggestion of suggestions) {
                    lines.push(`    ${suggestion}`);
                }
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * 清除缓存
     */
    static clearCache() {
        this.cache.clear();
    }
    /**
     * 预检查所有驱动（在应用启动时调用）
     */
    static async precheck() {
        console.log('Checking database drivers...');
        const results = this.checkAllDrivers();
        const availableTypes = [];
        const unavailableTypes = [];
        for (const [type, result] of Object.entries(results)) {
            if (result.allAvailable) {
                availableTypes.push(type);
            }
            else {
                unavailableTypes.push(type);
            }
        }
        if (availableTypes.length > 0) {
            console.log(`✅ Available database types: ${availableTypes.join(', ')}`);
        }
        if (unavailableTypes.length > 0) {
            console.log(`⚠️  Unavailable database types: ${unavailableTypes.join(', ')}`);
            console.log('Run `npm list` to see which drivers are missing.');
        }
        if (process.env.NODE_ENV === 'development') {
            console.log('\n' + this.generateReport());
        }
    }
}
DriverChecker.cache = new Map();
/**
 * 便捷函数：检查数据库类型是否可用
 */
export function isDatabaseTypeAvailable(type) {
    const result = DriverChecker.checkDatabaseDrivers(type);
    return result.success && result.data.allAvailable;
}
/**
 * 便捷函数：获取可用的数据库类型
 */
export function getAvailableDatabaseTypes() {
    const results = DriverChecker.checkAllDrivers();
    return Object.entries(results)
        .filter(([_, result]) => result.allAvailable)
        .map(([type]) => type);
}
/**
 * 便捷函数：获取缺失的驱动
 */
export function getMissingDrivers(type) {
    const result = DriverChecker.checkDatabaseDrivers(type);
    return result.success ? result.data.missingDrivers : [];
}
/**
 * 装饰器：自动检查驱动依赖
 */
export function requiresDrivers(types) {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            // 检查驱动依赖
            for (const type of types) {
                if (!isDatabaseTypeAvailable(type)) {
                    const missing = getMissingDrivers(type);
                    throw new Error(`Database type '${type}' is not available. Missing drivers: ${missing.join(', ')}`);
                }
            }
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
