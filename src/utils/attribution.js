const ATTRIBUTION_STORAGE_KEY = 'zajkologia.attribution.v1';
const INTERNAL_HOSTS = new Set(['zajkologia.com', 'www.zajkologia.com']);
const SENSITIVE_QUERY_PARAMS = ['welcome_discount_token'];

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

const readAttribution = () => {
  if (!canUseStorage()) return {};

  try {
    return safeParse(window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const writeAttribution = (value) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Attribution is helpful reporting context, not required for checkout.
  }
};

const getUrl = () => {
  if (typeof window === 'undefined') return null;
  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};

const getExternalReferrer = () => {
  if (typeof document === 'undefined' || !document.referrer) return '';

  try {
    const referrer = new URL(document.referrer);
    const current = getUrl();
    if (current && referrer.host === current.host) return '';
    if (INTERNAL_HOSTS.has(referrer.host)) return '';
    return referrer.toString();
  } catch {
    return '';
  }
};

const classifyReferrer = (referrer) => {
  if (!referrer) return { source: 'direct', medium: 'direct' };

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('google.')) return { source: 'google', medium: 'organic' };
    if (host.includes('bing.')) return { source: 'bing', medium: 'organic' };
    if (host.includes('duckduckgo.')) return { source: 'duckduckgo', medium: 'organic' };
    if (host.includes('instagram.')) return { source: 'instagram', medium: 'social' };
    if (host.includes('facebook.') || host.includes('fb.')) return { source: 'facebook', medium: 'social' };
    if (host.includes('tiktok.')) return { source: 'tiktok', medium: 'social' };
    if (host.includes('youtube.')) return { source: 'youtube', medium: 'social' };
    return { source: host, medium: 'referral' };
  } catch {
    return { source: 'referral', medium: 'referral' };
  }
};

const getParam = (url, name) => url.searchParams.get(name)?.trim() || '';

const getSafePageUrl = (url) => {
  const safeUrl = new URL(url.toString());
  SENSITIVE_QUERY_PARAMS.forEach((param) => safeUrl.searchParams.delete(param));
  return safeUrl;
};

const getTouchFromUrl = ({ contentContext } = {}) => {
  const url = getUrl();
  if (!url) return null;

  const safeUrl = getSafePageUrl(url);
  const referrer = getExternalReferrer();
  const hasUtm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .some((param) => url.searchParams.has(param));
  const hasAdClick = ['gclid', 'fbclid', 'msclkid', 'ttclid'].some((param) => url.searchParams.has(param));
  const isWelcomeEmail = url.searchParams.has('welcome_discount_token');
  const referrerClassification = classifyReferrer(referrer);

  let source = getParam(url, 'utm_source') || referrerClassification.source;
  let medium = getParam(url, 'utm_medium') || referrerClassification.medium;
  let campaign = getParam(url, 'utm_campaign');
  const content = getParam(url, 'utm_content');
  const term = getParam(url, 'utm_term');

  if (isWelcomeEmail && !hasUtm) {
    source = 'zajkologia_email';
    medium = 'email';
    campaign = 'welcome_discount';
  } else if (hasAdClick && !hasUtm) {
    medium = 'paid';
    if (url.searchParams.has('gclid')) source = 'google';
    if (url.searchParams.has('fbclid')) source = 'meta';
    if (url.searchParams.has('msclkid')) source = 'microsoft';
    if (url.searchParams.has('ttclid')) source = 'tiktok';
  }

  return {
    source,
    medium,
    campaign,
    content,
    term,
    referrer,
    url: safeUrl.toString(),
    path: `${safeUrl.pathname}${safeUrl.search}`,
    capturedAt: new Date().toISOString(),
    contentContext: contentContext || null,
  };
};

export const captureAttribution = ({ contentContext } = {}) => {
  const touch = getTouchFromUrl({ contentContext });
  if (!touch) return;

  const stored = readAttribution();
  const hasCampaignSignal =
    touch.medium === 'email' ||
    touch.medium === 'paid' ||
    Boolean(touch.campaign) ||
    Boolean(touch.referrer);
  const next = {
    ...stored,
    first: stored.first || touch,
    last: hasCampaignSignal ? touch : (stored.last || touch),
    current: touch,
  };

  if (contentContext?.type === 'blog_post') {
    next.sourcePost = {
      slug: contentContext.slug || '',
      title: contentContext.title || '',
      path: touch.path,
      capturedAt: touch.capturedAt,
    };
  }

  writeAttribution(next);
};

export const getCheckoutAttribution = () => {
  const stored = readAttribution();
  const first = stored.first || {};
  const last = stored.last || first;
  const current = stored.current || last;
  const sourcePost = stored.sourcePost || {};

  return {
    source: last.source || first.source || 'direct',
    medium: last.medium || first.medium || 'direct',
    campaign: last.campaign || first.campaign || '',
    content: last.content || first.content || '',
    term: last.term || first.term || '',
    referrer: first.referrer || '',
    landingPage: first.url || '',
    currentPage: current.url || '',
    sourcePostSlug: sourcePost.slug || '',
    sourcePostTitle: sourcePost.title || '',
    first,
    last,
    current,
    sourcePost,
  };
};
