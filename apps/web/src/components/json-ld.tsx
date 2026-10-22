import type { StructuredDataGraph } from '@/lib/structured-data';

interface JsonLdProps {
  data: StructuredDataGraph;
}

/**
 * Inline JSON-LD. `<` is escaped so a future data value containing
 * `</script>` cannot break out of the block.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
