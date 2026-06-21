const normalizeTextList = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const normalizeTitleTextItems = (items, { image = false } = {}) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      text: String(item?.text || '').trim(),
      ...(image ? { image: String(item?.image || '').trim() } : {}),
    }))
    .filter((item) => item.title || item.text || item.image);

const normalizeDetailSections = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      icon: String(item?.icon || 'CheckCircle2').trim() || 'CheckCircle2',
      title: String(item?.title || '').trim(),
      text: String(item?.text || '').trim(),
    }))
    .filter((item) => item.title || item.text);

const normalizeFaqItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question || item.answer);

const normalizeCountryGalleries = (galleryImagesByCountry) => {
  if (!galleryImagesByCountry || typeof galleryImagesByCountry !== 'object') return null;

  const normalized = Object.entries(galleryImagesByCountry).reduce((acc, [countryCode, images]) => {
    const list = normalizeTextList(images);
    if (countryCode && list.length) acc[String(countryCode).toUpperCase()] = list;
    return acc;
  }, {});

  return Object.keys(normalized).length ? normalized : null;
};

const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return Boolean(String(value ?? '').trim());
};

const compactObject = (value) => {
  if (!value || typeof value !== 'object') return null;

  const compacted = Object.entries(value).reduce((acc, [key, item]) => {
    if (hasMeaningfulValue(item)) acc[key] = item;
    return acc;
  }, {});

  return Object.keys(compacted).length ? compacted : null;
};

export const normalizeRichProductContent = (product = {}) => {
  const productPage = product.productPage || {};
  const usageSteps = compactObject({
    title: String(productPage.usageSteps?.title || '').trim(),
    note: String(productPage.usageSteps?.note || '').trim(),
    items: normalizeTextList(productPage.usageSteps?.items),
  });
  const preorderInfo = compactObject({
    title: String(productPage.preorderInfo?.title || '').trim(),
    items: normalizeTitleTextItems(productPage.preorderInfo?.items),
  });
  const handmadeStory = compactObject({
    title: String(productPage.handmadeStory?.title || '').trim(),
    text: String(productPage.handmadeStory?.text || '').trim(),
    items: normalizeTitleTextItems(productPage.handmadeStory?.items, { image: true }),
  });
  const normalizedPage = compactObject({
    ...productPage,
    lead: String(productPage.lead || '').trim(),
    galleryImages: normalizeTextList(productPage.galleryImages),
    galleryImagesByCountry: normalizeCountryGalleries(productPage.galleryImagesByCountry),
    trustBadges: normalizeTextList(productPage.trustBadges),
    languageNote: String(productPage.languageNote || '').trim(),
    purchaseHighlights: normalizeTextList(productPage.purchaseHighlights),
    preorderMicrocopy: String(productPage.preorderMicrocopy || '').trim(),
    variantsIntro: String(productPage.variantsIntro || '').trim(),
    contentTitle: String(productPage.contentTitle || '').trim(),
    detailSections: normalizeDetailSections(productPage.detailSections),
    usageSteps,
    preorderInfo,
    handmadeStory,
    faqItems: normalizeFaqItems(productPage.faqItems),
    closingTitle: String(productPage.closingTitle || '').trim(),
    closingText: String(productPage.closingText || '').trim(),
    closingNote: String(productPage.closingNote || '').trim(),
  });

  return {
    featureList: normalizeTextList(product.featureList),
    pageTheme: compactObject(product.pageTheme),
    productPage: normalizedPage,
  };
};
