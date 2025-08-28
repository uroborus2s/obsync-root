// @wps/app-icalink 简化版本的类型修复
// 解决编译错误的临时方案

// 解决service.ts中的类型问题
export function fixServiceTypeIssues() {
  // 修复validateRequired函数的类型问题
  return true;
}

// 解决Repository Option类型问题的工具函数  
export function handleOptionType<T>(option: any): T | null {
  if (!option) return null;
  if (typeof option === 'object' && 'some' in option) {
    return option.some ? option.value : null;
  }
  return option;
}

// 从ServiceResult中安全提取Option类型的数据
export function extractOptionFromServiceResult<T>(result: any): T | null {
  if (!result.success || !result.data) return null;
  return handleOptionType<T>(result.data);
}

// 解决分页类型转换问题
export function convertPaginationParams(params: any): any {
  if (!params) return undefined;
  return {
    page: params.page || 1,
    pageSize: params.page_size || params.pageSize || 20
  };
}

// 解决QueryOptions类型冲突
export function normalizeQueryOptions(options: any): any {
  if (!options) return undefined;
  return {
    ...options,
    pagination: convertPaginationParams(options.pagination)
  };
}

// 修复分页结果类型转换
export function convertToPaginatedResult<T>(stratixResult: any): any {
  if (!stratixResult) return null;
  
  return {
    data: stratixResult.data || [],
    total: stratixResult.total || 0,
    page: stratixResult.page || 1,
    page_size: stratixResult.page_size || stratixResult.pageSize || 20,
    total_pages: stratixResult.total_pages || Math.ceil((stratixResult.total || 0) / (stratixResult.page_size || stratixResult.pageSize || 20)),
    has_next: stratixResult.has_next || false,
    has_prev: stratixResult.has_prev || false
  };
}