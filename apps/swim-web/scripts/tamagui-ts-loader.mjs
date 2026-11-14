import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HAS_EXTENSION = /\.[a-z]+$/i;

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');

  if (isRelative && !HAS_EXTENSION.test(specifier)) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      const withTs = `${specifier}.ts`;
      const candidate = new URL(withTs, context.parentURL);

      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(withTs, context);
      }

      throw error;
    }
  }

  return nextResolve(specifier, context);
}
