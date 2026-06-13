import React from 'react';

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', color: '#6b4c3b' }}>{title}</h2>
    <div style={{ color: '#4b5563', lineHeight: 1.75 }}>{children}</div>
  </section>
);

const Terms = () => {
  return (
    <div className="container" style={{ maxWidth: '900px', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '2.3rem', marginBottom: '0.75rem' }}>Obchodné podmienky</h1>
      <p style={{ color: '#666', marginBottom: '2.5rem' }}>Posledná aktualizácia: 11. júna 2026</p>

      <Section title="Predávajúci">
        <p>
          Predávajúci: <strong>Zajkologia</strong><br />
          Kontaktný e-mail: <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a>
        </p>
      </Section>

      <Section title="Produkt">
        <p>
          Predávajúci ponúka digitálny produkt <strong>Králik ako domáce zviera</strong>, ktorý je dodávaný
          ako PDF príručka na e-mail uvedený zákazníkom v pokladni.
        </p>
      </Section>

      <Section title="Cena a platba">
        <p>
          Aktuálna cena produktu je zobrazená v pokladni Stripe pred odoslaním platby. Platba prebieha cez
          zabezpečenú pokladňu Stripe. Predávajúci nespracúva ani neukladá údaje platobnej karty.
        </p>
      </Section>

      <Section title="Dodanie digitálneho obsahu">
        <p>
          PDF príručka je dodaná elektronicky na e-mail uvedený v pokladni po úspešnom potvrdení platby.
          Dodanie sa považuje za začaté odoslaním e-mailu s PDF prílohou alebo odkazom na digitálny obsah.
        </p>
      </Section>

      <Section title="Súhlas s okamžitým dodaním a odstúpenie od zmluvy">
        <p>
          Pri nákupe digitálneho obsahu zákazník v pokladni potvrdzuje tento súhlas:
        </p>
        <blockquote
          style={{
            margin: '1rem 0',
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #eccfc3',
            background: '#fdf6f6',
            color: '#6b4c3b',
            fontWeight: 700,
          }}
        >
          Súhlasím so začatím dodávania digitálneho obsahu (PDF príručky) pred uplynutím 14-dňovej lehoty
          na odstúpenie od zmluvy a beriem na vedomie, že začatím dodávania digitálneho obsahu strácam
          právo na odstúpenie od zmluvy.
        </blockquote>
        <p>
          Ak zákazník udelí tento súhlas a predávajúci začne s dodaním digitálneho obsahu, zákazník berie
          na vedomie, že v rozsahu povolenom zákonom stráca právo odstúpiť od zmluvy bez uvedenia dôvodu.
          Potvrdenie objednávky a udeleného súhlasu je zaslané zákazníkovi e-mailom.
        </p>
      </Section>

      <Section title="Reklamácie a podpora">
        <p>
          Ak zákazník PDF nedostane, príloha je poškodená alebo má inú technickú chybu, môže kontaktovať
          predávajúceho na <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a>. Predávajúci
          primerane preverí platbu a doručenie a v prípade chyby zabezpečí opätovné odoslanie produktu.
        </p>
      </Section>

      <Section title="Spracúvanie osobných údajov">
        <p>
          Predávajúci spracúva údaje potrebné na vybavenie objednávky, najmä e-mail, meno, identifikátory
          platby a potvrdenie súhlasu s okamžitým dodaním digitálneho obsahu. Platobné údaje spracúva Stripe.
        </p>
      </Section>
    </div>
  );
};

export default Terms;
