import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { products as frontendProducts } from '../src/data/products.js';
import { aboutContent } from '../src/data/about.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const SITE_URL = normalizeBaseUrl(process.env.VITE_PUBLIC_SITE_URL || 'https://zajkologia.com');
const API_BASE_URL = normalizeBaseUrl(
  process.env.VITE_SEO_API_BASE_URL || process.env.VITE_API_BASE_URL || 'https://zajky.zentrobot.io'
);
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const DEFAULT_IMAGE = `${SITE_URL}/zajo.png`;

const HOME_TITLE = 'Zajkológia | Starostlivosť o králiky zrozumiteľne';
const HOME_DESCRIPTION =
  'Zrozumiteľné články a praktické digitálne príručky pre starostlivosť o králiky.';
const TERMS_TITLE = 'Obchodné podmienky | Zajkológia';
const TERMS_DESCRIPTION =
  'Obchodné podmienky pre digitálne produkty Zajkológie vrátane platby, doručenia PDF a súhlasu s okamžitým dodaním.';
const ABOUT_TITLE = 'O nás | Zajkológia';
const ABOUT_DESCRIPTION =
  'Kto stojí za Zajkológiou: Stanka, autorka príručiek o starostlivosti o králiky, prevencii, výžive, správaní a welfare.';
const ADMIN_TITLE = 'Admin | Zajkológia';
const ADMIN_DESCRIPTION = 'Administrácia obsahu Zajkológie.';

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function routeUrl(routePath) {
  if (routePath === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${routePath}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function escapeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textSnippet(value, maxLength = 155) {
  const normalized = stripMarkdown(value);
  if (normalized.length <= maxLength) return normalized;
  const sliced = normalized.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > 80 ? lastSpace : sliced.length).trim()}…`;
}

function absoluteUrl(value) {
  const url = String(value || '').trim();
  if (!url) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

function toSitemapDate(value) {
  if (!value) return BUILD_DATE;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const datePart = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : BUILD_DATE;
}

function parseFaqContent(faqContent) {
  if (!faqContent) return [];
  if (Array.isArray(faqContent)) return faqContent;
  try {
    const parsed = JSON.parse(faqContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPriceFromMinorUnits(amount, currency) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: String(currency || 'EUR').toUpperCase(),
  }).format(amount / 100);
}

function schemaPrice(amount) {
  return (amount / 100).toFixed(2);
}

async function fetchJson(apiPath) {
  const url = `${API_BASE_URL}${apiPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'zajkologia-seo-generator',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SEO API request failed: ${response.status} ${url} ${body.slice(0, 300)}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mapPost(post) {
  return {
    id: post.id,
    slug: String(post.slug || '').trim(),
    title: String(post.title || '').trim(),
    excerpt: post.excerpt || '',
    content: post.contentMd || '',
    image: post.imageUrl || '',
    author: post.author || 'Tím Zajkológia',
    category: post.category || '',
    categoryId: post.categoryId ?? null,
    date: post.date || '',
    updatedAt: post.updatedAt || post.date || '',
    hasFaq: Boolean(post.hasFaq),
    faqItems: parseFaqContent(post.faqContent).filter((faq) => faq?.question && faq?.answer),
  };
}

function mergeProducts(apiProducts) {
  const apiBySlug = new Map(apiProducts.map((product) => [product.slug, product]));

  return frontendProducts.map((product) => {
    const apiProduct = apiBySlug.get(product.slug);
    if (!apiProduct) {
      throw new Error(`Missing live product data for ${product.slug}`);
    }

    if (typeof apiProduct.amount !== 'number' || !apiProduct.currency) {
      throw new Error(`Missing live price data for ${product.slug}`);
    }

    const price =
      apiProduct.price && apiProduct.price !== 'Cena v pokladni'
        ? apiProduct.price
        : formatPriceFromMinorUnits(apiProduct.amount, apiProduct.currency);

    if (!price || price === 'Cena v pokladni') {
      throw new Error(`Invalid product price for ${product.slug}`);
    }

    return {
      ...product,
      price,
      amount: apiProduct.amount,
      currency: String(apiProduct.currency).toUpperCase(),
      stripePriceActive: Boolean(apiProduct.stripePriceActive),
    };
  });
}

function markdownToHtml(markdown) {
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
        components: {
          a: ({ children, href }) =>
            React.createElement('a', { href: href || '', rel: 'noreferrer' }, children),
          img: ({ src, alt }) =>
            React.createElement('img', {
              src: src ? absoluteUrl(src) : '',
              alt: alt || '',
              loading: 'lazy',
              decoding: 'async',
            }),
        },
      },
      markdown || ''
    )
  );
}

