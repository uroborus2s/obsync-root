import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface TrendData {
  date: string
  attendance_rate: number
  class_count: number
}

interface AttendanceTrendChartProps {
  data: TrendData[]
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  // 格式化数据，将日期转换为更友好的格式
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric' 
    }),
    attendance_rate: Number(item.attendance_rate.toFixed(1)),
    class_count: item.class_count
  })).reverse() // 反转数组，使最新日期在右侧

  return (
    <div className="space-y-6">
      {/* 出勤率趋势线图 */}
      <div>
        <h4 className="text-sm font-medium mb-3">出勤率趋势</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={{ value: '出勤率 (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, '出勤率']}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="attendance_rate" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 课次数柱状图 */}
      <div>
        <h4 className="text-sm font-medium mb-3">每日课次数</h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={{ value: '课次数', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}`, '课次数']}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="class_count" 
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 数据摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formattedData.length > 0 
              ? Math.round(formattedData.reduce((sum, item) => sum + item.attendance_rate, 0) / formattedData.length)
              : 0}%
          </div>
          <div className="text-sm text-muted-foreground">平均出勤率</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formattedData.length > 0 
              ? Math.max(...formattedData.map(item => item.attendance_rate))
              : 0}%
          </div>
          <div className="text-sm text-muted-foreground">最高出勤率</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {formattedData.reduce((sum, item) => sum + item.class_count, 0)}
          </div>
          <div className="text-sm text-muted-foreground">总课次数</div>
        </div>
      </div>
    </div>
  )
}
