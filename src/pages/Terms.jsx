import React from 'react';
import { Link } from 'react-router-dom';

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
      <p style={{ color: '#666', marginBottom: '2.5rem' }}>Posledná aktualizácia: 20. júna 2026</p>

      <Section title="Predávajúci">
        <p>
          Predávajúci: <strong>Zajkologia</strong><br />
          Kontaktný e-mail: <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a>
        </p>
      </Section>

      <Section title="Produkt">
        <p>
          Predávajúci ponúka digitálne produkty, ktoré sú dodávané elektronicky na e-mail uvedený
          zákazníkom v pokladni, a fyzické produkty v malých ručne vyrábaných sériách.
        </p>
        <p>
          Fyzický produkt <strong>Čuchacie loptičky</strong> je ručne vyrábaný textilný produkt pre králiky.
          Ak je produkt predávaný formou predobjednávky, zákazník je na túto skutočnosť upozornený
          na produktovej stránke aj v pokladni.
        </p>
      </Section>

      <Section title="Cena a platba">
        <p>
          Aktuálna cena produktu je zobrazená v pokladni Stripe pred odoslaním platby. Platba prebieha cez
          zabezpečenú pokladňu Stripe. Predávajúci nespracúva ani neukladá údaje platobnej karty.
        </p>
        <p>
          Pri fyzických produktoch sa v pokladni zobrazí aj cena dopravy. Pre predobjednávku čuchacích
          loptičiek je doprava na Slovensko a do Česka nastavená na 1 €.
        </p>
      </Section>

      <Section title="Dodanie digitálneho obsahu">
        <p>
          PDF príručka je dodaná elektronicky na e-mail uvedený v pokladni po úspešnom potvrdení platby.
          Dodanie sa považuje za začaté odoslaním e-mailu s PDF prílohou alebo odkazom na digitálny obsah.
        </p>
      </Section>

      <Section title="Dodanie fyzických produktov a predobjednávky">
        <p>
          Pri fyzických produktoch zákazník v pokladni zadáva meno, e-mail, telefón a doručovaciu adresu.
          Doručenie je pri aktuálnej predobjednávke dostupné pre Slovensko a Česko.
        </p>
        <p>
          Pri predobjednávke predávajúci objednávku po úspešnej platbe zaeviduje a zákazníkovi pošle
          potvrdenie e-mailom. Keďže ide o ručnú výrobu v malom množstve, termín výroby a odoslania
          bude komunikovaný pri konkrétnej predobjednávke alebo následným e-mailom.
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

      <Section title="Odstúpenie od zmluvy pri fyzickom produkte">
        <p>
          Pri nákupe fyzického produktu online má spotrebiteľ spravidla právo odstúpiť od zmluvy do
          14 dní od doručenia tovaru bez uvedenia dôvodu, pokiaľ sa neuplatní zákonná výnimka.
          Ručná výroba sama osebe neznamená, že ide o produkt vyrobený na osobnú špecifikáciu zákazníka.
        </p>
        <p>
          Odstúpenie alebo žiadosť o vrátenie môžete podať cez stránku{' '}
          <Link to="/odstupenie-od-zmluvy">Odstúpenie od zmluvy</Link> alebo e-mailom na{' '}
          <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a>. Žiadosť najprv skontrolujeme
          manuálne, aby sme overili objednávku, stav doručenia a prípadné vrátenie tovaru. Tento manuálny
          proces neobmedzuje zákonné práva spotrebiteľa.
        </p>
        <p>
          Ak zákazník odstúpi od zmluvy, tovar je potrebné poslať späť primerane nepoškodený a nepoužívaný
          nad rámec potrebný na zistenie povahy a vlastností produktu. Náklady na spätné odoslanie znáša
          zákazník, ak sa predávajúci individuálne nerozhodne inak alebo ak nejde o oprávnenú reklamáciu.
          Vrátenie platby môže byť zadržané do prijatia vráteného tovaru alebo preukázania jeho odoslania.
        </p>
      </Section>

      <Section title="Reklamácie a podpora">
        <p>
          Ak zákazník PDF nedostane, príloha je poškodená alebo má inú technickú chybu, môže kontaktovať
          predávajúceho na <a href="mailto:kontakt@zajkologia.com">kontakt@zajkologia.com</a>. Predávajúci
          primerane preverí platbu a doručenie a v prípade chyby zabezpečí opätovné odoslanie produktu.
        </p>
        <p>
          Pri fyzickom produkte môže zákazník kontaktovať predávajúceho aj v prípade poškodenia, nesprávneho
          produktu alebo inej vady. Reklamáciu preveríme manuálne a navrhneme primerané riešenie podľa
          povahy problému.
        </p>
      </Section>

      <Section title="Spracúvanie osobných údajov">
        <p>
          Predávajúci spracúva údaje potrebné na vybavenie objednávky, najmä e-mail, meno, identifikátory
          platby, doručovacie údaje pri fyzických produktoch a potvrdenie súhlasu s príslušnými podmienkami.
          Platobné údaje spracúva Stripe.
        </p>
      </Section>
    </div>
  );
};

export default Terms;