function extractAssetTags(templateHtml) {
  const headMatch = templateHtml.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) return '';

  const headHtml = headMatch[1];
  const scriptTags = [...headHtml.matchAll(/<script\b[^>]*\bsrc="[^"]*"[^>]*><\/script>/gi)];
  const linkTags = [...headHtml.matchAll(/<link\b[^>]*>/gi)];

  return [...scriptTags, ...linkTags]
    .map((match) => match[0])
    .filter((tag) => tag.includes('/assets/'))
    .join('\n');
}

function buildHead({ title, description, canonical, image = DEFAULT_IMAGE, type = 'website', jsonLd = [], extraMeta = [] }, assetTags) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeAttr(description);
  const safeCanonical = escapeAttr(canonical);
  const safeImage = escapeAttr(image);

  return `<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/zajo.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:locale" content="sk_SK" />
  <meta property="og:site_name" content="Zajkológia" />
  <meta property="og:type" content="${escapeAttr(type)}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeCanonical}" />
  <meta property="og:image" content="${safeImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  ${extraMeta.join('\n  ')}
  ${jsonLd
    .map(
      (entry) =>
        `<script type="application/ld+json">${escapeJsonLd(entry)}</script>`
    )
    .join('\n  ')}
  <style>
    .seo-fallback { max-width: 960px; margin: 0 auto; padding: 2rem 1rem 4rem; color: #260c1a; font-family: Inter, system-ui, -apple-system, sans-serif; line-height: 1.65; }
    .seo-fallback h1 { font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.08; margin: 0 0 1rem; }
    .seo-fallback h2 { margin-top: 2rem; }
    .seo-fallback a { color: #7a3f00; font-weight: 700; }
    .seo-fallback img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
    .seo-fallback__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 1rem; }
    .seo-fallback__card { border: 1px solid #ead7c8; border-radius: 8px; padding: 1rem; background: #fffaf4; }
    .seo-fallback__muted { color: #6b5560; }
  </style>
${assetTags}
</head>`;
}

function renderPage(templateHtml, assetTags, meta, bodyHtml) {
  const htmlWithLang = templateHtml.replace(/<html\b[^>]*>/i, '<html lang="sk-SK">');
  const withHead = htmlWithLang.replace(/<head>[\s\S]*?<\/head>/i, buildHead(meta, assetTags));
  const withBody = withHead.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);

  if (withBody === withHead) {
    throw new Error('Could not find empty #root in Vite build output.');
  }

  return withBody;
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Zajkológia',
    url: routeUrl('/'),
    logo: DEFAULT_IMAGE,
  };
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Zajkológia',
    url: routeUrl('/'),
    inLanguage: 'sk-SK',
  };
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function articleSchema(post, canonical, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: textSnippet(post.excerpt || post.content),
    image: [image],
    datePublished: post.date || undefined,
    dateModified: post.updatedAt || post.date || undefined,
    author: {
      '@type': 'Person',
      name: post.author || 'Tím Zajkológia',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Zajkológia',
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE,
      },
    },
    mainEntityOfPage: canonical,
    inLanguage: 'sk-SK',
  };
}

