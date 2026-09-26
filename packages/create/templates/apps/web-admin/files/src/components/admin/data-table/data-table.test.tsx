// @vitest-environment jsdom
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataTable } from './data-table'

type Item = { key: string; name: string }
const columns: ColumnDef<Item>[] = [{ accessorKey: 'name', header: '姓名' }]
const items = Array.from({ length: 10000 }, (_, index) => ({
  key: `item-${index}`,
  name: `记录 ${index}`,
}))
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  HTMLElement.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return {
        width: 1000,
        height: this.tagName === 'TR' ? 48 : 480,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 480,
        x: 0,
        y: 0,
        toJSON() {},
      }
    }
  )
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'TR' ? 48 : 480
    }
  )
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1000)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const render = async (element: React.ReactNode) => {
  await act(async () => root.render(element))
}
const button = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

describe('shared table pagination', () => {
  it('shows zero pages for empty data and disables navigation', async () => {
    await render(<DataTable columns={columns} data={[]} />)
    expect(container.textContent).toContain('第 0 / 0 页')
    expect(container.textContent).toContain('共 0 条')
    expect(button('上一页').disabled).toBe(true)
    expect(button('下一页').disabled).toBe(true)
  })

  it('uses the server total and reaches the exact last page', async () => {
    function ServerPage() {
      const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 1,
        pageSize: 10,
      })
      return (
        <DataTable
          columns={columns}
          data={items.slice(10, 20)}
          onPaginationChange={setPagination}
          pagination={pagination}
          rowCount={95}
        />
      )
    }
    await render(<ServerPage />)
    expect(container.textContent).toContain('共 95 条')
    expect(container.textContent).toContain('第 2 / 10 页')
    await act(async () => button('末页').click())
    expect(container.textContent).toContain('第 10 / 10 页')
    expect(button('下一页').disabled).toBe(true)
  })

  it('exposes configurable page sizes and resets to the first page on resize', async () => {
    const pageItems = items.slice(0, 95)
    function Page() {
      const [pagination, setPagination] = React.useState({
        pageIndex: 2,
        pageSize: 10,
      })
      return (
        <DataTable
          columns={columns}
          data={pageItems}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 25, 50]}
        />
      )
    }
    await render(<Page />)
    const select = container.querySelector<HTMLElement>(
      '[aria-label="每页条数"]'
    )!
    await act(async () =>
      select.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    )
    const option = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => node.textContent === '25')!
    expect(option).toBeDefined()
    await act(async () =>
      option.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    )
    expect(container.textContent).toContain('第 1 / 4 页')
    expect(container.querySelectorAll('tbody tr[data-row-id]').length).toBe(25)
  })

  it('never invents a total or last page for cursor results and respects hasNextPage', async () => {
    await render(
      <DataTable
        columns={columns}
        data={items.slice(0, 10)}
        hasNextPage={false}
        pagination={{ pageIndex: 2, pageSize: 10 }}
      />
    )
    expect(container.textContent).toContain('第 3 页')
    expect(container.textContent).toContain('本页 10 条')
    expect(container.textContent).not.toContain('/ -1')
    expect(button('末页')).toBeNull()
    expect(button('下一页').disabled).toBe(true)
    await render(
      <DataTable
        columns={columns}
        data={items.slice(0, 10)}
        hasNextPage
        pagination={{ pageIndex: 2, pageSize: 10 }}
      />
    )
    expect(button('下一页').disabled).toBe(false)
  })
})

