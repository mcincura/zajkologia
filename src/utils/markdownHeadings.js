import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';

const ARTICLE_HEADING_LEVELS = new Set([2, 3, 4]);
const markdownHeadingProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

const decodeHeadingEntity = (entity) => {
  const named = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  if (named[entity]) return named[entity];

  const numericMatch = entity.match(/^&#(x?[0-9a-f]+);$/i);
  if (!numericMatch) return entity;

  const isHex = numericMatch[1].toLowerCase().startsWith('x');
  const codePoint = Number.parseInt(isHex ? numericMatch[1].slice(1) : numericMatch[1], isHex ? 16 : 10);
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;

  return String.fromCodePoint(codePoint);
};

export const plainHeadingText = (value) => String(value || '')
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/~~([^~]+)~~/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/_([^_]+)_/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&(amp|lt|gt|quot|#39|#x?[0-9a-f]+);/gi, decodeHeadingEntity)
  .replace(/\\([\\`*{}[\]()#+.!_>-])/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

export const slugifyHeading = (value) => plainHeadingText(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/&/g, ' a ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'sekcia';

export const createHeadingSlugger = () => {
  const occurrences = new Map();

  return (value) => {
    const base = slugifyHeading(value);
    const count = (occurrences.get(base) || 0) + 1;
    occurrences.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
};

const headingTextFromNode = (node) => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(headingTextFromNode).join('');
};

const assignHeadingIds = (tree, { collect = false } = {}) => {
  const nextHeadingId = createHeadingSlugger();
  const headings = [];

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
      const level = Number(node.tagName.slice(1));
      const text = plainHeadingText(headingTextFromNode(node));
      const existingId = String(node.properties?.id || '').trim();
      const classNames = Array.isArray(node.properties?.className)
        ? node.properties.className
        : [node.properties?.className].filter(Boolean);
      const isGeneratedLabel = classNames.includes('sr-only') || existingId === 'footnote-label';
      const id = existingId || nextHeadingId(text);

      if (!existingId) {
        node.properties = {
          ...(node.properties || {}),
          id,
        };
      }

      if (
        collect &&
        !isGeneratedLabel &&
        text &&
        ARTICLE_HEADING_LEVELS.has(level)
      ) {
        headings.push({ id, level, text });
      }
    }

    if (Array.isArray(node.children)) node.children.forEach(visit);
  };

  visit(tree);
  return headings;
};

export const rehypeHeadingIds = () => (tree) => {
  assignHeadingIds(tree);
};

export const extractMarkdownHeadings = (markdown) => {
  const syntaxTree = markdownHeadingProcessor.parse(String(markdown || ''));
  const hastTree = markdownHeadingProcessor.runSync(syntaxTree);
  return assignHeadingIds(hastTree, { collect: true });
};

export const selectTableOfContentsHeadings = (headings) => {
  if (!headings?.length) return [];

  const primaryLevel = headings.reduce(
    (lowest, heading) => Math.min(lowest, heading.level),
    Number.POSITIVE_INFINITY
  );

  return headings.filter((heading) => heading.level === primaryLevel);
};
