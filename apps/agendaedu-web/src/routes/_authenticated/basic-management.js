import { createFileRoute } from '@tanstack/react-router';
import { Activity, Bell, Calendar, Database, FileText, Settings, Shield, Users, } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
export const Route = createFileRoute('/_authenticated/basic-management')({
    component: BasicManagement,
});
function BasicManagement() {
    const managementItems = [
        {
            title: '系统设置',
            description: '系统参数配置和全局设置',
            icon: Settings,
            status: '正常',
            lastUpdate: '2024-01-15',
            items: ['基础参数', '考勤规则', '通知设置', '界面配置'],
        },
        {
            title: '数据管理',
            description: '数据备份、导入导出和清理',
            icon: Database,
            status: '正常',
            lastUpdate: '2024-01-14',
            items: ['数据备份', '数据导入', '数据导出', '数据清理'],
        },
        {
            title: '权限管理',
            description: '用户权限和角色管理',
            icon: Shield,
            status: '正常',
            lastUpdate: '2024-01-13',
            items: ['角色管理', '权限分配', '访问控制', '安全审计'],
        },
        {
            title: '通知管理',
            description: '消息推送和通知配置',
            icon: Bell,
            status: '正常',
            lastUpdate: '2024-01-12',
            items: ['消息模板', '推送设置', '通知记录', '订阅管理'],
        },
    ];
    const systemStatus = [
        { name: '数据库连接', status: '正常', uptime: '99.9%' },
        { name: '缓存服务', status: '正常', uptime: '99.8%' },
        { name: '消息队列', status: '正常', uptime: '99.7%' },
        { name: '文件存储', status: '正常', uptime: '99.9%' },
    ];
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>基础管理</h2>
          <p className='text-muted-foreground'>系统基础配置和管理功能</p>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className='grid gap-4 md:grid-cols-4'>
        {systemStatus.map((service, index) => (<Card key={index}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {service.name}
              </CardTitle>
              <Activity className='text-muted-foreground h-4 w-4'/>
            </CardHeader>
            <CardContent>
              <div className='flex items-center space-x-2'>
                <Badge variant={service.status === '正常' ? 'default' : 'destructive'}>
                  {service.status}
                </Badge>
                <span className='text-muted-foreground text-sm'>
                  可用性 {service.uptime}
                </span>
              </div>
            </CardContent>
          </Card>))}
      </div>

      {/* 管理功能模块 */}
      <div className='grid gap-6 md:grid-cols-2'>
        {managementItems.map((item, index) => {
            const IconComponent = item.icon;
            return (<Card key={index} className='cursor-pointer transition-shadow hover:shadow-md'>
              <CardHeader>
                <div className='flex items-center space-x-4'>
                  <div className='bg-primary/10 rounded-lg p-2'>
                    <IconComponent className='text-primary h-6 w-6'/>
                  </div>
                  <div className='flex-1'>
                    <CardTitle className='text-xl'>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge variant={item.status === '正常' ? 'default' : 'destructive'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-2'>
                    {item.items.map((subItem, subIndex) => (<Button key={subIndex} variant='outline' size='sm' className='h-auto justify-start px-3 py-2'>
                        {subItem}
                      </Button>))}
                  </div>
                  <div className='text-muted-foreground flex items-center justify-between text-sm'>
                    <span>最后更新: {item.lastUpdate}</span>
                    <Button size='sm'>进入管理</Button>
                  </div>
                </div>
              </CardContent>
            </Card>);
        })}
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>常用的系统管理操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            <Button variant='outline' className='h-20 flex-col space-y-2'>
              <Database className='h-6 w-6'/>
              <span>数据库备份</span>
            </Button>
            <Button variant='outline' className='h-20 flex-col space-y-2'>
              <Users className='h-6 w-6'/>
              <span>用户导入</span>
            </Button>
            <Button variant='outline' className='h-20 flex-col space-y-2'>
              <FileText className='h-6 w-6'/>
              <span>日志查看</span>
            </Button>
            <Button variant='outline' className='h-20 flex-col space-y-2'>
              <Calendar className='h-6 w-6'/>
              <span>学期设置</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>);
}
//# sourceMappingURL=basic-management.js.map