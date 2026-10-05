import { NextRequest, NextResponse } from 'next/server';
import { getDomainForSlug, getIconAlias } from '@/lib/otp-logos';

export const dynamic = 'force-dynamic';

const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e',
  '#f59e0b', '#06b6d4', '#6366f1', '#ec4899',
];

function generateLetterAvatarSvg(name: string): string {
  const initial = (name || 'S').trim().charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <rect width="60" height="60" rx="16" fill="${color}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="28" fill="#ffffff">${initial}</text>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get('slug') || '').toLowerCase().trim();
  const name = searchParams.get('name') || slug || 'Service';

  if (!slug) {
    return new NextResponse(generateLetterAvatarSvg(name), {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }

  const domain = getDomainForSlug(slug);

  // ─── SOURCE 1: Unavatar API (Full-Color Official Brand Logos) ───
  if (domain) {
    try {
      const unavatarUrl = `https://unavatar.io/${domain}?fallback=false`;
      const res = await fetch(unavatarUrl, { next: { revalidate: 2592000 } });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/png';
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
          },
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  // ─── SOURCE 2: Google 128px HD Favicon API (Always Has Real Color Logos) ───
  if (domain) {
    try {
      const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const res = await fetch(googleUrl, { next: { revalidate: 2592000 } });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/png';
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
          },
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  // ─── SOURCE 3: Iconify Colored Vector ───
  try {
    const targetUrl = `https://api.iconify.design/simple-icons:${encodeURIComponent(getIconAlias(slug))}.svg`;
    const res = await fetch(targetUrl, { next: { revalidate: 2592000 } });
    if (res.ok) {
      const svgText = await res.text();
      return new NextResponse(svgText, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        },
      });
    }
  } catch (e) {
    // Fallback
  }

  // ─── SOURCE 4: Letter Avatar Fallback ───
  return new NextResponse(generateLetterAvatarSvg(name), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=604800, s-maxage=604800',
    },
  });
}