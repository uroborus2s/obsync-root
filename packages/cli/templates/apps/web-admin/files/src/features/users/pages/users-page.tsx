import * as React from 'react';
import type {
  OnChangeFn,
  PaginationState,
  SortingState
} from '@tanstack/react-table';
import { UserPlus, Users2 } from 'lucide-react';
import { getRouteApi } from '@tanstack/react-router';

import { DataTable } from '@/components/admin/data-table/data-table';
import { ConfirmDialog } from '@/components/admin/feedback/confirm-dialog';
import { EmptyState } from '@/components/admin/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/api-error';
import { createUserColumns } from '@/features/users/components/user-columns';
import { UserDetailSheet } from '@/features/users/components/user-detail-sheet';
import { UserFilterBar } from '@/features/users/components/user-filter-bar';
import { UserFormSheet } from '@/features/users/components/user-form-sheet';
import {
  useChangeUsersStatusMutation,
  useCreateUserMutation,
  useUserDetail,
  useUsersList,
  useUpdateUserMutation
} from '@/features/users/hooks/use-users';
import type { UserStatus } from '@/features/users/data/mock-users';
import type { UserFormValues } from '@/features/users/lib/schema';
import {
  defaultUsersSearch,
  toUsersPaginationState,
  toUsersSortingState,
  type UsersSearch,
  type UsersStatusFilter
} from '@/features/users/lib/search';

function resolveUpdater<T>(updater: T | ((previous: T) => T), current: T): T {
  return typeof updater === 'function'
    ? (updater as (previous: T) => T)(current)
    : updater;
}

const usersRouteApi = getRouteApi('/_authenticated/users');

