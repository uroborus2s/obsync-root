/**
 * 教师信息Repository
 * 专门管理out_jsxx表的CRUD操作
 */
import { BaseRepository } from './base-repository.js';
/**
 * 教师信息Repository实现
 */
export class TeacherInfoRepository extends BaseRepository {
    db;
    constructor(db, log) {
        super(log);
        this.db = db;
    }
    /**
     * 根据工号查询教师信息
     */
    async findByGh(gh) {
        try {
            const result = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('gh', '=', gh)
                .executeTakeFirst();
            this.logOperation('根据工号查询教师信息', { gh, found: !!result });
            return result || null;
        }
        catch (error) {
            this.handleDatabaseError('根据工号查询教师信息', error, { gh });
        }
    }
    /**
     * 根据ID查询教师信息
     */
    async findById(id) {
        try {
            const result = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
            this.logOperation('根据ID查询教师信息', { id, found: !!result });
            return result || null;
        }
        catch (error) {
            this.handleDatabaseError('根据ID查询教师信息', error, { id });
        }
    }
    /**
     * 批量根据工号查询教师信息
     */
    async findByGhs(ghs) {
        try {
            if (ghs.length === 0) {
                return [];
            }
            const results = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('gh', 'in', ghs)
                .execute();
            this.logOperation('批量查询教师信息', {
                ghCount: ghs.length,
                foundCount: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('批量查询教师信息', error, {
                ghCount: ghs.length
            });
        }
    }
    /**
     * 根据部门查询教师信息
     */
    async findByDepartment(ssdwdm) {
        try {
            const results = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('ssdwdm', '=', ssdwdm)
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('根据部门查询教师信息', {
                ssdwdm,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据部门查询教师信息', error, { ssdwdm });
        }
    }
    /**
     * 根据职称查询教师信息
     */
    async findByTitle(zc) {
        try {
            const results = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('zc', '=', zc)
                .orderBy('ssdwdm', 'asc')
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('根据职称查询教师信息', {
                zc,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据职称查询教师信息', error, { zc });
        }
    }
    /**
     * 根据性别查询教师信息
     */
    async findByGender(xb) {
        try {
            const results = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where('xb', '=', xb)
                .orderBy('ssdwdm', 'asc')
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('根据性别查询教师信息', {
                xb,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据性别查询教师信息', error, { xb });
        }
    }
    /**
     * 根据条件查询教师信息
     */
    async findByConditions(conditions) {
        try {
            let query = this.db.selectFrom('out_jsxx').selectAll();
            if (conditions.gh) {
                query = query.where('gh', '=', conditions.gh);
            }
            if (conditions.xm) {
                query = query.where('xm', 'like', `%${conditions.xm}%`);
            }
            if (conditions.ssdwdm) {
                query = query.where('ssdwdm', '=', conditions.ssdwdm);
            }
            if (conditions.zc) {
                query = query.where('zc', '=', conditions.zc);
            }
            if (conditions.xb) {
                query = query.where('xb', '=', conditions.xb);
            }
            if (conditions.zt) {
                query = query.where('zt', '=', conditions.zt);
            }
            const results = await query
                .orderBy('ssdwdm', 'asc')
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('根据条件查询教师信息', {
                conditions,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据条件查询教师信息', error, { conditions });
        }
    }
    /**
     * 搜索教师（根据姓名或工号）
     */
    async searchTeachers(keyword) {
        try {
            const results = await this.db
                .selectFrom('out_jsxx')
                .selectAll()
                .where((eb) => eb.or([
                eb('xm', 'like', `%${keyword}%`),
                eb('gh', 'like', `%${keyword}%`)
            ]))
                .orderBy('ssdwdm', 'asc')
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('搜索教师信息', {
                keyword,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('搜索教师信息', error, { keyword });
        }
    }
    /**
     * 获取教师统计信息
     */
    async getTeacherStats() {
        try {
            // 总数
            const totalResult = await this.db
                .selectFrom('out_jsxx')
                .select((eb) => eb.fn.count('id').as('total'))
                .executeTakeFirst();
            // 按部门统计
            const departmentStats = await this.db
                .selectFrom('out_jsxx')
                .select(['ssdwdm', 'ssdwmc'])
                .select((eb) => eb.fn.count('id').as('count'))
                .groupBy(['ssdwdm', 'ssdwmc'])
                .orderBy('count', 'desc')
                .execute();
            // 按职称统计
            const titleStats = await this.db
                .selectFrom('out_jsxx')
                .select('zc')
                .select((eb) => eb.fn.count('id').as('count'))
                .groupBy('zc')
                .orderBy('count', 'desc')
                .execute();
            // 按性别统计
            const genderStats = await this.db
                .selectFrom('out_jsxx')
                .select('xb')
                .select((eb) => eb.fn.count('id').as('count'))
                .groupBy('xb')
                .orderBy('count', 'desc')
                .execute();
            const stats = {
                total: Number(totalResult?.total || 0),
                byDepartment: departmentStats.map((item) => ({
                    ssdwdm: item.ssdwdm || '',
                    ssdwmc: item.ssdwmc || '',
                    count: Number(item.count)
                })),
                byTitle: titleStats.map((item) => ({
                    zc: item.zc || '',
                    count: Number(item.count)
                })),
                byGender: genderStats.map((item) => ({
                    xb: item.xb || '',
                    count: Number(item.count)
                }))
            };
            this.logOperation('获取教师统计信息', { total: stats.total });
            return stats;
        }
        catch (error) {
            this.handleDatabaseError('获取教师统计信息', error);
        }
    }
    /**
     * 检查工号是否存在
     */
    async existsByGh(gh) {
        try {
            const result = await this.db
                .selectFrom('out_jsxx')
                .select('id')
                .where('gh', '=', gh)
                .executeTakeFirst();
            const exists = !!result;
            this.logOperation('检查工号是否存在', { gh, exists });
            return exists;
        }
        catch (error) {
            this.handleDatabaseError('检查工号是否存在', error, { gh });
        }
    }
    /**
     * 获取部门教师列表
     */
    async getDepartmentTeachers(ssdwdm) {
        try {
            const results = await this.db
                .selectFrom('out_jsxx')
                .select(['gh', 'xm', 'zc', 'sjh'])
                .where('ssdwdm', '=', ssdwdm)
                .orderBy('gh', 'asc')
                .execute();
            this.logOperation('获取部门教师列表', {
                ssdwdm,
                count: results.length
            });
            return results.map((item) => ({
                gh: item.gh || '',
                xm: item.xm || '',
                zc: item.zc || '',
                sjh: item.sjh || ''
            }));
        }
        catch (error) {
            this.handleDatabaseError('获取部门教师列表', error, { ssdwdm });
        }
    }
    /**
     * 获取部门树状结构
     */
    async getDepartmentTree() {
        try {
            const departments = await this.db
                .selectFrom('out_jsxx')
                .select(['ssdwdm', 'ssdwmc'])
                .select((eb) => eb.fn.count('id').as('teacherCount'))
                .groupBy(['ssdwdm', 'ssdwmc'])
                .orderBy('teacherCount', 'desc')
                .execute();
            const result = [];
            for (const dept of departments) {
                const titles = await this.db
                    .selectFrom('out_jsxx')
                    .select('zc')
                    .select((eb) => eb.fn.count('id').as('count'))
                    .where('ssdwdm', '=', dept.ssdwdm || '')
                    .groupBy('zc')
                    .orderBy('count', 'desc')
                    .execute();
                result.push({
                    ssdwdm: dept.ssdwdm || '',
                    ssdwmc: dept.ssdwmc || '',
                    teacherCount: Number(dept.teacherCount),
                    titles: titles.map((title) => ({
                        zc: title.zc || '',
                        count: Number(title.count)
                    }))
                });
            }
            this.logOperation('获取部门树状结构', { count: result.length });
            return result;
        }
        catch (error) {
            this.handleDatabaseError('获取部门树状结构', error);
        }
    }
}
//# sourceMappingURL=teacher-info-repository.js.map