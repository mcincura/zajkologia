import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ArticleImageControls from './ArticleImageControls';
import MarkdownContent from '../../components/MarkdownContent';
import { listMarkdownImages } from '../../utils/markdownImages';

const Editor = ({ initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const ref = useRef(null);
  return <>
    <ArticleImageControls value={value} onChange={setValue} editorRef={ref} />
    <textarea aria-label="Obsah článku" ref={ref} value={value} onChange={(event) => setValue(event.target.value)} />
    <MarkdownContent markdown={value} />
  </>;
};

describe('article image controls', () => {
  it('inserts at the cursor with chosen alignment and size while preserving article text', async () => {
    const user = userEvent.setup();
    render(<Editor initialValue={'Úvod.\n\nText vedľa obrázka.'} />);
    const textarea = screen.getByRole('textbox', { name: 'Obsah článku' });
    textarea.focus();
    textarea.setSelectionRange(7, 7);
    await user.type(screen.getByLabelText('Adresa obrázka'), '/kralik.jpg');
    await user.type(screen.getByLabelText('Popis obrázka'), 'Biely [[králik]');
    await user.selectOptions(screen.getByLabelText('Zarovnanie'), 'right');
    await user.selectOptions(screen.getByLabelText('Veľkosť na počítači'), 'small');
    await user.click(screen.getByRole('button', { name: 'Vložiť obrázok' }));
    const images = listMarkdownImages(textarea.value);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ src: '/kralik.jpg', alt: 'Biely [králik]', alignment: 'right', size: 'small' });
    expect(textarea.value).toMatch(/^Úvod\./);
    expect(textarea.value).toContain('Text vedľa obrázka.');
    expect(screen.getByRole('img', { name: 'Biely [králik]' }).closest('figure')).toHaveClass('markdown-image--right', 'markdown-image--small');
  });

  it('edits a previously centered image without duplicating it or losing its title', async () => {
    const user = userEvent.setup();
    render(<Editor initialValue={'![Králik](/stary.jpg "Pôvodná fotka")\n\nPopis.'} />);
    await user.selectOptions(screen.getByLabelText('Vložiť alebo upraviť obrázok'), '0');
    expect(screen.getByLabelText('Adresa obrázka')).toHaveValue('/stary.jpg');
    await user.selectOptions(screen.getByLabelText('Zarovnanie'), 'left');
    await user.selectOptions(screen.getByLabelText('Veľkosť na počítači'), 'medium');
    await user.click(screen.getByRole('button', { name: 'Upraviť obrázok' }));
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAttribute('title', 'Pôvodná fotka');
    expect(screen.getByRole('img').closest('figure')).toHaveClass('markdown-image--left', 'markdown-image--medium');
    await user.selectOptions(screen.getByLabelText('Zarovnanie'), 'center');
    await user.click(screen.getByRole('button', { name: 'Upraviť obrázok' }));
    expect(screen.getByRole('img').closest('figure')).toHaveClass('markdown-image--center');
  });

  it('blocks invalid image addresses without changing the content', async () => {
    const user = userEvent.setup();
    render(<Editor initialValue="Text zostáva." />);
    await user.type(screen.getByLabelText('Adresa obrázka'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Vložiť obrázok' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Zadajte platnú adresu obrázka');
    expect(screen.getByRole('textbox', { name: 'Obsah článku' })).toHaveValue('Text zostáva.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
