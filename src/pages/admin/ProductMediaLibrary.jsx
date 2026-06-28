import React, { useMemo, useState } from 'react';

const assignmentLabels = {
  image: 'Main image',
  hero: 'Hero image',
  gallery: 'Add to SK/default gallery',
  'gallery:CZ': 'Add to CZ gallery',
};

const getGalleryImages = (product, countryCode) => {
  const page = product?.productPage || {};
  if (countryCode === 'CZ') return page.galleryImagesByCountry?.CZ || [];
  return page.galleryImages || [];
};

const ImageAssetCard = ({ asset, assignmentTargets, assetBusy, onAssign, onDelete }) => {
  const [target, setTarget] = useState(assignmentTargets[0]?.value || 'gallery');

  return (
    <article className="admin-media-card">
      <img src={asset.publicUrl} alt={asset.originalFilename || 'Uploaded product asset'} />
      <div className="admin-media-card__body">
        <strong>{asset.originalFilename || 'Uploaded image'}</strong>
        <span>{asset.role || 'image'} · {Math.round((asset.fileSize || 0) / 1024)} kB</span>
        <div className="admin-media-card__actions">
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            {assignmentTargets.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => onAssign(asset.publicUrl, target)} disabled={assetBusy}>
            Assign
          </button>
          <button
            type="button"
            className="admin-media-card__delete"
            onClick={() => onDelete(asset)}
            disabled={assetBusy}
          >
            Delete uploaded file
          </button>
        </div>
      </div>
    </article>
  );
};

const PdfAssetRow = ({ asset, assetBusy, languageLabels, onDelete }) => {
  const filename = asset.customerFilename || asset.originalFilename || 'Uploaded PDF';
  const languageLabel = asset.languageCode
    ? languageLabels[asset.languageCode] || asset.languageCode.toUpperCase()
    : 'PDF';

  return (
    <div className="admin-pdf-history__item">
      <span>
        <strong>{languageLabel}</strong> {asset.isActive ? 'active' : 'inactive'} · {filename}
      </span>
      <button
        type="button"
        className="admin-media-card__delete"
        onClick={() => onDelete(asset)}
        disabled={assetBusy}
        aria-label={`Delete uploaded PDF ${filename}`}
      >
        Delete uploaded PDF
      </button>
    </div>
  );
};

