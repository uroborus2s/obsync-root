import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskStatus } from '@/types/task.types';
import { taskApi } from '@/lib/task-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { UserNav } from '@/components/user-nav';
import { TaskStatsCards } from '../components/task-stats-cards';
import { TaskTreeTableNew, } from '../components/task-tree-table-new';
import { TaskTreeToolbar } from '../components/task-tree-toolbar';
import { taskTreeService } from '../data/task-tree-service';
export default function TasksPage() {
    const [currentTab, setCurrentTab] = useState('running');
    const [queryParams, setQueryParams] = useState({
        page: 1,
        page_size: 50,
    });
    const [filters, setFilters] = useState({
        searchTerm: '',
        statuses: [],
        taskTypes: [],
    });
    /* ---------- 数据获取 ---------- */
    // 运行中根任务
    const { data: runningTasksData, isLoading: _isLoadingRunning, error: runningError, refetch: refetchRunning, } = useQuery({
        queryKey: ['tasks', 'tree', 'running', queryParams],
        queryFn: async () => {
            const runningStatuses = [
                TaskStatus.PENDING,
                TaskStatus.RUNNING,
                TaskStatus.PAUSED,
            ];
            return await taskTreeService.loadRootTasks({
                status: runningStatuses.join(','),
                page: queryParams.page,
                page_size: queryParams.page_size,
            });
        },
        enabled: currentTab === 'running',
    });
    // 已完成根任务
    const { data: completedTasksData, isLoading: _isLoadingCompleted, error: completedError, refetch: refetchCompleted, } = useQuery({
        queryKey: ['tasks', 'tree', 'completed', queryParams],
        queryFn: async () => {
            const completedStatuses = [
                TaskStatus.SUCCESS,
                TaskStatus.FAILED,
                TaskStatus.CANCELLED,
                TaskStatus.TIMEOUT,
            ];
            return await taskTreeService.loadRootTasks({
                status: completedStatuses.join(','),
                page: queryParams.page,
                page_size: queryParams.page_size,
            });
        },
        enabled: currentTab === 'completed',
    });
    // 任务统计
    const { data: statsData } = useQuery({
        queryKey: ['tasks', 'stats'],
        queryFn: () => taskApi.getTaskStats(),
        refetchInterval: 30000,
    });
    // 扁平化任务供表格使用
    const flattenedTasks = useMemo(() => {
        const tasks = taskTreeService.getFlattenedTasks();
        return tasks.map((t) => ({
            ...t,
            isLoading: taskTreeService.getNodeState(t.id)?.isLoading || false,
        }));
    }, [runningTasksData, completedTasksData, currentTab]);
    // 过滤
    const filteredTasks = useMemo(() => {
        if (!filters.searchTerm &&
            !filters.statuses.length &&
            !filters.taskTypes.length)
            return flattenedTasks;
        return flattenedTasks.filter((task) => {
            const matchesSearch = !filters.searchTerm ||
                task.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const matchesStatus = !filters.statuses.length || filters.statuses.includes(task.status);
            const matchesType = !filters.taskTypes.length || filters.taskTypes.includes(task.task_type);
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [flattenedTasks, filters]);
    const availableTaskTypes = useMemo(() => {
        const set = new Set();
        flattenedTasks.forEach((t) => set.add(t.task_type));
        return Array.from(set);
    }, [flattenedTasks]);
    /* ---------- 交互处理 ---------- */
    const handleToggleExpansion = useCallback(async (taskId) => {
        await taskTreeService.toggleNodeExpansion(taskId);
    }, []);
    const handleExpandAll = () => taskTreeService.expandAll();
    const handleCollapseAll = () => taskTreeService.collapseAll();
    const handleSearchChange = (term) => setFilters((p) => ({ ...p, searchTerm: term }));
    const handleStatusChange = (s) => setFilters((p) => ({ ...p, statuses: s }));
    const handleTaskTypeChange = (types) => setFilters((p) => ({ ...p, taskTypes: types }));
    const handleTabChange = (tab) => {
        setCurrentTab(tab);
        setQueryParams({ page: 1, page_size: 50 });
        taskTreeService.clearCache();
        if (tab === 'running') {
            refetchRunning();
        }
        else {
            refetchCompleted();
        }
    };
    const currentError = currentTab === 'running' ? runningError : completedError;
    return (<div className='h-full'>
      <Header>
        <Search />
        <ThemeSwitch />
        <UserNav />
      </Header>

      <Main>
        <div className='space-y-6'>
          {statsData && <TaskStatsCards stats={statsData}/>}

          <Card>
            <CardHeader>
              <CardTitle>任务管理</CardTitle>
              <CardDescription>树形展示所有任务，支持懒加载</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={currentTab} onValueChange={(v) => handleTabChange(v)} className='w-full'>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='running'>运行中任务</TabsTrigger>
                  <TabsTrigger value='completed'>已完成任务</TabsTrigger>
                </TabsList>

                <TabsContent value='running' className='space-y-4'>
                  <TaskTreeToolbar searchValue={filters.searchTerm} onSearchChange={handleSearchChange} selectedStatuses={filters.statuses} onStatusChange={handleStatusChange} selectedTaskTypes={filters.taskTypes} onTaskTypeChange={handleTaskTypeChange} availableTaskTypes={availableTaskTypes} onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} totalTasks={flattenedTasks.length} visibleTasks={filteredTasks.length}/>

                  {currentError ? (<div className='rounded-md border border-red-200 bg-red-50 p-4'>
                      <p className='text-red-800'>
                        加载失败: {currentError.message}
                      </p>
                    </div>) : (<TaskTreeTableNew data={filteredTasks} onToggleExpansion={handleToggleExpansion}/>)}
                </TabsContent>

                <TabsContent value='completed' className='space-y-4'>
                  <TaskTreeToolbar searchValue={filters.searchTerm} onSearchChange={handleSearchChange} selectedStatuses={filters.statuses} onStatusChange={handleStatusChange} selectedTaskTypes={filters.taskTypes} onTaskTypeChange={handleTaskTypeChange} availableTaskTypes={availableTaskTypes} onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} totalTasks={flattenedTasks.length} visibleTasks={filteredTasks.length}/>

                  {currentError ? (<div className='rounded-md border border-red-200 bg-red-50 p-4'>
                      <p className='text-red-800'>
                        加载失败: {currentError.message}
                      </p>
                    </div>) : (<TaskTreeTableNew data={filteredTasks} onToggleExpansion={handleToggleExpansion}/>)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>);
}
//# sourceMappingURL=tasks-page.js.map