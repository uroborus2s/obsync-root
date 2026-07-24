# CR-003 实施报告

## 实施

- 为五个方言专属 peer 增加 `peerDependenciesMeta.optional`。
- Core peer 保持必需，版本范围保持 `workspace:^1.1.0`。
- README 增加各方言驱动的按需安装命令。
- 增加 metadata 契约测试和 Database patch changeset。

## 影响

消费者安装 Database 时不再被要求安装未使用方言的驱动；选择某个方言后，
仍需自行安装对应驱动。运行时加载逻辑未改变。

## 验证

契约测试完成 RED/GREEN；Database build、typecheck、lint、50/50 tests，
tarball 元数据、无驱动 strict consumer smoke 和完整 `quality:release` 均通过。
未升级版本，未发布 npmjs 或 Aliyun。
