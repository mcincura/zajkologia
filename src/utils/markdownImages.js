import { unified } from 'unified';
import remarkParse from 'remark-parse';

const parser = unified().use(remarkParse);
const LAYOUT_PATTERN = /^zajkologia-image:(left|center|right):(small|medium|large|full)(?:\s+([\s\S]*))?$/;

export const parseMarkdownImageLayout = (title) => {
  const match = String(title || '').match(LAYOUT_PATTERN);
  return match ? { alignment: match[1], size: match[2], title: match[3] || '' } : null;
};

export const isSafeArticleImageUrl = (value) => {
  const source = String(value || '').trim();
  if (!source || [...source].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(source, 'https://zajkologia.com');
    return /^https?:\/\//i.test(source)
      ? ['http:', 'https:'].includes(url.protocol)
      : source.startsWith('/') && url.origin === 'https://zajkologia.com';
  } catch {
    return false;
  }
};

export const createMarkdownImage = ({ src, alt = '', alignment = 'center', size = 'medium', title = '' }) => {
  if (!isSafeArticleImageUrl(src)) throw new Error('invalid_image_url');
  const safeAlignment = ['left', 'center', 'right'].includes(alignment) ? alignment : 'center';
  const safeSize = ['small', 'medium', 'large', 'full'].includes(size) ? size : 'medium';
  const description = alt.replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/[[\]]/g, '\\$&');
  const source = src.trim().replace(/\\/g, '%5C').replace(/</g, '%3C').replace(/>/g, '%3E');
  const imageTitle = `zajkologia-image:${safeAlignment}:${safeSize}${title ? ` ${title}` : ''}`
    .replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `![${description}](<${source}> "${imageTitle}")`;
};

export const listMarkdownImages = (markdown) => {
  const tree = parser.parse(String(markdown || ''));
  const definitions = new Map();
  const images = [];
  const visit = (node, callback) => {
    callback(node);
    node.children?.forEach((child) => visit(child, callback));
  };
  visit(tree, (node) => {
    if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
  });
  visit(tree, (node) => {
    const image = node.type === 'image' ? node : node.type === 'imageReference' ? definitions.get(node.identifier) : null;
    if (!image || node.position?.start.offset == null) return;
    const layout = parseMarkdownImageLayout(image.title);
    images.push({
      start: node.position.start.offset,
      end: node.position.end.offset,
      src: image.url,
      alt: node.alt || '',
      alignment: layout?.alignment || 'center',
      size: layout?.size || 'full',
      title: layout ? layout.title : image.title || '',
    });
  });
  return images;
};

// Only our allowlisted title metadata becomes layout classes. Raw HTML remains
// disabled in ReactMarkdown, and ordinary Markdown images retain their layout.
export const rehypeMarkdownImages = () => (tree) => {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'p') {
      const children = node.children.filter((child) => child.type !== 'text' || child.value.trim());
      const image = children.length === 1 && children[0].tagName === 'img' ? children[0] : null;
      const layout = image && parseMarkdownImageLayout(image.properties?.title);
      if (layout) {
        node.tagName = 'figure';
        node.properties = {
          className: ['markdown-image', `markdown-image--${layout.alignment}`, `markdown-image--${layout.size}`],
        };
      }
    }
    if (node.type === 'element' && node.tagName === 'img') {
      const layout = parseMarkdownImageLayout(node.properties?.title);
      if (layout) {
        if (layout.title) node.properties.title = layout.title;
        else delete node.properties.title;
      }
    }
    node.children?.forEach(visit);
  };
  visit(tree);
};
