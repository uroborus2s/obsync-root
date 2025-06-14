/**
 * 任务表格组件
 */

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import React from 'react';
import type { Task, TaskOperationOptions } from '../types/task';
import { TaskActions } from './TaskActions';
import { TaskStatusBadge } from './TaskStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';

interface TaskTableProps {
  data: Task[];
  loading?: boolean;
  onStart?: (id: string, options?: TaskOperationOptions) => void;
  onPause?: (id: string, options?: TaskOperationOptions) => void;
  onResume?: (id: string, options?: TaskOperationOptions) => void;
  onStop?: (id: string, options?: TaskOperationOptions) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (
    id: string,
    options?: { cascade?: boolean; force?: boolean }
  ) => void;
  expandable?: boolean;
}

export function TaskTable({
  data,
  loading = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onEdit,
  onDelete,
  expandable = false
}: TaskTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggleExpanded = (taskId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const columns: ColumnDef<Task>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: '任务名称',
      cell: ({ row }) => {
        const task = row.original;
        const hasChildren = task.children && task.children.length > 0;
        const isExpanded = expanded[task.id];

        return (
          <div className='flex items-center gap-2'>
            {expandable && task.type === 'directory' && (
              <button
                onClick={() => toggleExpanded(task.id)}
                className='rounded p-1 hover:bg-gray-100'
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )
                ) : (
                  <div className='h-4 w-4' />
                )}
              </button>
            )}
            {task.type === 'directory' ? (
              <Folder className='h-4 w-4 text-blue-500' />
            ) : (
              <File className='h-4 w-4 text-gray-500' />
            )}
            <span className='font-medium'>{task.name}</span>
          </div>
        );
      }
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => {
        const description = row.getValue('description') as string;
        return (
          <div className='max-w-xs truncate text-sm text-gray-600'>
            {description || '-'}
          </div>
        );
      }
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <span className='text-sm'>
            {type === 'directory' ? '目录' : '叶子'}
          </span>
        );
      }
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const status = row.getValue('status') as Task['status'];
        return <TaskStatusBadge status={status} />;
      }
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: ({ row }) => {
        const createdAt = row.getValue('createdAt') as string;
        return (
          <span className='text-sm text-gray-600'>
            {new Date(createdAt).toLocaleString('zh-CN')}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <TaskActions
            task={task}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={loading}
          />
        );
      }
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters
    }
  });

  if (loading) {
    return (
      <div className='space-y-4'>
        <div className='animate-pulse'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='mb-2 h-12 rounded bg-gray-200' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                暂无任务数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
