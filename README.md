# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Markdown guide (as rendered on the site)

Blog post content is rendered by `src/components/MarkdownContent.jsx` using `react-markdown` + `remark-gfm`.

### Headings

```md
# Nadpis (H1)
## Podnadpis (H2)
### Sekcia (H3)
```

### Paragraphs

Just write text as normal paragraphs:

```md
Toto je odsek. Text sa na stránke zarovnáva do bloku (justify).

Toto je ďalší odsek.
```

### Links

```md
Pozri si [našu stránku](https://zajkologia.com).
```

Notes:
- Links open in a new tab (`target="_blank"`) and use `rel="noreferrer"`.
- Links are underlined and use the theme primary color.

### Lists

Unordered:

```md
- Prvá položka
- Druhá položka
  - Vnorená položka
```

Ordered:

```md
1. Prvý krok
2. Druhý krok
```

### Blockquotes

```md
> Toto je citát alebo zvýraznená poznámka.
```

### Code

Inline code:

```md
Použi príkaz `npm run build`.
```

Code block:

````md
```js
console.log('Ahoj');
```
````

### Images

```md
![Popis obrázka](https://example.com/obrazok.jpg)
```

Notes:
- Images are centered, responsive (`max-width: 100%`), and keep their natural height.

### Horizontal rule

```md
---
```

### Tables (GitHub Flavored Markdown)

```md
| Stĺpec A | Stĺpec B |
|---------:|:--------|
| 123      | text    |
| 456      | ďalší   |
```

Notes:
- Tables scroll horizontally on small screens.

### Other GFM features

`remark-gfm` also enables common GitHub-style Markdown features (for example strikethrough `~~text~~`). Anything not explicitly styled will render with default browser styling.
