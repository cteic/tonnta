/**
 * URL slug for a bathing water, from its EPA name. Self-contained so the
 * registry generator can import it under Node's type stripping.
 */
export function bathingWaterSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
