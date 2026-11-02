import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownContent from './MarkdownContent';

describe('MarkdownContent article table of contents', () => {
  it.each(['left', 'right', 'center'])('renders the %s image layout and following text as separate valid blocks', (alignment) => {
    const { container } = render(<MarkdownContent markdown={`![Králik](/kralik.jpg "zajkologia-image:${alignment}:medium")\n\nText vedľa obrázka.`} />);
    const image = screen.getByRole('img', { name: 'Králik' });
    expect(image.closest('figure')).toHaveClass(`markdown-image--${alignment}`, 'markdown-image--medium');
    expect(image).not.toHaveAttribute('title');
    expect(container.querySelector('p figure')).toBeNull();
    expect(screen.getByText('Text vedľa obrázka.').tagName).toBe('P');
  });

  it('retains normal centered images and ordinary titles in existing articles', () => {
    render(<MarkdownContent markdown={'![Pôvodný](/kralik.jpg "Starý popis")'} />);
    const image = screen.getByRole('img', { name: 'Pôvodný' });
    expect(image).toHaveAttribute('title', 'Starý popis');
    expect(image.closest('figure')).toBeNull();
  });

  it('does not interpret arbitrary title text or raw HTML as layout or executable code', () => {
    const { container } = render(<MarkdownContent markdown={'![Obrázok](/kralik.jpg "zajkologia-image:right:evil")\n\n<script>alert(1)</script>'} />);
    expect(screen.getByRole('img').closest('figure')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('builds linked contents from primary article headings and gives every heading a stable id', () => {
    const { container } = render(
      <MarkdownContent markdown={'# Názov\n\n## Zdravie a výživa\n\n### Detail\n\n## Zdravie a výživa'} />
    );

    const contents = screen.getByRole('navigation', { name: 'Obsah článku' });
    const links = within(contents).getAllByRole('link');

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#zdravie-a-vyziva');
    expect(links[1]).toHaveAttribute('href', '#zdravie-a-vyziva-2');
    expect(container.querySelector('#zdravie-a-vyziva')).toHaveTextContent('Zdravie a výživa');
    expect(container.querySelector('#detail')).toHaveTextContent('Detail');
    expect(container.querySelector('#zdravie-a-vyziva-2')).toHaveTextContent('Zdravie a výživa');
  });

  it('falls back to the next available heading level for older articles', () => {
    render(<MarkdownContent markdown={'### Prvá časť\n\nText\n\n### Druhá časť'} />);

    const contents = screen.getByRole('navigation', { name: 'Obsah článku' });
    expect(within(contents).getAllByRole('link')).toHaveLength(2);
    expect(within(contents).getByRole('link', { name: 'Prvá časť' })).toHaveAttribute('href', '#prva-cast');
  });

  it('keeps same-page links in the current tab while external links remain separate', () => {
    render(<MarkdownContent markdown={'## Sekcia\n\n[Preskočiť](#sekcia)\n\n[Zdroj](https://example.com)'} />);

    expect(screen.getByRole('link', { name: 'Preskočiť' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Zdroj' })).toHaveAttribute('target', '_blank');
  });

  it('keeps duplicate ids aligned across Setext and ATX Markdown headings', () => {
    const { container } = render(<MarkdownContent markdown={'Sekcia\n-------\n\n## Sekcia'} />);

    const contents = screen.getByRole('navigation', { name: 'Obsah článku' });
    const links = within(contents).getAllByRole('link');

    expect(links[0]).toHaveAttribute('href', '#sekcia');
    expect(links[1]).toHaveAttribute('href', '#sekcia-2');
    expect(container.querySelectorAll('#sekcia')).toHaveLength(1);
    expect(container.querySelectorAll('#sekcia-2')).toHaveLength(1);
  });

  it('keeps GFM footnote heading labels and targets aligned', () => {
    const { container } = render(
      <MarkdownContent markdown={'## Starostlivosť [^bezpecnost]\n\n[^bezpecnost]: Bezpečnostná poznámka'} />
    );

    const contentsLink = within(
      screen.getByRole('navigation', { name: 'Obsah článku' })
    ).getByRole('link');

    expect(contentsLink).toHaveAttribute('href', '#starostlivost-1');
    expect(contentsLink).toHaveTextContent('Starostlivosť 1');
    expect(container.querySelector('#starostlivost-1')).toBeInTheDocument();
  });
});
