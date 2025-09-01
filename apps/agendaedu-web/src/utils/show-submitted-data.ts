/**
 * 显示提交的数据 - 用于调试和开发
 */
export function showSubmittedData(data: any, title?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(title || '提交的数据:', data)
  }
}
