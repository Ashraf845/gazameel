/** مهلة لطلبات الشبكة حتى لا تعلق الصفحة إن تباطأ Supabase */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number
): Promise<T | null> {
  return Promise.race([
    promise.then((v) => v, () => null),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}
