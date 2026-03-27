export async function enableMocking() {
  const { worker } = await import('./browser')

  await worker.start({
    onUnhandledRequest: 'bypass',
  })
}