function faqSchema(faqItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

function productSchema(product, canonical, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: [image],
    url: canonical,
    brand: {
      '@type': 'Brand',
      name: 'Zajkológia',
    },
    offers: {
      '@type': 'Offer',
      url: canonical,
      price: schemaPrice(product.amount),
      priceCurrency: product.currency,
      availability: product.stripePriceActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

function homeBody(posts, products) {
  const latestPosts = posts.slice(0, 30);

  return `<main class="seo-fallback">
    <section>
      <p class="seo-fallback__muted">Starostlivosť o králiky</p>
      <h1>Zajkológia</h1>
      <p>${escapeHtml(HOME_DESCRIPTION)}</p>
    </section>
    <p><a href="/o-nas">Kto stojí za Zajkológiou</a></p>
    <section id="produkty">
      <h2>Digitálne produkty</h2>
      <div class="seo-fallback__grid">
        ${products
          .map(
            (product) => `<article class="seo-fallback__card">
              <h3><a href="/product/${escapeAttr(product.slug)}">${escapeHtml(product.name)}</a></h3>
              <p>${escapeHtml(product.shortDescription || product.description)}</p>
              <p><strong>${escapeHtml(product.price)}</strong></p>
            </article>`
          )
          .join('\n')}
      </div>
    </section>
    <section>
      <h2>Najnovšie články</h2>
      <div class="seo-fallback__grid">
        ${latestPosts
          .map(
            (post) => `<article class="seo-fallback__card">
              <h3><a href="/post/${escapeAttr(post.slug)}">${escapeHtml(post.title)}</a></h3>
              <p>${escapeHtml(textSnippet(post.excerpt || post.content, 180))}</p>
            </article>`
          )
          .join('\n')}
      </div>
    </section>
  </main>`;
}

function aboutBody() {
  return `<main class="seo-fallback">
    <article>
      <nav><a href="/">Zajkológia</a> / O nás</nav>
      <p class="seo-fallback__muted">${escapeHtml(aboutContent.eyebrow)}</p>
      <h1>${escapeHtml(aboutContent.title)}</h1>
      <p><strong>${escapeHtml(aboutContent.lead)}</strong></p>
      <p>${escapeHtml(aboutContent.intro)}</p>
      <p>${escapeHtml(aboutContent.mission)}</p>
      <p>${escapeHtml(aboutContent.approach)}</p>
      <h2>Na čom mi záleží</h2>
      <ul>${aboutContent.values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>
      <h2>Ako tvorím obsah</h2>
      <div class="seo-fallback__grid">
        ${aboutContent.process
          .map(
            (item) => `<section class="seo-fallback__card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </section>`
          )
          .join('\n')}
      </div>
      <h2>Vzdelávanie</h2>
      <p>${escapeHtml(aboutContent.diploma)}</p>
      <h2>Certifikát</h2>
      <p>${escapeHtml(aboutContent.certificate.title)} - ${escapeHtml(aboutContent.certificate.result)}, ${escapeHtml(aboutContent.certificate.issuer)}, ${escapeHtml(aboutContent.certificate.date)}.</p>
      <p><a href="${escapeAttr(aboutContent.certificate.pdfUrl)}">Zobraziť certifikát</a></p>
      <img src="${escapeAttr(aboutContent.certificate.previewImage)}" alt="${escapeAttr(`Certifikát ${aboutContent.certificate.title}`)}" loading="lazy" decoding="async" />
      <p>${escapeHtml(aboutContent.closing)}</p>
      <p><strong>${escapeHtml(aboutContent.disclaimer)}</strong></p>
    </article>
  </main>`;
}

function postBody(post) {
  const image = post.image ? `<img src="${escapeAttr(absoluteUrl(post.image))}" alt="${escapeAttr(post.title)}" loading="lazy" decoding="async" />` : '';
  const faqHtml =
    post.hasFaq && post.faqItems.length
      ? `<section><h2>Často kladené otázky</h2>${post.faqItems
          .map(
            (faq) => `<article class="seo-fallback__card">
              <h3>${escapeHtml(faq.question)}</h3>
              <p>${escapeHtml(faq.answer)}</p>
            </article>`
          )
          .join('\n')}</section>`
      : '';

  return `<main class="seo-fallback">
    <article>
      <nav><a href="/">Zajkológia</a> / ${post.category ? escapeHtml(post.category) : 'Článok'}</nav>
      <p class="seo-fallback__muted">${escapeHtml([post.category, post.date].filter(Boolean).join(' | '))}</p>
      <h1>${escapeHtml(post.title)}</h1>
      ${post.excerpt ? `<p><strong>${escapeHtml(post.excerpt)}</strong></p>` : ''}
      ${image}
      ${markdownToHtml(post.content)}
      ${faqHtml}
    </article>
  </main>`;
}

function productBody(product) {
  const page = product.productPage || {};
  const detailSections = page.detailSections || [];
  const galleryImage = absoluteUrl(product.heroImage || product.image);

  return `<main class="seo-fallback">
    <article>
      <nav><a href="/">Zajkológia</a> / Produkt</nav>
      <h1>${escapeHtml(product.name)}</h1>
      <p><strong>${escapeHtml(product.price)}</strong></p>
      <img src="${escapeAttr(galleryImage)}" alt="${escapeAttr(product.name)}" loading="lazy" decoding="async" />
      <p>${escapeHtml(page.lead || product.shortDescription || product.description)}</p>
      ${product.deliveryNote ? `<p>${escapeHtml(product.deliveryNote)}</p>` : ''}
      ${product.featureList?.length ? `<h2>Čo nájdeš vo vnútri</h2><ul>${product.featureList.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      ${detailSections.length ? `<h2>${escapeHtml(page.contentTitle || 'Obsah produktu')}</h2>${detailSections
        .map(
          (section) => `<section class="seo-fallback__card">
            <h3>${escapeHtml(section.title)}</h3>
            <p>${escapeHtml(section.text || '')}</p>
          </section>`
        )
        .join('\n')}` : ''}
      ${page.closingText ? `<p>${escapeHtml(page.closingText)}</p>` : ''}
    </article>
  </main>`;
}

function termsBody() {
  return `<main class="seo-fallback">
    <article>
      <h1>Obchodné podmienky</h1>
      <p class="seo-fallback__muted">Posledná aktualizácia: 11. júna 2026</p>
      <section>
        <h2>Predávajúci</h2>
        <p>Predávajúci: <strong>Zajkologia</strong><br />Kontaktný e-mail: <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a></p>
      </section>
      <section>
        <h2>Produkt</h2>
        <p>Predávajúci ponúka digitálne produkty dodávané ako PDF príručky na e-mail uvedený zákazníkom v pokladni.</p>
      </section>
      <section>
        <h2>Cena a platba</h2>
        <p>Aktuálna cena produktu je zobrazená v pokladni Stripe pred odoslaním platby. Platba prebieha cez zabezpečenú pokladňu Stripe.</p>
      </section>
      <section>
        <h2>Dodanie digitálneho obsahu</h2>
        <p>PDF príručka je dodaná elektronicky na e-mail uvedený v pokladni po úspešnom potvrdení platby.</p>
      </section>
      <section>
        <h2>Súhlas s okamžitým dodaním a odstúpenie od zmluvy</h2>
        <p>Zákazník v pokladni potvrdzuje súhlas so začatím dodávania digitálneho obsahu pred uplynutím 14-dňovej lehoty na odstúpenie od zmluvy.</p>
      </section>
    </article>
  </main>`;
}

function adminBody() {
  return `<main class="seo-fallback">
    <h1>Admin</h1>
    <p>Načítavam administráciu Zajkológie.</p>
  </main>`;
}

async function writeRoute(routePath, html) {
  if (routePath === '/') {
    await writeFile(path.join(distDir, 'index.html'), html, 'utf8');
    return;
  }

  const cleanRoutePath = routePath.replace(/^\/+/, '');
  const routeDir = path.join(distDir, cleanRoutePath);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), html, 'utf8');

  const cleanHtmlPath = path.join(distDir, `${cleanRoutePath}.html`);
  await mkdir(path.dirname(cleanHtmlPath), { recursive: true });
  await writeFile(cleanHtmlPath, html, 'utf8');
}

