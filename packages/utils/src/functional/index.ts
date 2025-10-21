/**
 * 函数式编程工具库统一导出
 */

// 核心类型
export * from './types.js';

export { compose, composeAsync, pipe, pipeAsync } from './pipe.js';

export {
  add,
  autoCurry,
  branchCompose,
  combinators,
  composeIf,
  composeWithFallback,
  curry,
  curry2,
  curry3,
  curry4,
  curryAsync,
  curryBranch,
  CurryCache,
  compose as curryCompose,
  filter as curryFilter,
  curryIf,
  map as curryMap,
  curryN,
  pipe as curryPipe,
  CurryStats,
  curryTyped,
  debugCompose,
  debugCurry,
  flip,
  getPath,
  higherOrder,
  includes,
  memoizeCompose,
  memoizedCurry,
  multiply,
  parallel,
  partial,
  partialAt,
  partialIf,
  partialLazy,
  partialMemo,
  partialRight,
  perfCurry,
  pipeCurried,
  placeholder,
  pointFree,
  race,
  reduce,
  safeCurry,
  setPath,
  typedCurry
} from './curry.js';

// Optics/Lens系统
export {
  commonLenses,
  composeLens,
  immutable,
  iso,
  lensBuilder,
  lensIndex,
  lensPath,
  lensProp,
  modify,
  prismArray,
  prismOptional,
  set,
  traversalArray,
  traversalFilter,
  traversalValues,
  update,
  view,
  type Iso,
  type Lens,
  type Prism,
  type Traversal
} from './optics.js';

export { memo, memoAsync, memoWeak } from './memo.js';

// Either相关函数使用E前缀
export {
  all as eitherAll,
  ap as eitherAp,
  bimap as eitherBimap,
  chain as eitherChain,
  Do as EitherDo,
  filter as eitherFilter,
  flatMap as eitherFlatMap,
  fold as eitherFold,
  fromJSON as eitherFromJSON,
  getOrElse as eitherGetOrElse,
  getOrElseW as eitherGetOrElseW,
  left as eitherLeft,
  lift as eitherLift,
  lift2 as eitherLift2,
  lift3 as eitherLift3,
  map as eitherMap,
  mapLeft as eitherMapLeft,
  right as eitherRight,
  sequence as eitherSequence,
  sequenceParallel as eitherSequenceParallel,
  swap as eitherSwap,
  toJSON as eitherToJSON,
  traverse as eitherTraverse,
  validate as eitherValidate,
  isLeft,
  isRight,
  tryCatch,
  tryCatchAsync,
  type Either,
  type Left,
  type Right
} from './either.js';

// Maybe相关函数使用M前缀
export {
  fromNullable,
  isNone,
  isSome,
  alt as maybeAlt,
  chain as maybeChain,
  Do as MaybeDo,
  filter as maybeFilter,
  filterMap as maybeFilterMap,
  firstSome as maybeFirstSome,
  flatMap as maybeFlatMap,
  fold as maybeFold,
  fromJSON as maybeFromJSON,
  fromPromise as maybeFromPromise,
  getOrElse as maybeGetOrElse,
  getOrElseW as maybeGetOrElseW,
  lazy as maybeLazy,
  map as maybeMap,
  mapNullable as maybeMapNullable,
  none as maybeNone,
  sequence as maybeSequence,
  sequenceParallel as maybeSequenceParallel,
  some as maybeSome,
  toJSON as maybeToJSON,
  traverse as maybeTraverse,
  tryAll as maybeTryAll,
  when as maybeWhen
} from './maybe.js';

// 性能优化工具 - 使用别名避免与async模块冲突
export {
  batch,
  concurrencyLimit,
  debounce,
  withRetry as funcWithRetry,
  withTimeout as funcWithTimeout,
  SmartCache,
  throttle,
  withLogging,
  withPerformanceMonitoring,
  withSmartCache
} from './performance.js';

// 品牌类型
export {
  Base64String,
  combineBrands,
  convertBrand,
  createBrand,
  createIdGenerator,
  EmailAddress,
  generateUUID,
  IpAddress,
  JsonString,
  mapBrand,
  NonNegativeNumber,
  now,
  Percentage,
  Port,
  PositiveInteger,
  Timestamp,
  Url,
  UserId,
  UUID,
  validateBrands
} from './brands.js';

// 流式处理
export {
  AsyncStream,
  asyncStreamPipe,
  chunk,
  cycle,
  delay,
  distinct,
  fibonacci,
  fromArray,
  fromAsyncGenerator,
  fromGenerator,
  fromPromises,
  groupBy,
  interleave,
  merge,
  primes,
  range,
  repeat,
  sort,
  Stream,
  streamPipe,
  window
} from './streams.js';
