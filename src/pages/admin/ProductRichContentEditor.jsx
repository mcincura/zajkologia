import React from 'react';

const iconOptions = [
  'CalendarDays',
  'Carrot',
  'CheckCircle2',
  'CircleHelp',
  'Clock3',
  'ClipboardList',
  'HeartPulse',
  'House',
  'Layers3',
  'PackageCheck',
  'Palette',
  'Plus',
  'ScanSearch',
  'Scale',
  'Stethoscope',
  'Tag',
  'Truck',
];

const inputStyle = {
  padding: '0.6rem 0.75rem',
  border: '1px solid #e5e1dc',
  borderRadius: '8px',
  width: '100%',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const labelTextStyle = {
  fontSize: '0.82rem',
  color: '#66584f',
  fontWeight: 800,
};

const sectionCardStyle = {
  border: '1px solid #eee',
  borderRadius: '10px',
  padding: '1rem',
  background: '#fafafa',
};

const itemCardStyle = {
  border: '1px solid #eee',
  borderRadius: '8px',
  padding: '0.75rem',
  background: 'white',
};

const secondaryButtonStyle = {
  background: 'white',
  border: '1px solid #ddd',
  color: '#55463d',
  padding: '0.4rem 0.65rem',
  borderRadius: '6px',
  fontWeight: 800,
};

const dangerButtonStyle = {
  background: '#fff0f0',
  color: '#a40000',
  padding: '0.45rem 0.55rem',
  borderRadius: '6px',
  fontWeight: 800,
};

const SectionHeader = ({ title, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
    <h3 style={{ margin: 0 }}>{title}</h3>
    {action}
  </div>
);

const TextListEditor = ({
  title,
  items,
  onChange,
  placeholder = 'Text',
  addLabel = 'Add item',
  framed = true,
}) => {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (index, value) => {
    const next = [...list];
    next[index] = value;
    onChange(next);
  };

  return (
    <div style={framed ? sectionCardStyle : { display: 'grid', gap: '0.5rem' }}>
      <SectionHeader
        title={title}
        action={(
          <button type="button" onClick={() => onChange([...list, ''])} style={secondaryButtonStyle}>
            {addLabel}
          </button>
        )}
      />
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {list.map((item, index) => (
          <div key={`${title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
            <input
              value={item || ''}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))}
              style={dangerButtonStyle}
            >
              Remove
            </button>
          </div>
        ))}
        {!list.length && <div style={{ color: '#7a6e66', fontSize: '0.86rem' }}>No items yet.</div>}
      </div>
    </div>
  );
};

const DetailSectionsEditor = ({ items, onChange }) => {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (index, patch) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div style={sectionCardStyle}>
      <SectionHeader
        title="Detail sections"
        action={(
          <button
            type="button"
            onClick={() => onChange([...list, { icon: 'CheckCircle2', title: '', text: '' }])}
            style={secondaryButtonStyle}
          >
            Add section
          </button>
        )}
      />
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {list.map((item, index) => (
          <div key={`detail-${index}`} style={itemCardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Icon</span>
                <select
                  value={item.icon || 'CheckCircle2'}
                  onChange={(e) => updateItem(index, { icon: e.target.value })}
                  style={inputStyle}
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Title</span>
                <input
                  value={item.title || ''}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))}
                style={dangerButtonStyle}
              >
                Remove
              </button>
            </div>
            <label style={{ ...labelStyle, marginTop: '0.6rem' }}>
              <span style={labelTextStyle}>Text</span>
              <textarea
                value={item.text || ''}
                onChange={(e) => updateItem(index, { text: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>
          </div>
        ))}
        {!list.length && <div style={{ color: '#7a6e66', fontSize: '0.86rem' }}>No detail sections yet.</div>}
      </div>
    </div>
  );
};

const TitleTextItemsEditor = ({ title, items, onChange, addLabel = 'Add item', includeImage = false }) => {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (index, patch) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <SectionHeader
        title={title}
        action={(
          <button
            type="button"
            onClick={() => onChange([...list, { title: '', text: '', ...(includeImage ? { image: '' } : {}) }])}
            style={secondaryButtonStyle}
          >
            {addLabel}
          </button>
        )}
      />
      {list.map((item, index) => (
        <div key={`${title}-${index}`} style={itemCardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: includeImage ? '1fr 1fr auto' : '1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Title</span>
              <input
                value={item.title || ''}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                style={inputStyle}
              />
            </label>
            {includeImage && (
              <label style={labelStyle}>
                <span style={labelTextStyle}>Image</span>
                <input
                  value={item.image || ''}
                  onChange={(e) => updateItem(index, { image: e.target.value })}
                  style={inputStyle}
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))}
              style={dangerButtonStyle}
            >
              Remove
            </button>
          </div>
          <label style={{ ...labelStyle, marginTop: '0.6rem' }}>
            <span style={labelTextStyle}>Text</span>
            <textarea
              value={item.text || ''}
              onChange={(e) => updateItem(index, { text: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
        </div>
      ))}
      {!list.length && <div style={{ color: '#7a6e66', fontSize: '0.86rem' }}>No items yet.</div>}
    </div>
  );
};

const ProductRichContentEditor = ({ product, onChange }) => {
  const page = product?.productPage || {};
  const theme = product?.pageTheme || {};
  const usageSteps = page.usageSteps || {};
  const preorderInfo = page.preorderInfo || {};
  const handmadeStory = page.handmadeStory || {};

  const updatePage = (patch) => onChange({ productPage: { ...page, ...patch } });
  const updateTheme = (patch) => onChange({ pageTheme: { ...theme, ...patch } });
  const updateUsageSteps = (patch) => updatePage({ usageSteps: { ...usageSteps, ...patch } });
  const updatePreorderInfo = (patch) => updatePage({ preorderInfo: { ...preorderInfo, ...patch } });
  const updateHandmadeStory = (patch) => updatePage({ handmadeStory: { ...handmadeStory, ...patch } });
  const countryGalleries = page.galleryImagesByCountry || {};

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Product page theme</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {[
            ['accent', 'Accent'],
            ['accentStrong', 'Accent strong'],
            ['tint', 'Tint'],
            ['surface', 'Surface'],
            ['glow', 'Glow'],
          ].map(([key, label]) => (
            <label key={key} style={labelStyle}>
              <span style={labelTextStyle}>{label}</span>
              <input
                value={theme[key] || ''}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
                placeholder={key === 'glow' ? 'rgba(...)' : '#f7ead8'}
                style={inputStyle}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Core product page copy</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            <span style={labelTextStyle}>Lead</span>
            <textarea
              value={page.lead || ''}
              onChange={(e) => updatePage({ lead: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Content title</span>
            <input
              value={page.contentTitle || ''}
              onChange={(e) => updatePage({ contentTitle: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Language note</span>
            <input
              value={page.languageNote || ''}
              onChange={(e) => updatePage({ languageNote: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Preorder microcopy</span>
            <textarea
              value={page.preorderMicrocopy || ''}
              onChange={(e) => updatePage({ preorderMicrocopy: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Variants intro</span>
            <textarea
              value={page.variantsIntro || ''}
              onChange={(e) => updatePage({ variantsIntro: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Closing title</span>
            <input
              value={page.closingTitle || ''}
              onChange={(e) => updatePage({ closingTitle: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Closing note</span>
            <input
              value={page.closingNote || ''}
              onChange={(e) => updatePage({ closingNote: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
            <span style={labelTextStyle}>Closing text</span>
            <textarea
              value={page.closingText || ''}
              onChange={(e) => updatePage({ closingText: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
        </div>
      </div>

      <TextListEditor
        title="Feature list"
        items={product?.featureList || []}
        onChange={(featureList) => onChange({ featureList })}
        placeholder="Feature shown in product summaries"
        addLabel="Add feature"
      />

      <TextListEditor
        title="Gallery images"
        items={page.galleryImages || []}
        onChange={(galleryImages) => updatePage({ galleryImages })}
        placeholder="/product-gallery/example.webp"
        addLabel="Add image"
      />

      <TextListEditor
        title="Country gallery CZ"
        items={countryGalleries.CZ || []}
        onChange={(images) => updatePage({
          galleryImagesByCountry: {
            ...countryGalleries,
            CZ: images,
          },
        })}
        placeholder="/product-gallery/example-cz.webp"
        addLabel="Add CZ image"
      />

      <TextListEditor
        title="Trust badges"
        items={page.trustBadges || []}
        onChange={(trustBadges) => updatePage({ trustBadges })}
        placeholder="PDF doručené na email"
        addLabel="Add badge"
      />

      <TextListEditor
        title="Purchase highlights"
        items={page.purchaseHighlights || []}
        onChange={(purchaseHighlights) => updatePage({ purchaseHighlights })}
        placeholder="Ručne vyrábané po kusoch"
        addLabel="Add highlight"
      />

      <DetailSectionsEditor
        items={page.detailSections || []}
        onChange={(detailSections) => updatePage({ detailSections })}
      />

      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Usage steps</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Title</span>
            <input
              value={usageSteps.title || ''}
              onChange={(e) => updateUsageSteps({ title: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Note</span>
            <input
              value={usageSteps.note || ''}
              onChange={(e) => updateUsageSteps({ note: e.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
        <TextListEditor
          title="Usage step items"
          items={usageSteps.items || []}
          onChange={(items) => updateUsageSteps({ items })}
          placeholder="Step copy"
          addLabel="Add step"
          framed={false}
        />
      </div>

      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Preorder info</h3>
        <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
          <span style={labelTextStyle}>Title</span>
          <input
            value={preorderInfo.title || ''}
            onChange={(e) => updatePreorderInfo({ title: e.target.value })}
            style={inputStyle}
          />
        </label>
        <TitleTextItemsEditor
          title="Preorder info cards"
          items={preorderInfo.items || []}
          onChange={(items) => updatePreorderInfo({ items })}
          addLabel="Add info card"
        />
      </div>

      <div style={sectionCardStyle}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Handmade story</h3>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Title</span>
            <input
              value={handmadeStory.title || ''}
              onChange={(e) => updateHandmadeStory({ title: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Text</span>
            <textarea
              value={handmadeStory.text || ''}
              onChange={(e) => updateHandmadeStory({ text: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
        </div>
        <TitleTextItemsEditor
          title="Handmade story items"
          items={handmadeStory.items || []}
          onChange={(items) => updateHandmadeStory({ items })}
          addLabel="Add story item"
          includeImage
        />
      </div>

      <div style={sectionCardStyle}>
        <SectionHeader
          title="FAQ items"
          action={(
            <button
              type="button"
              onClick={() => updatePage({ faqItems: [...(page.faqItems || []), { question: '', answer: '' }] })}
              style={secondaryButtonStyle}
            >
              Add FAQ
            </button>
          )}
        />
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {(page.faqItems || []).map((item, index) => (
            <div key={`faq-${index}`} style={itemCardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Question</span>
                  <input
                    value={item.question || ''}
                    onChange={(e) => {
                      const next = [...(page.faqItems || [])];
                      next[index] = { ...next[index], question: e.target.value };
                      updatePage({ faqItems: next });
                    }}
                    style={inputStyle}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => updatePage({ faqItems: (page.faqItems || []).filter((_, itemIndex) => itemIndex !== index) })}
                  style={dangerButtonStyle}
                >
                  Remove
                </button>
              </div>
              <label style={{ ...labelStyle, marginTop: '0.6rem' }}>
                <span style={labelTextStyle}>Answer</span>
                <textarea
                  value={item.answer || ''}
                  onChange={(e) => {
                    const next = [...(page.faqItems || [])];
                    next[index] = { ...next[index], answer: e.target.value };
                    updatePage({ faqItems: next });
                  }}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
            </div>
          ))}
          {!(page.faqItems || []).length && <div style={{ color: '#7a6e66', fontSize: '0.86rem' }}>No FAQ items yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default ProductRichContentEditor;
