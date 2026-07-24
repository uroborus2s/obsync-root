# CR-003 Review Response

## CR-003-RF-001

Fixed. Metadata 契约测试现在精确断言 Core 与五个驱动的 peer ranges，并断言
五个驱动继续存在于 devDependencies。

Verified:

- `pnpm --filter @stratix/database exec vitest run
  src/__tests__/peer-dependencies.test.ts`：1/1 passed。
- `pnpm --filter @stratix/database exec vitest run`：9 files / 50 tests passed。
- `pnpm --filter @stratix/database exec tsc -p tsconfig.json --noEmit`：exit 0。

## CR-003-RF-002

Fixed. README 首行不再写死当前包版本；历史 “1.1.0 的变化” 章节保留。

Verified:

- README 首行版本匹配检查（`rg`）：no matches。
- `pnpm run docs:validate`：89 pages / 0 contracts。
- `git diff --check`：exit 0。
