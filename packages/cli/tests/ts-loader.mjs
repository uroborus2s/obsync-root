const stratixCoreStubUrl = new URL('./stubs/stratix-core.stub.ts', import.meta.url)
  .href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@stratix/core') {
    return {
      url: stratixCoreStubUrl,
      shortCircuit: true
    };
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    specifier.endsWith('.js')
  ) {
    try {
      return await nextResolve(specifier.replace(/\.js$/, '.ts'), context);
    } catch {
      return nextResolve(specifier, context);
    }
  }

  return nextResolve(specifier, context);
}