describe('row rendering', () => {
  it('preserves grouped headers, pinned cells and collapsed groups while virtualized', async () => {
    const grouped: ColumnDef<Item>[] = [
      { accessorKey: 'key', header: '编号', meta: { pin: 'left' } },
      {
        id: 'details',
        header: '详细信息',
        meta: { expandableGroup: { keepVisibleLeafIds: ['name'] } },
        columns: [
          ...columns,
          { id: 'extra', header: '详情', cell: () => '详情' },
        ],
      },
    ]
    await render(
      <DataTable
        columns={grouped}
        data={items}
        enablePagination={false}
        virtualizeRows
      />
    )
    expect(container.querySelector('th[colspan="2"]')?.textContent).toContain(
      '详细信息'
    )
    expect(
      container.querySelector<HTMLElement>('tbody tr[data-row-id] td')!.style
        .position
    ).toBe('sticky')
    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-expanded="true"]'
    )!
    await act(async () => toggle.click())
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(
      container.querySelectorAll('tbody tr[data-row-id]:first-child td').length
    ).toBe(2)
  })

  it('keeps loading bounded and retains retry and empty states in virtual mode', async () => {
    const onRetry = vi.fn()
    await render(
      <DataTable
        columns={columns}
        data={[]}
        isLoading
        pagination={{ pageIndex: 0, pageSize: 10000 }}
        virtualizeRows
      />
    )
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(50)
    expect(button('下一页').disabled).toBe(true)
    await render(
      <DataTable
        columns={columns}
        data={[]}
        error='网络不可用'
        onRetry={onRetry}
        virtualizeRows
      />
    )
    expect(container.textContent).toContain('网络不可用')
    const retry = [...container.querySelectorAll('button')].find(
      (node) => node.textContent === 'Try again'
    )!
    await act(async () => retry.click())
    expect(onRetry).toHaveBeenCalledOnce()
    await render(
      <DataTable
        columns={columns}
        data={[]}
        emptyState='没有匹配记录'
        virtualizeRows
      />
    )
    expect(container.textContent).toContain('没有匹配记录')
  })

  it('keeps selection attached to the supplied row identity after data reorder', async () => {
    const selectionColumns: ColumnDef<Item>[] = [
      {
        id: 'select',
        cell: ({ row }) => (
          <input
            aria-label={row.original.key}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            type='checkbox'
          />
        ),
      },
      ...columns,
    ]
    await render(
      <DataTable
        columns={selectionColumns}
        data={items.slice(0, 2)}
        getRowId={(row) => row.key}
      />
    )
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[aria-label="item-0"]')!
        .click()
    )
    await render(
      <DataTable
        columns={selectionColumns}
        data={[items[1], items[0]]}
        getRowId={(row) => row.key}
      />
    )
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="item-0"]')!
        .checked
    ).toBe(true)
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="item-1"]')!
        .checked
    ).toBe(false)
  })

  it('resets selection when the demo switches its keyed browsing mode', async () => {
    const props = {
      columns,
      data: items,
      getRowId: (row: Item) => row.key,
      renderToolbar: (table: import('@tanstack/react-table').Table<Item>) => (
        <button
          onClick={() => table.getRow('item-0').toggleSelected()}
          type='button'
        >
          选择首行
        </button>
      ),
    }
    await render(
      <DataTable
        {...props}
        enablePagination={false}
        key='virtual'
        virtualizeRows
      />
    )
    const select = [...container.querySelectorAll('button')].find(
      (node) => node.textContent === '选择首行'
    )!
    await act(async () => select.click())
    expect(
      container
        .querySelector('tr[data-row-id="item-0"]')
        ?.getAttribute('data-state')
    ).toBe('selected')
    await render(<DataTable {...props} key='paged' />)
    expect(
      container
        .querySelector('tr[data-row-id="item-0"]')
        ?.getAttribute('data-state')
    ).not.toBe('selected')
    expect(container.querySelectorAll('tbody tr[data-row-id]').length).toBe(10)
  })

  it('renders only a viewport of 10000 rows and moves that window on scroll', async () => {
    await render(
      <DataTable
        columns={columns}
        data={items}
        enablePagination={false}
        getRowId={(row) => row.key}
        virtualizeRows
      />
    )
    const rows = () => container.querySelectorAll('tbody tr[data-row-id]')
    expect(rows().length).toBeGreaterThan(0)
    expect(rows().length).toBeLessThan(50)
    expect(rows()[0].getAttribute('data-row-id')).toBe('item-0')
    const viewport = container.querySelector<HTMLElement>(
      '[data-virtualized="true"]'
    )!
    await act(async () => {
      viewport.scrollTop = 48000
      viewport.dispatchEvent(new Event('scroll'))
    })
    expect(rows().length).toBeLessThan(50)
    expect(
      Number(rows()[0].getAttribute('data-row-id')!.replace('item-', ''))
    ).toBeGreaterThan(900)
    expect(button('下一页')).toBeNull()
  })
})
