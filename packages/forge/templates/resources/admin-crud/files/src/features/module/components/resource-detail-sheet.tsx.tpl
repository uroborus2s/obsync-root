import { FolderKanban, PencilLineIcon, ScrollText, UserRound } from 'lucide-react'

import { DetailSheet } from '@/components/admin/details/detail-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { {{pascalName}}Record } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

interface {{pascalName}}DetailSheetProps {
  onEdit: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  record?: {{pascalName}}Record | null
}

export function {{pascalName}}DetailSheet({
  onEdit,
  onOpenChange,
  open,
  record,
}: {{pascalName}}DetailSheetProps) {
  return (
    <DetailSheet
      actions={
        <Button onClick={onEdit} type='button'>
          <PencilLineIcon className='size-4' />
          编辑记录
        </Button>
      }
      description='标准 CRUD 模块默认使用右侧详情抽屉承载只读信息。'
      onOpenChange={onOpenChange}
      open={open}
      title={record?.name ?? '{{pascalName}} 详情'}
    >
      {record ? (
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <FolderKanban className='size-4 text-muted-foreground' />
                概览
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>名称</span>
                <span className='font-medium'>{record.name}</span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>状态</span>
                <Badge variant='outline'>{record.status}</Badge>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>最近更新</span>
                <span>{record.updatedAt}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <UserRound className='size-4 text-muted-foreground' />
                负责人
              </CardTitle>
            </CardHeader>
            <CardContent className='text-sm'>
              <p className='font-medium'>{record.owner}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <ScrollText className='size-4 text-muted-foreground' />
                描述
              </CardTitle>
            </CardHeader>
            <CardContent className='text-sm leading-6 text-muted-foreground'>
              {record.description}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DetailSheet>
  )
}
