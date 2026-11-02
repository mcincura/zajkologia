import { useId, useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { createMarkdownImage, isSafeArticleImageUrl, listMarkdownImages } from '../../utils/markdownImages';
import '../../styles/admin-article-editor.css';

const emptyDraft = { src: '', alt: '', alignment: 'center', size: 'medium', title: '' };

const ArticleImageControls = ({ value, onChange, editorRef }) => {
  const id = useId();
  const images = useMemo(() => listMarkdownImages(value), [value]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedImage = images[selectedIndex];

  const chooseImage = (event) => {
    const index = Number(event.target.value);
    setSelectedIndex(index);
    setDraft(images[index] || emptyDraft);
    setMessage('');
    setError('');
  };

  const applyImage = () => {
    if (!isSafeArticleImageUrl(draft.src)) {
      setError('Zadajte platnú adresu obrázka (https://… alebo /cesta/k/obrazku).');
      return;
    }
    const start = selectedImage?.start ?? editorRef.current?.selectionStart ?? value.length;
    const end = selectedImage?.end ?? editorRef.current?.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? '\n\n' : '';
    const suffix = after.startsWith('\n\n') ? '' : '\n\n';
    const markdown = createMarkdownImage(draft);
    const nextValue = `${before}${prefix}${markdown}${suffix}${after}`;
    onChange(nextValue);
    setSelectedIndex(listMarkdownImages(nextValue).findIndex((image) => image.start === start + prefix.length));
    setError('');
    setMessage(selectedImage ? 'Obrázok bol upravený. Výsledok vidíte v náhľade.' : 'Obrázok bol vložený. Text pridajte do nasledujúceho odseku.');
    requestAnimationFrame(() => {
      const cursor = start + prefix.length + markdown.length + suffix.length;
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <fieldset className="article-image-controls">
      <legend><ImagePlus size={17} aria-hidden="true" />Obrázky v článku</legend>
      <label htmlFor={`${id}-image`}>Vložiť alebo upraviť obrázok</label>
      <select id={`${id}-image`} value={selectedImage ? selectedIndex : -1} onChange={chooseImage}>
        <option value={-1}>Pridať nový obrázok</option>
        {images.map((image, index) => <option key={index} value={index}>{index + 1}. {image.alt || 'Obrázok bez popisu'}</option>)}
      </select>
      <label htmlFor={`${id}-url`}>Adresa obrázka</label>
      <input id={`${id}-url`} type="text" inputMode="url" value={draft.src} onChange={(event) => setDraft((current) => ({ ...current, src: event.target.value }))} placeholder="https://… alebo /obrazok.jpg" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      <label htmlFor={`${id}-alt`}>Popis obrázka</label>
      <input id={`${id}-alt`} value={draft.alt} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} placeholder="Čo je na obrázku (pre čítačky obrazovky)" />
      <div className="article-image-controls__options">
        <div>
          <label htmlFor={`${id}-alignment`}>Zarovnanie</label>
          <select id={`${id}-alignment`} value={draft.alignment} onChange={(event) => setDraft((current) => ({ ...current, alignment: event.target.value }))}>
            <option value="left">Vľavo – text vpravo</option>
            <option value="right">Vpravo – text vľavo</option>
            <option value="center">Na stred</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-size`}>Veľkosť na počítači</label>
          <select id={`${id}-size`} value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))}>
            <option value="small">Malý (25 %)</option>
            <option value="medium">Stredný (40 %)</option>
            <option value="large">Veľký (60 %)</option>
            <option value="full">Plná šírka (100 %)</option>
          </select>
        </div>
      </div>
      <p className="article-image-controls__hint">Nový obrázok sa vloží na miesto kurzora. Text v nasledujúcich odsekoch ho obteká až po ďalší nadpis alebo obrázok. Na mobile sa zobrazí nad textom. Zmeny uložíte tlačidlom Save.</p>
      <button type="button" onClick={applyImage}>{selectedImage ? 'Upraviť obrázok' : 'Vložiť obrázok'}</button>
      {error && <p id={`${id}-error`} className="article-image-controls__error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
};

export default ArticleImageControls;
