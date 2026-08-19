import { describe, expect, it } from 'vitest';
import {
  extractMarkdownHeadings,
  plainHeadingText,
  selectTableOfContentsHeadings,
} from './markdownHeadings';

describe('markdown heading extraction', () => {
  it('ignores headings inside fenced code blocks', () => {
    const headings = extractMarkdownHeadings('## Viditeľná\n\n```md\n## Nie je nadpis\n```\n\n### Detail');

    expect(headings.map((heading) => heading.text)).toEqual(['Viditeľná', 'Detail']);
  });

  it('uses the highest available article heading level for a concise contents list', () => {
    const headings = extractMarkdownHeadings('### Starší nadpis\n\n#### Detail');

    expect(selectTableOfContentsHeadings(headings)).toEqual([
      expect.objectContaining({ level: 3, text: 'Starší nadpis' }),
    ]);
  });

  it('turns inline Markdown into readable labels', () => {
    expect(plainHeadingText('**Očkovanie** a [prevencia](/prevencia)')).toBe('Očkovanie a prevencia');
  });

  it('uses full Markdown heading grammar and preserves document order', () => {
    const headings = extractMarkdownHeadings('Sekcia\n-------\n\n> ## Citovaná časť\n\n## Sekcia');

    expect(headings).toEqual([
      { id: 'sekcia', level: 2, text: 'Sekcia' },
      { id: 'citovana-cast', level: 2, text: 'Citovaná časť' },
      { id: 'sekcia-2', level: 2, text: 'Sekcia' },
    ]);
  });

  it('matches the rendered numbering for GFM footnote references', () => {
    const headings = extractMarkdownHeadings(
      '## Starostlivosť [^bezpecnost]\n\n[^bezpecnost]: Bezpečnostná poznámka'
    );

    expect(headings).toEqual([
      { id: 'starostlivost-1', level: 2, text: 'Starostlivosť 1' },
    ]);
  });
});
