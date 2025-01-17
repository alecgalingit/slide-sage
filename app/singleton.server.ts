// Borrowed from Remix indie stack--used to avoid reinstatiating database connection in app/db.server.ts

export const singleton = <Value>(
    name: string,
    valueFactory: () => Value,
  ): Value => {
    const g = global as unknown as { __singletons: Record<string, unknown> };
    g.__singletons ??= {};
    g.__singletons[name] ??= valueFactory();
    return g.__singletons[name] as Value;
  };