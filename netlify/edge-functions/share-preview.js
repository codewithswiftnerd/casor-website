const PROJECT = 'casorwebsite';
const API = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const SITE_NAME = 'CASOR UNIPORT';
const DEFAULT_IMAGE = '/images/icon-512.png';

const ADMIN = {
  'president': ['President', 'unit-president'],
  'vice-president': ['Vice President', 'unit-vice-president'],
  'general-secretary': ['General Secretary', 'unit-general-secretary'],
  'asst-general-secretary': ['Assistant General Secretary', 'unit-asst-general-secretary']
};

const UNIT_SLOTS = {
  'unit-finance': 'unit-finance',
  'unit-prayer': 'unit-prayer',
  'unit-evangelism': 'unit-evangelism',
  'unit-follow-up': 'unit-followup',
  'unit-outreach': 'unit-outreach',
  'unit-brothers-and-sisters-leaders': 'unit-bro-sis-leaders',
  'unit-brothers-and-sisters-welfare': 'unit-bro-sis-welfare',
  'unit-bible-study': 'unit-bible-study',
  'unit-publicity': 'unit-publicity',
  'unit-public-relations-officer': 'unit-pro',
  'unit-male-and-female-park-coordinators': 'unit-park-coordinators',
  'unit-shalom': 'unit-shalom',
  'unit-organizing': 'unit-organizing',
  'unit-drama': 'unit-drama',
  'unit-press-and-academic': 'unit-press-academic',
  'unit-ambassadors-bible-college': 'unit-abc-principal',
  'unit-final-year-brethren-fellowship': 'unit-fybf-coordinator'
};

function value(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
  return null;
}

function fields(f) {
  const out = {};
  for (const k of Object.keys(f || {})) out[k] = value(f[k]);
  return out;
}

async function getDoc(collection, id) {
  if (!id || /[\/]/.test(id)) return null;
  const res = await fetch(`${API}/${collection}/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return fields(json.fields);
}

async function firstWhere(collection, field, equals) {
  const res = await fetch(`${API}:runQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: equals } } },
        limit: 1
      }
    })
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) && rows.find(r => r.document);
  return row ? fields(row.document.fields) : null;
}

