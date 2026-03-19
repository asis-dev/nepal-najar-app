'use client';

import type { ReactNode } from 'react';

export function PublicPageHero({
  eyebrow,
  title,
  description,
  aside,
  stats,
  centered = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  stats?: ReactNode;
  centered?: boolean;
}) {
  return (
    <section className="public-section pt-8 sm:pt-10">
      <div className="public-shell">
        <div
          className={`public-page-hero ${centered ? 'public-page-hero--centered' : ''}`}
        >
          <div className="public-page-hero__copy">
            {eyebrow ? <div className="public-page-eyebrow">{eyebrow}</div> : null}
            <h1 className="public-page-title">{title}</h1>
            {description ? <p className="public-page-description">{description}</p> : null}
          </div>
          {aside ? <div className="public-page-hero__aside">{aside}</div> : null}
        </div>
        {stats ? <div className="public-page-stats">{stats}</div> : null}
      </div>
    </section>
  );
}