const GalleryManager = ({ title, images, onMove, onRemove }) => (
  <section className="admin-gallery-manager">
    <div className="admin-gallery-manager__header">
      <h4>{title}</h4>
      <span>{images.length} image{images.length === 1 ? '' : 's'}</span>
    </div>

    {images.length > 0 ? (
      <div className="admin-gallery-grid">
        {images.map((image, index) => (
          <article key={`${image}-${index}`} className="admin-gallery-item">
            <img src={image} alt={`${title} image ${index + 1}`} />
            <div className="admin-gallery-item__meta">
              <span>{index + 1}</span>
              <div>
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={() => onMove(index, 1)} disabled={index === images.length - 1}>
                  Down
                </button>
                <button type="button" onClick={() => onRemove(index)}>
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p className="admin-media-empty">No images yet. Assign uploaded images to this gallery.</p>
    )}
  </section>
);

const ProductMediaLibrary = ({
  product,
  assets,
  assetsLoading,
  assetBusy,
  deliveryLanguages,
  languageLabels,
  pdfUploadLanguage,
  onPdfUploadLanguageChange,
  onUploadImages,
  onUploadPdf,
  onReloadAssets,
  onAssignImage,
  onDeleteImageAsset,
  onDeletePdfAsset,
  onMoveGalleryImage,
  onRemoveGalleryImage,
}) => {
  const imageAssets = useMemo(
    () => (assets || []).filter((asset) => asset.assetType === 'image' && asset.publicUrl),
    [assets]
  );
  const pdfAssets = useMemo(
    () => (assets || []).filter((asset) => asset.assetType === 'digital_pdf'),
    [assets]
  );
  const assignmentTargets = useMemo(() => {
    const targets = Object.entries(assignmentLabels).map(([value, label]) => ({ value, label }));

    if (product?.productType === 'physical') {
      (product.variants || []).forEach((variant, index) => {
        targets.push({
          value: `variant:${index}`,
          label: `Variant: ${variant.name || variant.code || index + 1}`,
        });
      });
    }

    (product?.productPage?.handmadeStory?.items || []).forEach((item, index) => {
      targets.push({
        value: `handmade:${index}`,
        label: `Story image: ${item.title || index + 1}`,
      });
    });

    return targets;
  }, [product]);
  const skGallery = getGalleryImages(product, 'SK');
  const czGallery = getGalleryImages(product, 'CZ');

  return (
    <section className="admin-media-panel">
      <div className="admin-media-panel__header">
        <div>
          <h3>Media library</h3>
          <p>Upload images once, then assign them to product fields, galleries, variants, or story cards.</p>
        </div>
        <button type="button" onClick={onReloadAssets} disabled={assetsLoading || !product?.id || product.id < 0}>
          {assetsLoading ? 'Loading…' : 'Reload assets'}
        </button>
      </div>

      <div className="admin-media-upload-row">
        <label className={`admin-upload-drop${assetBusy ? ' is-disabled' : ''}`}>
          <strong>{assetBusy ? 'Uploading…' : 'Upload product images'}</strong>
          <span>JPG, PNG or WebP. Multiple files are supported.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={assetBusy}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              onUploadImages(files);
            }}
          />
        </label>

        {product?.productType === 'digital' && product.fulfillmentType === 'pdf_email' && (
          <div className="admin-upload-drop admin-upload-drop--pdf">
            <label>
              <span>PDF version</span>
              <select
                value={pdfUploadLanguage}
                onChange={(event) => onPdfUploadLanguageChange(event.target.value)}
                disabled={assetBusy}
              >
                {deliveryLanguages.map((languageCode) => (
                  <option key={languageCode} value={languageCode}>
                    {languageLabels[languageCode] || languageCode.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <strong>{assetBusy ? 'Uploading…' : 'Upload delivery PDF'}</strong>
              <span>Replaces the active paid email attachment for the selected language.</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={assetBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  onUploadPdf(file);
                }}
              />
            </label>
          </div>
        )}
      </div>

      <div className="admin-gallery-manager-grid">
        <GalleryManager
          title="SK/default gallery"
          images={skGallery}
          onMove={(index, direction) => onMoveGalleryImage('SK', index, direction)}
          onRemove={(index) => onRemoveGalleryImage('SK', index)}
        />
        <GalleryManager
          title="CZ gallery"
          images={czGallery}
          onMove={(index, direction) => onMoveGalleryImage('CZ', index, direction)}
          onRemove={(index) => onRemoveGalleryImage('CZ', index)}
        />
      </div>

      <div className="admin-media-assets-section">
        <h4>Uploaded images</h4>
        {imageAssets.length > 0 ? (
          <div className="admin-media-grid">
            {imageAssets.map((asset) => (
              <ImageAssetCard
                key={asset.id}
                asset={asset}
                assignmentTargets={assignmentTargets}
                assetBusy={assetBusy}
                onAssign={onAssignImage}
                onDelete={onDeleteImageAsset}
              />
            ))}
          </div>
        ) : (
          <p className="admin-media-empty">
            {assetsLoading ? 'Loading uploaded images…' : 'No uploaded images yet.'}
          </p>
        )}
      </div>

      {product?.productType === 'digital' && product.fulfillmentType === 'pdf_email' && (
        <div className="admin-pdf-status">
          <h4>PDF delivery</h4>
          <div className="admin-pdf-status__grid">
            {(product.emailAttachments || []).map((attachment, index) => (
              <div key={`${attachment.filename || 'attachment'}-${index}`} className="admin-pdf-chip">
                <strong>{attachment.languageCode ? languageLabels[attachment.languageCode] || attachment.languageCode.toUpperCase() : 'PDF'}</strong>
                <span>{attachment.filename || 'PDF attachment'}</span>
              </div>
            ))}
            {(product.emailAttachments || []).length === 0 && (
              <p className="admin-media-empty">No active paid email PDF is configured.</p>
            )}
          </div>
          {pdfAssets.length > 0 && (
            <div className="admin-pdf-history">
              <span>Uploaded PDFs: </span>
              {pdfAssets.map((asset) => (
                <PdfAssetRow
                  key={asset.id}
                  asset={asset}
                  assetBusy={assetBusy}
                  languageLabels={languageLabels}
                  onDelete={onDeletePdfAsset}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ProductMediaLibrary;
