import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export function AttendanceRateExplanation() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>出勤率计算说明</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div>
          <strong>计算公式：</strong>
          <code className="ml-2 rounded bg-muted px-2 py-1 text-sm">
            出勤率 = (实际出勤人数 + 请假人数) / 应签到人数 × 100%
          </code>
        </div>
        
        <div>
          <strong>状态说明：</strong>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
              正常签到 - 计入出勤
            </Badge>
            <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              迟到签到 - 计入出勤
            </Badge>
            <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              请假 - 计入出勤
            </Badge>
            <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
              缺勤 - 不计入出勤
            </Badge>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <strong>说明：</strong>
          实际出勤人数包括正常签到和迟到签到的学生，请假人数为已批准请假的学生，
          应签到人数为选课学生总数。此计算方式确保请假学生不会影响课程的整体出勤率。
        </div>
      </AlertDescription>
    </Alert>
  )
}
