# 从零做一个业务页

这篇文档面向第一次写 `web-admin` 应用的人。目标很简单：你照着做，最后能在左侧菜单里点开一个自己新增的页面。

本示例选择新增一个“客户管理”页面，路径是 `/customers`。

## 1. 先准备一个可运行应用

如果你还没有自己的脚手架项目，先在仓库里生成一个：

```bash
pnpm --filter @stratix/cli build
mkdir -p examples
cd examples
node ../packages/cli/dist/bin/stratix.js init app web-admin my-admin --no-install
cd my-admin
pnpm install --ignore-workspace
```

开发时常用命令：

```bash
pnpm dev
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

如果你只是先理解模板，也可以直接参考仓库现成样例：

- `examples/web-admin-preview`

## 2. 第一步：写页面组件

先新增页面文件：

- `src/features/customers/pages/customers-page.tsx`

第一版不要一上来就接后端。先把页面骨架、标题和一组本地假数据跑起来，确认路由和菜单是通的。

```tsx
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const mockCustomers = [
  {
    id: 'cust_001',
    level: 'A',
    name: '华北一公司',
    owner: '张三',
    status: '跟进中',
  },
  {
    id: 'cust_002',
    level: 'B',
    name: '华东示范客户',
    owner: '李四',
    status: '待签约',
  },
]

export function CustomersPage() {
  return (
    <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
      <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            客户管理
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            第一版先确认页面、菜单和路由已经完整接通。
          </p>
        </div>
        <Button className='rounded-xl px-4'>
          <Plus className='size-4' />
          新建客户
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>客户列表</CardTitle>
          <CardDescription>
            先用本地假数据占位，等页面走通后再接接口。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {mockCustomers.map((customer) => (
            <div
              key={customer.id}
              className='flex items-center justify-between rounded-xl border px-4 py-3'
            >
              <div>
                <div className='font-medium'>{customer.name}</div>
                <div className='text-sm text-muted-foreground'>
                  负责人：{customer.owner} · 等级：{customer.level}
                </div>
              </div>
              <div className='text-sm text-muted-foreground'>
                {customer.status}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

为什么先这样做：

- 你先验证“能不能进页面”，而不是一开始就把问题混到接口、状态管理和表单里。
- 小步推进时，出错位置更容易判断。

## 3. 第二步：注册路由

新增路由文件：

- `src/routes/_authenticated/customers.tsx`

内容如下：

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { CustomersPage } from '@/features/customers/pages/customers-page'

export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomersPage,
})
```

这里要注意两件事：

- 路由文件路径和 `createFileRoute()` 里的路径要一致。
- `routeTree.gen.ts` 是生成文件，不要手改。通常跑一次 `pnpm dev` 或 `pnpm build` 后会自动更新。

## 4. 第三步：把页面放进左侧菜单

打开：

- `src/app/config/navigation.ts`

在合适的分组里新增一个菜单项。最简单的方式，是先放到“系统管理”或“运营中心”下面：

```ts
{
  kind: 'item',
  title: '客户管理',
  to: '/customers',
  description: '查看客户列表、负责人和跟进状态',
  icon: 'users',
  keywords: ['客户', 'crm', 'customers'],
}
```

做到这里，你应该已经能从左侧菜单进入 `/customers` 页面了。

## 5. 第四步：跑起来，确认链路真的通了

在项目目录执行：

```bash
pnpm dev
```

你应该能看到下面结果：

- 左侧导航出现“客户管理”
- 点击后能进入新页面
- 页面能看到两条 mock 数据
- 浏览器没有路由报错

如果这里还没通，不要继续往下加接口。先把最小链路打通。

## 6. 想把“页面”升级成“功能”时，下一步改哪里

当你的页面已经能打开，接下来通常有三种演进方向。

### 6.1 只做静态展示页

直接参考这些现成模块：

- `src/features/dashboard/pages/dashboard-page.tsx`
- `src/features/reports/pages/reports-page.tsx`
- `src/features/settings/pages/settings-page.tsx`

适用场景：

- 首页概览
- 只读报表
- 配置说明页

### 6.2 做列表查询页

优先参考：

- `src/features/users/pages/users-page.tsx`
- `src/features/users/hooks/use-users.ts`
- `src/features/users/api/users.ts`
- `src/features/users/lib/search.ts`

适用场景：

- 列表
- 搜索
- 分页
- 排序
- 详情侧边栏

### 6.3 做表单和 CRUD

继续参考 `users` 模块里的这些文件：

- `src/features/users/components/user-form-sheet.tsx`
- `src/features/users/components/user-detail-sheet.tsx`
- `src/features/users/lib/schema.ts`

适用场景：

- 新建
- 编辑
- 状态切换
- 表单校验

最实用的经验是：不要从 0 发明一套新写法，先复制一个最接近的现成模块，再改成你的业务名词。

## 7. 新手最容易踩的坑

### 7.1 菜单有了，但点开 404

优先检查：

- `navigation.ts` 里的 `to` 是否是 `/customers`
- 路由文件名是否是 `src/routes/_authenticated/customers.tsx`
- `createFileRoute('/_authenticated/customers')` 是否写对

### 7.2 页面文件写好了，但没有显示

优先检查：

- 页面组件是否正确导出 `CustomersPage`
- 路由文件是否正确引入页面组件
- `pnpm dev` 是否已经重新生成 `routeTree.gen.ts`

### 7.3 一上来就想接真实后端，结果哪里都报错

先回到“本地假数据 + 页面骨架”这一步。模板开发最怕把问题混在一起。你应当按这个顺序推进：

1. 页面能打开
2. 菜单能进入
3. 假数据能显示
4. 再接 `api/`
5. 再补 `hooks/`
6. 最后再做表单和复杂交互

## 8. 完成这个练习后，你应该达到的标准

至少确认下面四件事：

- 你能自己新增一个页面
- 你知道菜单、路由、页面分别改哪里
- 你知道复杂页面优先参考 `features/users/`
- 你能跑通下面这组验收命令

```bash
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

如果这一步你已经做通，再去做“接真实接口”和“拆分独立业务模块”，难度会明显下降。
