const COUPON_ERROR_MESSAGES = {
  coupon_invalid: 'Tento zľavový kód nepoznáme. Skontrolujte ho a skúste znova.',
  coupon_inactive: 'Tento zľavový kód momentálne nie je aktívny.',
  coupon_not_started: 'Táto zľava ešte nezačala platiť.',
  coupon_expired: 'Platnosť tohto zľavového kódu už skončila.',
  coupon_max_redemptions_reached: 'Táto zľava už bola využitá v maximálnom počte nákupov.',
  coupon_not_valid_for_product: 'Tento zľavový kód neplatí na žiadny produkt v tomto nákupe.',
  coupon_not_valid_for_variant: 'Tento zľavový kód neplatí na vybraný variant.',
  coupon_minimum_amount_not_met: 'Hodnota oprávnených produktov ešte nedosahuje minimum pre túto zľavu.',
  coupon_currency_mismatch: 'Túto zľavu nemožno použiť pri zvolenej mene.',
  coupon_not_combinable_with_sale: 'Tento zľavový kód sa nedá kombinovať s aktuálnou akciovou cenou.',
  coupon_claim_invalid: 'Uvítaciu zľavu sa nepodarilo overiť. Použite pôvodný odkaz z e-mailu.',
  coupon_claim_mismatch: 'Kód nezodpovedá vašej uvítacej zľave.',
  coupon_claim_required: 'Tento kód je viazaný na osobný odkaz z e-mailu.',
  coupon_claim_expired: 'Platnosť vašej uvítacej zľavy už skončila.',
  coupon_claim_consumed: 'Vaša uvítacia zľava už bola použitá.',
  coupon_claim_revoked: 'Táto uvítacia zľava už nie je dostupná.',
  coupon_claim_reserved: 'Uvítacia zľava je rezervovaná v otvorenej pokladni. Dokončite ju alebo ju zatvorte a skúste znova.',
  coupon_sync_pending: 'Zľavu práve pripravujeme v platobnom systéme. Skúste to o chvíľu znova.',
  coupon_sync_error: 'Zľavu sa nepodarilo pripraviť v platobnom systéme. Skúste to neskôr.',
  coupon_quote_stale: 'Cena alebo dostupnosť sa medzitým zmenila. Skontrolujte nový súhrn nákupu a skúste znova.',
  coupon_checkout_total_mismatch: 'Overenú cenu sa nepodarilo bezpečne preniesť do platobnej brány. Platba nebola otvorená; skúste to znova.',
  coupon_reservation_unavailable: 'Zľavu sa nepodarilo dočasne rezervovať. Skúste to prosím znova.',
  welcome_coupon_unavailable: 'Uvítacia zľava momentálne nie je dostupná. Skúste to prosím neskôr.',
  coupon_not_applicable: 'Na tento nákup sa nedá vypočítať zľava.',
  coupon_not_cart_eligible: 'Tento zľavový kód nie je platný pre obsah košíka.',
  cart_empty: 'Košík je prázdny.',
  cart_too_many_items: 'Košík obsahuje príliš veľa položiek.',
  cart_product_not_found: 'Niektorý produkt už nie je dostupný.',
  cart_product_unavailable: 'Niektorý produkt už nie je dostupný na nákup.',
  variant_required: 'Pri fyzickom produkte vyberte variant.',
  variant_unavailable: 'Niektorý vybraný variant už nie je dostupný.',
  variant_sold_out: 'Niektorý vybraný variant sa práve vypredal.',
  inventory_not_ready: 'Tento produkt ešte nie je pripravený na objednanie.',
  cart_mixed_currency: 'Produkty s rozdielnou menou sa nedajú kúpiť spolu.',
  cart_shipping_unavailable: 'Pre túto kombináciu produktov nie je dostupné spoločné doručenie.',
  checkout_coupon_session_no_longer_open: 'Túto pokladňu už nemožno zmeniť. Obnovte stav alebo vytvorte nový pokus.',
  checkout_coupon_locked_for_payment: 'Zľavu možno zmeniť iba pred pokračovaním k platbe.',
  checkout_coupon_active_session_changed: 'Pokladňa sa medzitým zmenila. Obnovte stránku a skúste to znova.',
  checkout_coupon_mutation_conflict: 'Táto zmena zľavy sa už spracúva s inými údajmi. Skúste to znova.',
  checkout_coupon_mutation_pending: 'Predchádzajúci prepočet ešte overujeme. Zopakujte rovnakú zmenu alebo obnovte stránku.',
  checkout_coupon_mutation_superseded: 'Pokladňa už obsahuje novšiu zmenu zľavy. Obnovte stránku.',
  checkout_coupon_session_replacement_failed: 'Zľavu sa nepodarilo bezpečne preniesť do platobnej brány. Pôvodná cena zostala nezmenená; skúste to znova.',
  checkout_coupon_replacement_session_not_open: 'Novú cenu sa nepodarilo bezpečne otvoriť. Pôvodná pokladňa zostala aktívna; skúste to znova.',
  checkout_coupon_response_invalid: 'Pokladňa vrátila neúplný prepočet. Pôvodná cena a zľava zostali nezmenené; skúste to znova.',
  checkout_coupon_attempt_expiring: 'Platnosť tejto pokladne sa končí. Vráťte sa k produktu a vytvorte nový pokus.',
  checkout_coupon_cleanup_reconciliation_required: 'Prepočet sa nepodarilo bezpečne dokončiť. Pôvodná pokladňa zostala platná; skúste to o chvíľu znova.',
  checkout_inventory_reservation_expired: 'Rezervácia produktu vypršala. Vráťte sa k produktu a vytvorte nový pokus.',
  checkout_items_changed: 'Obsah alebo cena objednávky sa zmenili. Vráťte sa k produktu a vytvorte nový pokus.',
  checkout_attempt_busy: 'Pokladňa práve spracúva inú zmenu. Počkajte chvíľu a skúste to znova.',
  checkout_rate_limited: 'Príliš veľa pokusov. Počkajte chvíľu a skúste to znova.',
};

export const normalizeCouponCode = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/\s+/g, '')
  .slice(0, 64);

export const getCouponErrorCode = (error) =>
  String(error?.data?.error || error?.message || '').trim();

export const getCouponErrorMessage = (
  error,
  fallback = 'Zľavu sa nepodarilo overiť. Skúste to prosím znova.'
) => COUPON_ERROR_MESSAGES[getCouponErrorCode(error)] || fallback;

export default COUPON_ERROR_MESSAGES;