function driveId(url) {
  const m = String(url || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
  return m ? (m[1] || m[2] || m[3]) : null;
}

function photoUrl(url) {
  if (!url) return null;
  const u = String(url);
  if (/lh3\.googleusercontent\.com\/d\//.test(u)) return u.replace(/=w\d+.*$/, '') + '=w1200';
  if (/drive\.google\.com|docs\.google\.com/.test(u)) {
    const id = driveId(u);
    return id ? `https://lh3.googleusercontent.com/d/${id}=w1200` : null;
  }
  return u;
}

function docThumb(url) {
  const u = String(url || '');
  if (!/drive\.google\.com|docs\.google\.com/.test(u)) return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) ? u : null;
  const id = driveId(u);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : null;
}

function clip(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trim() + '…' : t;
}

function decode(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function slotImage(slot, html) {
  const saved = await getDoc('site_images', slot);
  if (saved && saved.url) return saved.url;
  const m = html.match(new RegExp(`<img[^>]*src="([^"]+)"[^>]*data-img-slot="${slot}"`));
  return m ? m[1] : null;
}

async function unitPreview(id, html) {
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return null;
  if (ADMIN[id]) {
    const [role, slot] = ADMIN[id];
    const card = html.match(new RegExp(`id="${id}"[\\s\\S]*?<p>([\\s\\S]*?)</p>`));
    return {
      title: `${role} - ${SITE_NAME} Admin House`,
      description: card ? decode(card[1]) : `Meet the ${role} of ${SITE_NAME}.`,
      image: photoUrl(await slotImage(slot, html))
    };
  }
  const block = html.match(new RegExp(`<li class="unit-item" id="${id}"[^>]*>([\\s\\S]*?)</li>\\s*(?=<li class="unit-item"|</ol>)`));
  if (!block) return null;
  const name = block[1].match(/<span class="unit-name">([\s\S]*?)<\/span>/);
  const about = block[1].match(/<div class="unit-panel"[^>]*>\s*<p>([\s\S]*?)<\/p>/);
  const slot = UNIT_SLOTS[id];
  return {
    title: `${decode(name ? name[1] : 'Unit')} - ${SITE_NAME}`,
    description: about ? clip(decode(about[1]), 200) : `Join a unit at ${SITE_NAME}.`,
    image: slot ? photoUrl(await slotImage(slot, html)) : null
  };
}

async function preview(page, params, html) {
  if (page === 'library') {
    if (params.get('doc')) {
      const d = await getDoc('library', params.get('doc'));
      if (!d) return null;
      const bits = [d.category, d.courseCode, d.level].filter(Boolean).join(' · ');
      return {
        title: `${d.title || 'Document'} - ${SITE_NAME} e-Library`,
        description: `${bits ? bits + '. ' : ''}Free to read and download on the ${SITE_NAME} e-Library.`,
        image: docThumb(d.url)
      };
    }
    if (params.get('group')) {
      const g = await getDoc('study_groups', params.get('group'));
      if (!g || g.active === false) return null;
      return {
        title: `${g.title} (${g.course}) - ${SITE_NAME} study group`,
        description: [g.schedule, g.venue].filter(Boolean).join(' · ') || g.description || 'Join this study group on WhatsApp.',
        image: null
      };
    }
    if (params.get('folder')) {
      const f = await getDoc('folders', params.get('folder'));
      if (!f) return null;
      return { title: `${f.name} - ${SITE_NAME} e-Library`, description: `Study materials in the "${f.name}" folder. Free to read and download.`, image: null };
    }
  }
  if (page === 'news' && params.get('post')) {
    const n = await getDoc('news', params.get('post'));
    if (!n) return null;
    return { title: n.title || `${SITE_NAME} News`, description: clip(n.body, 200) || `News from ${SITE_NAME}.`, image: photoUrl(n.imageUrl) };
  }
  if (page === 'events' && params.get('program')) {
    const p = await getDoc('programs', params.get('program'));
    if (!p) return null;
    const when = p.dateBadge ? String(p.dateBadge).replace(/\n/g, ' ') : '';
    return {
      title: `${p.title || 'Program'} - ${SITE_NAME}`,
      description: [p.tag, when].filter(Boolean).join(' · ') || `Join us at ${SITE_NAME}.`,
      image: photoUrl(p.imageUrl)
    };
  }
  if (page === 'gallery' && params.get('album')) {
    const albumId = params.get('album');
    const photoId = params.get('photo');
    const f = albumId === '__highlights__' ? { name: 'Fellowship Highlights', coverUrl: '/images/CASOR.jpg' } : await getDoc('folders', albumId);
    if (!f) return null;
    if (photoId && !/^\d+$/.test(photoId)) {
      const ph = await getDoc('galleryPhotos', photoId);
      if (ph && ph.url) {
        return {
          title: `${ph.caption || f.name} - ${SITE_NAME} Gallery`,
          description: `A photo from "${f.name}" in the ${SITE_NAME} gallery.`,
          image: photoUrl(ph.url)
        };
      }
    }
    let cover = f.coverUrl;
    if (!cover) {
      const first = await firstWhere('galleryPhotos', 'folderId', albumId);
      cover = first && first.url;
    }
    return { title: `${f.name} - ${SITE_NAME} Gallery`, description: `Photos from "${f.name}" in the ${SITE_NAME} gallery.`, image: photoUrl(cover) };
  }
  if (page === 'units' && params.get('unit')) {
    return unitPreview(params.get('unit'), html);
  }
  return null;
}

function inject(html, p, pageUrl, origin) {
  let image = p.image || DEFAULT_IMAGE;
  if (image.startsWith('/')) image = origin + image;
  else if (!/^https?:\/\//.test(image)) image = origin + '/' + image;
  const big = image !== origin + DEFAULT_IMAGE;
  const tags = [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(p.title)}" />`,
    `<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`
  ].join('\n    ');
  return html
    .replace(/\s*<meta\s+(property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g, '')
    .replace(/<meta\s+name="description"[^>]*>/, `<meta name="description" content="${esc(p.description)}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(pageUrl)}" />`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>\n    ${tags}`);
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  if (![...url.searchParams.keys()].length) return;
  const page = url.pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');

  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.includes('text/html')) return response;

  const html = await response.text();
  let p = null;
  try {
    p = await withTimeout(preview(page, url.searchParams, html), 3000);
  } catch (err) {
    p = null;
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (!p) return new Response(html, { status: response.status, headers });
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(inject(html, p, url.href, url.origin), { status: response.status, headers });
}

export const config = {
  path: [
    '/library.html', '/library',
    '/news.html', '/news',
    '/events.html', '/events',
    '/gallery.html', '/gallery',
    '/units.html', '/units'
  ]
};
