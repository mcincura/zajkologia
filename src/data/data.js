// Tento súbor je jediný zdroj obsahu pre web.
// Edituj ho ako "knihu": pridávaj články do `posts` a kategórie do `categories`.
// TIP: Text článku píš do `content` ako Markdown (viď dokumentáciu v `DOCS_OBSAH_SK.md`).

export const categories = [
    { id: 1, name: 'Zdravie', slug: 'zdravie', color: '#9B6A6C' },
    { id: 2, name: 'Strava', slug: 'strava', color: '#B09398' },
    { id: 3, name: 'Starostlivosť', slug: 'starostlivost', color: '#260C1A' },
    { id: 4, name: 'Správanie', slug: 'spravanie', color: '#3C0919' },
    { id: 5, name: 'Zaujímavosti', slug: 'zaujimavosti', color: '#3C0919' },
];

export const posts = [
    {
        id: 1,
        // Unikátne URL článku: malé písmená + pomlčky (bez diakritiky)
        slug: 'bezpecna-zelenina-pre-kralika',
        title: 'Bezpečná zelenina pre králika: rýchly prehľad',
        excerpt: 'Krátky prehľad bezpečnej zeleniny a základné pravidlá kŕmenia.',
        category: 'Strava',
        author: 'Tím Zajkológia',
        date: '2026-01-02',
        // Obrázok môže byť URL alebo súbor z /public (napr. "/zajo.png")
        image: 'https://slidemodel.com/wp-content/uploads/00-how-to-insert-picture-placeholder-in-powerpoint-cover.png',
        // Obsah je Markdown (môže byť viacriadkový text v spätných apostrofoch `...`)
        content: `# Úvod

Tento článok je písaný v **Markdowne**. Môžeš použiť *kurzívu*, **tučné písmo**, nadpisy, zoznamy a odkazy.

# h1
## h2
### h3

**fatty** kokote *krivo*
toto je pouzny text

# Ako dalej?

**zajac** je zviera

juytr

![Popis](/zajo.png)

## Základné pravidlá

- Novú zeleninu zavádzaj postupne
- Sleduj trávenie a správanie
- Vždy zabezpeč **seno** a **vodu**

### Príklady

> Ak si nie si istý/istá, radšej sa poraď s veterinárom.

Viac info: [Navštív náš blog](https://example.com)
`,
    },
    {
        id: 2,
        slug: 'binky-co-to-znamena',
        title: 'Binky: prečo králik skáče od radosti',
        excerpt: 'Binky je prejav radosti. Pozrime sa, čo ho spúšťa.',
        category: 'Správanie',
        author: 'Tím Zajkológia',
        date: '2026-01-01',
        image: 'https://placehold.co/600x400/B09398/white?text=Spr%C3%A1vanie',
        content: `# Binky

Keď králik spraví **binky**, zvyčajne to znamená, že sa cíti bezpečne a je spokojný.

## Najčastejšie dôvody

1. Radosť z behu
2. Nový priestor
3. Hra

---

**Tip:** Dopraj mu priestor a mäkký povrch.
`,
    },
];
