export const products = [
  {
    id: 1,
    slug: 'zajkologia-starter-guide',
    name: 'Králik ako domáce zviera',
    shortDescription:
      'Premýšľaš nad králikom? Alebo ho už máš doma a chceš si byť istý/istá, že robíš všetko správne? V tejto príručke nájdeš zrozumiteľne spracované základy starostlivosti o králika.',
    description:
      'Premýšľaš nad králikom? Alebo ho už máš doma a chceš si byť istý/istá, že robíš všetko správne? V tejto príručke nájdeš zrozumiteľne spracované základy starostlivosti o králika.',
    price: '',
    image: '/product-gallery/starter-guide-main-thumbnail.webp',
    heroImage: '/product-gallery/starter-guide-main-thumbnail.webp',
    languages: ['sk'],
    deliveryNote: 'Po zaplatení dostanete príručku vo forme PDF na email.',
    featureList: [
      'Je králik pre mňa vhodný?',
      'Povahové rozdiely medzi pohlaviami',
      'Bývanie a správne vybavenie',
      'Strava',
      'Správanie a komunikácia králika',
      'Zdravie a veterinárna starostlivosť',
      'Ako naučiť králika používať toaletu',
    ],
    pageTheme: {
      accent: '#dbc29b',
      accentStrong: '#8f5822',
      tint: '#f7ead8',
      surface: '#fffaf3',
      glow: 'rgba(143, 88, 34, 0.16)',
    },
    productPage: {
      template: 'digital',
      lead:
        'Premýšľaš nad králikom? Alebo ho už máš doma a chceš si byť istý/istá, že robíš všetko správne? V tejto príručke nájdeš zrozumiteľne spracované základy starostlivosti o králika.',
      galleryImages: [
        '/product-gallery/starter-guide-main-thumbnail.webp',
        '/product-gallery/starter-guide-tablet-2.webp',
        '/product-gallery/starter-guide-tablet-3.webp',
        '/product-gallery/starter-guide-tablet-1.webp',
        '/product-gallery/starter-guide-tablet-4.webp',
      ],
      trustBadges: [
        'PDF doručené na email',
        'Zrozumiteľné pre začiatočníkov',
      ],
      contentTitle: 'Čo všetko v príručke nájdete?',
      detailSections: [
        {
          icon: 'CircleHelp',
          title: 'Je králik pre mňa naozaj vhodný?',
          text:
            'Získate úprimný pohľad na to, čo v skutočnosti znamená vlastniť králika a aký dlhodobý záväzok tento miláčik predstavuje.',
        },
        {
          icon: 'House',
          title: 'Bývanie a vybavenie',
          text:
            'Naučíte sa, ako králikovi vytvoriť bezpečný a podnetný domov, v ktorom sa nebude cítiť ako väzeň, ale ako člen rodiny.',
        },
        {
          icon: 'Carrot',
          title: 'Strava bez mýtov',
          text:
            'Pomôžeme vám rozlúsknuť mýty o krmive, zelenine a ovocí, aby ste predišli zdravotným problémom spôsobeným nesprávnou výživou.',
        },
        {
          icon: 'ScanSearch',
          title: 'Dešifrovanie reči králičieho tela',
          text:
            'Naučíte sa rozpoznávať jemné signály, vďaka ktorým zistíte, kedy je váš králik šťastný a kedy od vás naopak potrebuje viac priestoru a pokoja.',
        },
        {
          icon: 'Plus',
          title: 'Zdravie a hygiena',
          text:
            'Získate prehľad o základnej starostlivosti, od správneho učenia na toaletu až po dôležitosť vakcinácie a prevencie závažných ochorení.',
        },
      ],
      closingTitle: 'Chceš mať pokojnejší štart a menej zbytočných omylov?',
      closingText:
        'Táto príručka ti dá jeden zrozumiteľný základ, ku ktorému sa vieš vracať vždy, keď potrebuješ rýchlo overiť správny krok.',
      closingNote: 'Jednorazový nákup, okamžitý prístup po zaplatení.',
    },
  },
  {
    id: 2,
    slug: 'dennik-hmotnosti-kralika',
    name: 'Denník hmotnosti králika',
    shortDescription:
      'Zabezpečte svojmu králikovi dlhý a zdravý život vďaka pravidelnému monitorovaniu. Táto praktická príručka a denník vám pomôžu jednoducho sledovať vývoj hmotnosti vášho ušatého spoločníka, čo je často najrýchlejší spôsob, ako odhaliť skryté zdravotné problémy.',
    description:
      'Praktická pomôcka pre majiteľov králikov, ktorí chcú mať vývoj hmotnosti, kondíciu a zmeny v starostlivosti prehľadne pod kontrolou.',
    price: '2,99 €',
    image: '/product-gallery/weight-journal-cover-optimized.webp',
    heroImage: '/product-gallery/weight-journal-cover-optimized.webp',
    languages: ['sk', 'cs'],
    accentColor: '#f3d6df',
    deliveryNote:
      'Po zaplatení dostanete slovenskú aj českú PDF verziu na email. Nemusíte si vyberať.',
    featureList: [
      'Sprievodca zdravým vážením',
      'Prehľad plemien podľa hmotnosti',
      'Skóre telesnej kondície',
      'Odporúčania pri zmene váhy',
      'Denník záznamov na 10 rokov',
    ],
    pageTheme: {
      accent: '#f1c8d5',
      accentStrong: '#a64968',
      tint: '#f7e8df',
      surface: '#fffaf5',
      glow: 'rgba(166, 73, 104, 0.16)',
    },
    productPage: {
      template: 'digital',
      lead:
        'Zabezpečte svojmu králikovi dlhý a zdravý život vďaka pravidelnému monitorovaniu. Táto praktická príručka a denník vám pomôžu jednoducho sledovať vývoj hmotnosti vášho ušatého spoločníka, čo je často najrýchlejší spôsob, ako odhaliť skryté zdravotné problémy.',
      galleryImages: [
        '/product-gallery/weight-journal-cover-optimized.webp',
        '/product-gallery/weight-journal-1-optimized.webp',
        '/product-gallery/weight-journal-2-optimized.webp',
        '/product-gallery/weight-journal-3-optimized.webp',
      ],
      galleryImagesByCountry: {
        CZ: [
          '/product-gallery/weight-journal-cz-cover.webp',
          '/product-gallery/weight-journal-cz-profile.webp',
          '/product-gallery/weight-journal-cz-condition.webp',
          '/product-gallery/weight-journal-cz-year.webp',
        ],
      },
      trustBadges: [
        'Slovenská aj česká verzia v jednom nákupe',
        'PDF doručené na email',
      ],
      languageNote:
        'Po nákupe pošleme obe verzie: slovenskú aj českú. Nemusíte si vyberať jednu z nich.',
      contentTitle: 'Čo v príručke nájdete?',
      detailSections: [
        {
          icon: 'Scale',
          title: 'Sprievodca zdravým vážením',
          text:
            'Návod, ako správne a bez stresu vážiť králika a prečo je pravidelnosť kľúčová.',
        },
        {
          icon: 'Layers3',
          title: 'Prehľad plemien',
          text:
            'Rozdelenie králikov podľa hmotnostných kategórií.',
        },
        {
          icon: 'HeartPulse',
          title: 'Skóre telesnej kondície',
          text:
            'Praktická pomôcka na vizuálne a hmatové posúdenie, či má králik ideálnu váhu, nadváhu alebo podváhu.',
        },
        {
          icon: 'Stethoscope',
          title: 'Odborné odporúčania',
          text:
            'Ako postupovať pri zmenách hmotnosti a kedy kontaktovať veterinára.',
        },
        {
          icon: 'CalendarDays',
          title: 'Denník na 10 rokov',
          text:
            'Prehľadné tabuľky na zapisovanie nameraných hodnôt a denník zmien stravy, vďaka ktorým budete mať históriu zdravia vášho králika vždy pod kontrolou.',
        },
      ],
      closingTitle: 'Maj hmotnosť králika pod kontrolou',
      closingText:
        'Denník vám pomôže zachytiť zmeny skôr, než sa z malého výkyvu stane problém, a zároveň dá veterinárovi jasnejší prehľad.',
      closingNote: 'Jednorazový nákup, okamžitý prístup po zaplatení.',
    },
  },
  {
    id: 3,
    slug: 'cuchacia-lopticka-pre-kraliky',
    name: 'Čuchacie loptičky',
    shortDescription:
      'Mäkké textilné loptičky na schovávanie sušených byliniek alebo malých pamlskov. Králik ich musí hľadať nosom a maškrtenie je vďaka tomu pokojnejšie.',
    description:
      'Interaktívne čuchacie loptičky, ktoré podporujú prirodzené hľadanie potravy a vedia spomaliť maškrtenie.',
    price: '7,99 €',
    originalPrice: '12,99 €',
    saleLabel: '-38 %',
    saleDescription: 'Predobjednávková cena',
    preorderDeal: {
      anchorLabel: 'Bežná cena po predobjednávke',
      currentLabel: 'Predobjednávka teraz',
    },
    shippingNote: 'Doprava CZ/SK + 1 €',
    stockNote: 'Limitovaná dostupnosť',
    preorderNote: 'Limitovaná predobjednávka',
    purchaseLabel: 'Predobjednávka čoskoro',
    isMock: true,
    hideStatusBadges: true,
    productType: 'physical',
    image: '/product-gallery/snuffle-ball/black-white.jpg',
    heroImage: '/product-gallery/snuffle-ball/black-white.jpg',
    languages: [],
    deliveryNote:
      'Fyzický produkt. Doprava po Slovensku a Česku je 1 €.',
    featureList: [
      'Predobjednávková cena 7,99 € namiesto 12,99 €',
      'Ručne vyrábané v malých sériách',
      'Doprava CZ/SK + 1 €',
      'Limitovaná dostupnosť podľa variantov',
      'Štyri farebné kombinácie',
      'Na schovávanie byliniek alebo pamlskov',
    ],
    colorVariants: [
      {
        code: 'black_white',
        name: 'Čierno-biela',
        available: 3,
        image: '/product-gallery/snuffle-ball/black-white.jpg',
        swatches: ['#111111', '#f5f0e8'],
      },
      {
        code: 'grey',
        name: 'Sivo-zelená',
        available: 3,
        image: '/product-gallery/snuffle-ball/grey.jpg',
        swatches: ['#9da19c'],
      },
      {
        code: 'black_caramel',
        name: 'Čierno-karamelová',
        available: 3,
        image: '/product-gallery/snuffle-ball/black-caramel.jpg',
        swatches: ['#111111', '#b9825f'],
      },
      {
        code: 'cream',
        name: 'Biela',
        available: 3,
        image: '/product-gallery/snuffle-ball/cream.jpg',
        swatches: ['#fbfaf4'],
      },
    ],
    pageTheme: {
      accent: '#b8d8ca',
      accentStrong: '#376454',
      tint: '#eef7f2',
      surface: '#fffdf8',
      glow: 'rgba(55, 100, 84, 0.16)',
    },
    productPage: {
      template: 'physical_preorder',
      lead:
        'Doprajte svojmu ušatému priateľovi aktivitu, ktorá ho nielen zabaví, ale aj mentálne unaví! Naša čuchacia loptička je navrhnutá tak, aby stimulovala prirodzené inštinkty králikov pri hľadaní potravy, podporila ich zvedavosť a zároveň im priniesla kopec zábavy pri objavovaní skrytých dobrôt.',
      galleryImages: [
        '/product-gallery/snuffle-ball/black-white.jpg',
        '/product-gallery/snuffle-ball/bunny-grey-sniff.jpg',
        '/product-gallery/snuffle-ball/handmade-finished.jpg',
        '/product-gallery/snuffle-ball/grey.jpg',
        '/product-gallery/snuffle-ball/black-caramel.jpg',
        '/product-gallery/snuffle-ball/cream.jpg',
        '/product-gallery/snuffle-ball/bunny-grey-front.jpg',
        '/product-gallery/snuffle-ball/bunny-grey-ready.jpg',
        '/product-gallery/snuffle-ball/handmade-materials.jpg',
        '/product-gallery/snuffle-ball/handmade-cutting.jpg',
        '/product-gallery/snuffle-ball/handmade-label.jpg',
      ],
      trustBadges: [],
      purchaseHighlights: [
        'Ručne vyrábané po kusoch',
        'Doprava po Slovensku a Česku za 1 €',
        '4 farebné kombinácie',
        'Vhodné na sušené bylinky a malé pamlsky',
      ],
      preorderMicrocopy:
        'Predobjednávka platí pre prvú malú sériu ručne vyrábaných kusov. Počet miest je obmedzený podľa aktuálnej dostupnosti farebných variantov.',
      variantsIntro: 'Vyber si variant, ktorý sa ti páči najviac. Každý je dostupný len v malom počte kusov.',
      handmadeStory: {
        title: 'Ručne vyrábané po kusoch, nie vo veľkej sérii',
        text:
          'Každú čuchaciu loptičku striháme, skladáme a dokončujeme ručne. Vzniká tak malá séria kusov, pri ktorej si vieme postrážiť vzhľad, veľkosť aj finálnu kontrolu pred odoslaním. Predobjednávka nám umožňuje pripraviť tieto kúsky bez zbytočného skladu a pritom zachovať poctivú ručnú výrobu.',
        items: [
          {
            title: 'Materiál pripravený po farbách',
            text:
              'Každý kus začína pripravenými textilnými dielmi, z ktorých postupne vznikajú záhyby na ukrytie byliniek a pamlskov.',
            image: '/product-gallery/snuffle-ball/handmade-materials.jpg',
          },
          {
            title: 'Strihané a skladané ručne',
            text:
              'Jednotlivé diely sa upravujú ručne, aby loptička držala tvar a zároveň zostala mäkká pre králičí nos.',
            image: '/product-gallery/snuffle-ball/handmade-cutting.jpg',
          },
          {
            title: 'Kontrola hotového kusu',
            text:
              'Hotovú loptičku kontrolujeme v rukách, aby mala dostatok záhybov a príjemnú veľkosť na každodenné používanie.',
            image: '/product-gallery/snuffle-ball/handmade-finished.jpg',
          },
          {
            title: 'Pripravené so značkou Zajkológia',
            text:
              'Pred odoslaním dostane každý kus finálnu kontrolu a jednoduché balenie s kartičkou.',
            image: '/product-gallery/snuffle-ball/handmade-label.jpg',
          },
        ],
      },
      contentTitle: 'Prečo si čuchacie loptičky obľúbia králiky aj ich majitelia',
      detailSections: [
        {
          icon: 'ScanSearch',
          title: 'Zábavnejšie hľadanie potravy',
          text:
            'Do textilných záhybov môžeš ukryť malé kúsky sušených byliniek alebo vhodného pamlsku, takže králik musí odmenu najprv nájsť nosom.',
        },
        {
          icon: 'Clock3',
          title: 'Pomalšie maškrtenie',
          text:
            'Namiesto rýchleho zhltnutia dostane králik jednoduchú aktivitu, pri ktorej sa k odmene dostáva postupne.',
        },
        {
          icon: 'HeartPulse',
          title: 'Viac zvedavosti a obohatenia',
          text:
            'Čuchanie, hľadanie a objavovanie robí z maškrtenia zaujímavejšiu súčasť dňa a príjemné spestrenie bežnej rutiny.',
        },
        {
          icon: 'Layers3',
          title: 'Mäkké textilné prevedenie',
          text:
            'Loptička zostáva mäkká a príjemná na dotyk, pričom v záhyboch vytvára priestor na schovanie malých odmien.',
        },
        {
          icon: 'PackageCheck',
          title: 'Ručná výroba v malej sérii',
          text:
            'Každý kus pripravujeme po jednom, aby sme si vedeli postrážiť vzhľad, spracovanie a finálnu kontrolu pred odoslaním.',
        },
      ],
      usageSteps: {
        title: 'Ako čuchacie loptičky používať',
        note: 'Najlepšie funguje s menšími kúskami, ktoré sa dajú ľahko ukryť medzi textilné záhyby.',
        items: [
          'Do záhybov vlož malé kúsky sušených byliniek alebo vhodného pamlsku.',
          'Polož loptičku králikovi do priestoru, kde sa cíti bezpečne a pokojne.',
          'Nechaj ho hľadať odmenu nosom a objavovať ju vlastným tempom.',
        ],
      },
      preorderInfo: {
        title: 'Dôležité informácie k predobjednávke',
        items: [
          {
            title: 'Predobjednávková cena',
            text: 'Predobjednávková cena 7,99 € platí pre prvú malú sériu. Po jej ukončení bude bežná cena 12,99 €.',
          },
          {
            title: 'Malá séria',
            text: 'Každý farebný variant je dostupný len v obmedzenom počte kusov. Aktuálnu dostupnosť vidíš priamo pri výbere farby.',
          },
          {
            title: 'Doprava',
            text: 'Doprava po Slovensku a Česku je 1 €.',
          },
          {
            title: 'Fyzický produkt',
            text: 'Toto je fyzický produkt, ktorý bude odoslaný po spracovaní predobjednávky.',
          },
        ],
      },
      faqItems: [
        {
          question: 'Je to fyzický produkt?',
          answer: 'Áno, ide o fyzickú ručne vyrábanú čuchaciu loptičku pre králiky.',
        },
        {
          question: 'Čo sa do nej dá schovať?',
          answer: 'Malé kúsky sušených byliniek alebo vhodných pamlskov, ktoré sa dajú ukryť medzi textilné záhyby.',
        },
        {
          question: 'Môžem si vybrať farbu?',
          answer: 'Áno, vyberáš si z aktuálne dostupných farebných kombinácií.',
        },
        {
          question: 'Prečo je to predobjednávka?',
          answer: 'Každý kus vyrábame ručne po jednom, preto najprv otvárame malú sériu za zvýhodnenú cenu a podľa objednávok ju pripravíme na odoslanie.',
        },
        {
          question: 'Koľko kusov je dostupných?',
          answer: 'Počet kusov pri jednotlivých farbách je limitovaný a závisí od aktuálnej dostupnosti pri konkrétnom variante.',
        },
        {
          question: 'Kam doručujete?',
          answer: 'Po Slovensku a Česku. Aktuálne je doprava za 1 €.',
        },
        {
          question: 'Je každá loptička úplne rovnaká?',
          answer: 'Keďže ide o ručnú výrobu, jednotlivé kusy sa môžu v drobných detailoch jemne líšiť. Práve to je prirodzená súčasť malej handmade série.',
        },
      ],
      closingTitle: 'Chceš si pripraviť miesto v predobjednávke?',
      closingText:
        'Predobjednávková cena 7,99 € platí len pre prvú limitovanú sériu ručne vyrábaných čuchacích loptičiek. Vyber si svoju farebnú kombináciu skôr, než sa dostupné kusy minú.',
      closingNote: 'Fyzický produkt • Doprava SK/CZ za 1 € • Malá ručná séria',
    },
  },
];