export function UsersPage() {
  const navigate = usersRouteApi.useNavigate();
  const search = usersRouteApi.useSearch();
  const [statusConfirm, setStatusConfirm] = React.useState<{
    status: UserStatus;
    userIds: string[];
  } | null>(null);

  const usersListParams = React.useMemo(
    () => ({
      order: search.order,
      page: search.page,
      pageSize: search.pageSize,
      query: search.query,
      sort: search.sort,
      status: search.status
    }),
    [search]
  );

  const listQuery = useUsersList(usersListParams);
  const selectedUserId =
    search.detail ?? (search.form === 'edit' ? search.userId : undefined);
  const detailQuery = useUserDetail(selectedUserId);

  const closePanels = React.useCallback(() => {
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        detail: undefined,
        form: undefined,
        userId: undefined
      })
    });
  }, [navigate]);

  const createMutation = useCreateUserMutation(closePanels);
  const updateMutation = useUpdateUserMutation(closePanels);
  const changeStatusMutation = useChangeUsersStatusMutation(() => {
    setStatusConfirm(null);
  });

  const updateSearch = React.useCallback(
    (patch: Partial<UsersSearch>) => {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          ...patch
        })
      });
    },
    [navigate]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      updateSearch({
        page: defaultUsersSearch.page,
        query: value
      });
    },
    [updateSearch]
  );

  const handleStatusChange = React.useCallback(
    (value: UsersStatusFilter) => {
      updateSearch({
        page: defaultUsersSearch.page,
        status: value
      });
    },
    [updateSearch]
  );

  const handleSortingChange = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const nextSorting = resolveUpdater(updater, toUsersSortingState(search));
      const primarySorting = nextSorting[0];

      updateSearch({
        order: primarySorting?.desc ? 'desc' : 'asc',
        page: defaultUsersSearch.page,
        sort:
          (primarySorting?.id as UsersSearch['sort']) ?? defaultUsersSearch.sort
      });
    },
    [search, updateSearch]
  );

  const handlePaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const nextPagination = resolveUpdater(
        updater,
        toUsersPaginationState(search)
      );

      updateSearch({
        page: nextPagination.pageIndex + 1,
        pageSize: nextPagination.pageSize
      });
    },
    [search, updateSearch]
  );

  const openCreateUser = React.useCallback(() => {
    updateSearch({
      detail: undefined,
      form: 'create',
      userId: undefined
    });
  }, [updateSearch]);

  const openEditUser = React.useCallback(
    (userId: string) => {
      updateSearch({
        detail: undefined,
        form: 'edit',
        userId
      });
    },
    [updateSearch]
  );

  const openUserDetail = React.useCallback(
    (userId: string) => {
      updateSearch({
        detail: userId,
        form: undefined,
        userId: undefined
      });
    },
    [updateSearch]
  );

  const handleUserFormSubmit = React.useCallback(
    (values: UserFormValues) => {
      if (search.form === 'edit' && search.userId) {
        updateMutation.mutate({
          input: values,
          userId: search.userId
        });
        return;
      }

      createMutation.mutate(values);
    },
    [createMutation, search.form, search.userId, updateMutation]
  );

  const columns = React.useMemo(
    () =>
      createUserColumns({
        onEditUser: openEditUser,
        onOpenDetail: openUserDetail
      }),
    [openEditUser, openUserDetail]
  );

  const detailError = detailQuery.error
    ? getErrorMessage(detailQuery.error)
    : null;
  const listError = listQuery.error ? getErrorMessage(listQuery.error) : null;

  return (
    <>
      <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
        <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
              用户管理
            </h2>
            <p className='text-muted-foreground mt-2 text-sm leading-6'>
              工作区模式下，列表页只保留标题、工具栏和表格本体，减少无效包装对展示空间的挤压。
            </p>
          </div>
          <Button className='rounded-xl px-4' onClick={openCreateUser}>
            <UserPlus className='size-4' />
            新建用户
          </Button>
        </section>

        <DataTable
          columns={columns}
          data={listQuery.data?.items ?? []}
          defaultCellMaxChars={18}
          emptyState={
            <EmptyState
              action={
                <Button onClick={openCreateUser}>
                  <UserPlus className='size-4' />
                  新建第一个用户
                </Button>
              }
              description='调整当前筛选条件，或创建新成员来填充列表。'
              icon={<Users2 className='text-muted-foreground size-5' />}
              title='暂无用户数据'
            />
          }
          error={listError}
          fillHeight
          isLoading={listQuery.isLoading}
          onPaginationChange={handlePaginationChange}
          onRetry={() => {
            void listQuery.refetch();
          }}
          onSearchValueChange={handleSearchChange}
          onSortingChange={handleSortingChange}
          pageCount={
            listQuery.data
              ? Math.max(1, Math.ceil(listQuery.data.total / search.pageSize))
              : 1
          }
          pagination={toUsersPaginationState(search)}
          renderToolbar={(table) => {
            const selectedIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            return (
              <UserFilterBar
                onActivateSelected={() => {
                  if (!selectedIds.length) return;
                  setStatusConfirm({
                    status: 'Active',
                    userIds: selectedIds
                  });
                }}
                onStatusChange={handleStatusChange}
                onSuspendSelected={() => {
                  if (!selectedIds.length) return;
                  setStatusConfirm({
                    status: 'Suspended',
                    userIds: selectedIds
                  });
                }}
                selectedCount={selectedIds.length}
                status={search.status}
              />
            );
          }}
          searchColumn='name'
          searchPlaceholder='搜索用户、邮箱或角色...'
          searchValue={search.query}
          sorting={toUsersSortingState(search)}
          toolbarVariant='workspace'
        />
      </div>

      <UserDetailSheet
        error={detailError}
        isLoading={detailQuery.isLoading}
        onEdit={() => {
          if (search.detail) {
            openEditUser(search.detail);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            updateSearch({ detail: undefined });
          }
        }}
        open={Boolean(search.detail)}
        user={detailQuery.data}
      />

      <UserFormSheet
        initialUser={search.form === 'edit' ? detailQuery.data : undefined}
        mode={search.form === 'edit' ? 'edit' : 'create'}
        onOpenChange={(open) => {
          if (!open) {
            updateSearch({
              form: undefined,
              userId: undefined
            });
          }
        }}
        onSubmit={handleUserFormSubmit}
        open={search.form === 'create' || search.form === 'edit'}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        confirmLabel={
          statusConfirm?.status === 'Suspended'
            ? 'Suspend users'
            : 'Activate users'
        }
        description={
          statusConfirm?.status === 'Suspended'
            ? 'The selected operators will lose access until they are reactivated.'
            : 'The selected operators will be restored to an active state.'
        }
        onConfirm={() => {
          if (!statusConfirm) {
            return;
          }

          changeStatusMutation.mutate({
            status: statusConfirm.status,
            userIds: statusConfirm.userIds
          });
        }}
        onOpenChange={(open) => {
          if (!open) {
            setStatusConfirm(null);
          }
        }}
        open={Boolean(statusConfirm)}
        title={
          statusConfirm?.status === 'Suspended'
            ? 'Suspend selected users?'
            : 'Activate selected users?'
        }
        tone={statusConfirm?.status === 'Suspended' ? 'destructive' : 'default'}
      />
    </>
  );
}
