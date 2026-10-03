'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCountryFlag } from '@/lib/country-flag';

interface CountryFlagProps {
  countryCode: string | null;
  countryName: string;
}

export default function CountryFlag({ countryCode, countryName }: CountryFlagProps) {
  const src = useMemo(() => getCountryFlag(countryCode), [countryCode]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <span
      className="inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden"
      aria-label={src && !hasError ? `${countryName} flag` : `${countryName} flag unavailable`}
      role="img"
    >
      {src && !hasError ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setHasError(true)}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-slate-500"
        >
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M3.8 12h16.4M12 3.5c2 2.2 3 5 3 8.5s-1 6.3-3 8.5c-2-2.2-3-5-3-8.5s1-6.3 3-8.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      )}
    </span>
  );
}