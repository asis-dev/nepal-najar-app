import { governmentServiceSchema } from '@/lib/seo';

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(governmentServiceSchema()),
      }}
    />
  );
}
