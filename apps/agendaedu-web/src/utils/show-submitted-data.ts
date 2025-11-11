/**
 * 显示提交的数据 - 用于调试和开发
 */
export function showSubmittedData(data: any, title?: string) {
  if (import.meta.env.DEV) {
    console.log(title || '提交的数据:', data)
  }
}
