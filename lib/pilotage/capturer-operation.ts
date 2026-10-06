export type ResultatOperation<T> =
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown }

export async function capturerOperation<T>(
  operation: () => T | Promise<T>,
): Promise<ResultatOperation<T>> {
  try {
    return { status: 'success', value: await operation() }
  } catch (error) {
    return { status: 'error', error }
  }
}
