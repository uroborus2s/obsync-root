# 开发工作流

这一页不是讲架构，而是告诉你平时每天应该怎么开发，才能不把项目写乱。

## 日常开发的推荐顺序

对大多数业务需求，推荐按下面的顺序工作：

1. 先明确这次改动属于哪个业务资源
2. 能用 CLI 生成的骨架，先生成
3. 先补 repository，再补 service，再补 controller
4. 本地跑 `stratix doctor`
5. 本地跑 `pnpm build`
6. 有测试时跑 `pnpm test`

如果你总是不知道从哪里下手，这就是默认顺序。

## 常用 CLI 命令怎么用

### 初始化项目

```bash
stratix init app api my-app
```

### 查看模板和预设

```bash
stratix list templates
stratix list presets
```

### 新增标准业务资源

```bash
stratix generate resource user
```

这会一次生成 controller、service、repository 三层骨架。

### 单独生成某一层

```bash
stratix generate controller user
stratix generate service user
stratix generate repository user
```

适合你只缺一层、而不是想重建整个资源时使用。

### 生成多表业务仓储

```bash
stratix add preset database
stratix generate business-repository order
```

适合做复杂耐久化业务单元，不适合拿来替代普通 CRUD。

### 新增模块目录骨架

```bash
stratix generate module billing
```

适合你想按模块拆目录，而不是所有 controller / service / repository 全堆在根目录时使用。

但要注意一个现实限制：当前 CLI 的 `module` 生成器只会给你一个起始骨架，后续新增的 `business-repository`、`executor` 等文件不会自动落到现有模块目录里。怎么从单表 CRUD 平稳演进到模块化结构，建议直接看 [`from-crud-to-modules.md`](./from-crud-to-modules.md)。

### 健康检查

```bash
stratix doctor
```

这是每次做完结构调整后都值得跑一遍的命令。

## 推荐的实现顺序为什么是 repository -> service -> controller

因为绝大多数业务功能，数据结构一旦确定：

- service 的调用方式就确定了
- controller 的响应格式也就确定了

反过来，如果你先写 controller，后面很容易因为数据结构变化而来回返工。

## 什么时候加 preset

很多新手会一开始把 `database`、`redis`、`queue`、`tasks` 全加上，这通常不是好习惯。

更稳妥的顺序是：

- 先做出最小可运行接口
- 再判断当前业务到底缺哪种基础设施
- 只加真正需要的 preset

这样能显著降低项目初期复杂度。

## 每完成一个功能后，至少做这三件事

```bash
stratix doctor
pnpm build
pnpm test
```

如果项目暂时还没测试，也至少保证前两步通过。

如果你还不确定“这个测试到底该怎么写”，先看 [`testing-and-debugging.md`](./testing-and-debugging.md) 再回来。

## 配置和环境变量的工作流

如果你的项目有敏感配置，不要把密钥散落到各个 service 里。推荐工作流是：

1. 在配置层统一声明变量来源
2. 把敏感信息放进加密配置或部署环境
3. 通过 `src/stratix.config.ts` 映射到插件配置

CLI 自带的配置工具命令：

```bash
stratix config generate-key
stratix config encrypt
stratix config decrypt
stratix config validate
```

## 一个最小可执行的开发循环

如果你刚开始做业务开发，可以把每次迭代固定成下面这个循环：

1. 生成骨架
2. 补 repository 返回数据
3. 补 service 业务逻辑
4. 补 controller 响应
5. 启动项目手工访问接口
6. 跑 doctor / build / test

只要你一直按这个顺序做，项目结构通常不会很快失控。