async function writeSitemap(posts, products) {
  const urls = [
    { loc: routeUrl('/'), lastmod: BUILD_DATE },
    ...products.map((product) => ({
      loc: routeUrl(`/product/${product.slug}`),
      lastmod: BUILD_DATE,
    })),
    ...posts.map((post) => ({
      loc: routeUrl(`/post/${post.slug}`),
      lastmod: toSitemapDate(post.updatedAt || post.date),
    })),
    { loc: routeUrl('/o-nas'), lastmod: BUILD_DATE },
    { loc: routeUrl('/obchodne-podmienky'), lastmod: '2026-06-11' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${escapeHtml(url.lastmod)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
}

async function writeRobots() {
  await writeFile(
    path.join(distDir, 'robots.txt'),
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout

Sitemap: ${routeUrl('/sitemap.xml')}
`,
    'utf8'
  );
}

async function main() {
  const templateHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');
  const assetTags = extractAssetTags(templateHtml);

  const [postsPayload, productsPayload] = await Promise.all([
    fetchJson('/api/posts'),
    fetchJson('/api/products'),
  ]);

  const posts = (postsPayload.posts || []).map(mapPost).filter((post) => post.slug && post.title);
  const products = mergeProducts(productsPayload.products || []);

  if (!posts.length) {
    throw new Error('SEO generation received no public posts.');
  }

  if (!products.length) {
    throw new Error('SEO generation received no products.');
  }

  await writeRoute(
    '/',
    renderPage(
      templateHtml,
      assetTags,
      {
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        canonical: routeUrl('/'),
        image: DEFAULT_IMAGE,
        type: 'website',
        jsonLd: [organizationSchema(), websiteSchema()],
      },
      homeBody(posts, products)
    )
  );

  for (const post of posts) {
    const canonical = routeUrl(`/post/${post.slug}`);
    const image = absoluteUrl(post.image);
    const description = textSnippet(post.excerpt || post.content);
    const jsonLd = [
      articleSchema(post, canonical, image),
      breadcrumbSchema([
        { name: 'Zajkológia', url: routeUrl('/') },
        { name: post.title, url: canonical },
      ]),
    ];

    if (post.hasFaq && post.faqItems.length) {
      jsonLd.push(faqSchema(post.faqItems));
    }

    await writeRoute(
      `/post/${post.slug}`,
      renderPage(
        templateHtml,
        assetTags,
        {
          title: `${post.title} | Zajkológia`,
          description,
          canonical,
          image,
          type: 'article',
          extraMeta: post.date
            ? [`<meta property="article:published_time" content="${escapeAttr(post.date)}" />`]
            : [],
          jsonLd,
        },
        postBody(post)
      )
    );
  }

  for (const product of products) {
    const canonical = routeUrl(`/product/${product.slug}`);
    const image = absoluteUrl(product.heroImage || product.image);
    const description = textSnippet(product.shortDescription || product.description);
    const pageHtml = renderPage(
      templateHtml,
      assetTags,
      {
        title: `${product.name} | Zajkológia`,
        description,
        canonical,
        image,
        type: 'product',
        jsonLd: [
          productSchema(product, canonical, image),
          breadcrumbSchema([
            { name: 'Zajkológia', url: routeUrl('/') },
            { name: product.name, url: canonical },
          ]),
        ],
      },
      productBody(product)
    );

    if (pageHtml.includes('Cena v pokladni')) {
      throw new Error(`Product page still contains placeholder price for ${product.slug}`);
    }

    await writeRoute(`/product/${product.slug}`, pageHtml);
  }

  await writeRoute(
    '/o-nas',
    renderPage(
      templateHtml,
      assetTags,
      {
        title: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        canonical: routeUrl('/o-nas'),
        image: DEFAULT_IMAGE,
        type: 'profile',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: aboutContent.title,
            description: ABOUT_DESCRIPTION,
            url: routeUrl('/o-nas'),
            inLanguage: 'sk-SK',
            mainEntity: {
              '@type': 'Person',
              name: 'Stanka',
              description: aboutContent.lead,
            },
          },
          breadcrumbSchema([
            { name: 'Zajkológia', url: routeUrl('/') },
            { name: 'O nás', url: routeUrl('/o-nas') },
          ]),
        ],
      },
      aboutBody()
    )
  );

  await writeRoute(
    '/obchodne-podmienky',
    renderPage(
      templateHtml,
      assetTags,
      {
        title: TERMS_TITLE,
        description: TERMS_DESCRIPTION,
        canonical: routeUrl('/obchodne-podmienky'),
        image: DEFAULT_IMAGE,
        type: 'website',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Obchodné podmienky',
            url: routeUrl('/obchodne-podmienky'),
            inLanguage: 'sk-SK',
          },
          breadcrumbSchema([
            { name: 'Zajkológia', url: routeUrl('/') },
            { name: 'Obchodné podmienky', url: routeUrl('/obchodne-podmienky') },
          ]),
        ],
      },
      termsBody()
    )
  );

  await writeRoute(
    '/admin',
    renderPage(
      templateHtml,
      assetTags,
      {
        title: ADMIN_TITLE,
        description: ADMIN_DESCRIPTION,
        canonical: routeUrl('/admin'),
        image: DEFAULT_IMAGE,
        type: 'website',
        extraMeta: ['<meta name="robots" content="noindex,nofollow" />'],
      },
      adminBody()
    )
  );

  await writeSitemap(posts, products);
  await writeRobots();

  console.log(
    `Generated SEO pages for ${posts.length} posts and ${products.length} products from ${API_BASE_URL}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
