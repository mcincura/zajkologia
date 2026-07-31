# Zajkológia homepage club card — design QA

## Comparison target

- Source visual truth: `/tmp/codex-remote-attachments/019faf4c-b699-7220-9f4f-02c59b5ee0fc/2f3a8ba8-c8ed-4dd5-8d2b-ec5354c0e954/1-Photo-1.jpg`
- Supplied replacement artwork: `/tmp/codex-remote-attachments/019faf4c-b699-7220-9f4f-02c59b5ee0fc/2f3a8ba8-c8ed-4dd5-8d2b-ec5354c0e954/2-Photo-2.jpg`
- Browser-rendered implementation: `design-qa-assets/club-card-implementation-393x852.png`
- Focused implementation crop: `design-qa-assets/club-card-implementation-crop.jpg`
- Focused normalized source crop: `design-qa-assets/club-card-source-crop-361.jpg`
- Combined comparison evidence: `design-qa-assets/club-card-side-by-side.png`
- Route and state: homepage, initial state, scroll position `0`, mobile layout.

## Viewport and normalization

- Source image: `588 × 1280` pixels, including Safari/device chrome.
- Source card crop: `550 × 302` pixels, resampled to `361 × 198` for equal-width comparison.
- Implementation browser viewport: `393 × 852` CSS pixels.
- Implementation screenshot: `393 × 852` pixels at browser density `1`.
- Implementation card: `361 × 214` CSS pixels.
- Full-view comparison used the complete source screenshot and complete browser capture. Focused comparison placed both card crops together at the same `361px` width.

## Required fidelity surfaces

- Fonts and typography: Existing Inter stack retained. Title, supporting copy, feature labels, and CTA reproduce the source hierarchy and wrapping; the club title stays on one line at the target phone width.
- Spacing and layout rhythm: Crown, copy, four feature items, upper-right artwork, primary CTA, and secondary About pill follow the reference order and alignment. The production CTA is slightly taller than the normalized reference to preserve a comfortable touch target.
- Colors and visual tokens: Burgundy panel, cream controls, blush icon treatment, pale pink line icons, border, and elevation closely match the supplied reference while using existing site colors.
- Image quality and asset fidelity: The supplied black-and-white lop rabbit/book artwork was isolated into `public/club-rabbit-book.png`, positioned at the upper-right, and checked for transparent-background halos and clipping. It intentionally replaces the tan rabbit in the source.
- Copy and content: `Zajkológia Klub`, the supplied explanatory sentence, all four content labels, the club CTA, and the About CTA match the reference wording.

## Interaction and browser checks

- Primary CTA resolved uniquely and navigated to `/klub`; browser returned successfully to the homepage.
- No horizontal overflow at `320px`, `393px`, or `1440px` widths.
- No browser console warnings or errors during the homepage and club-link check.
- Focus-visible, hover, active, and reduced-motion styles remain defined for both calls to action.

## Comparison history

### Pass 1

- P2: At `320px`, the `Príručky` and `Audioblogy` labels collided.
  - Fix: tightened the narrow-screen feature type and allowed only the two-word first label to wrap.
  - Post-fix evidence: the final `320px` browser capture showed four distinct readable labels with no document overflow.
- P2: The replacement rabbit was visibly larger and higher than the reference artwork in the equal-width card comparison.
  - Fix: reduced the mobile artwork width from `10.75rem` to `9.5rem` while keeping the book anchored above the CTA.
  - Post-fix evidence: `design-qa-assets/club-card-side-by-side.png` shows the rabbit fully contained and proportionally aligned with the reference.

### Final pass

- No actionable P0, P1, or P2 findings remain.
- P3: The implementation card is `16px` taller than the normalized source crop. This is acceptable because the production CTA preserves a larger touch target and the reference crop came from a downsampled device screenshot.
- No additional focused region was needed: the equal-width card crop keeps the typography, icons, artwork edges, and controls clearly readable.

## Final result

final result: passed

---

# Membership club mobile containment and discovery controls — design QA

## Comparison target

- Source visual truth: `/var/folders/dr/gd89g9_n1971xnx583b8qng80000gn/T/codex-clipboard-b2ac4470-ffae-4abc-896a-b0858cfa2ed6.png` (locked-card overflow) and `/var/folders/dr/gd89g9_n1971xnx583b8qng80000gn/T/codex-clipboard-136e3eef-402e-4512-8bb5-909f3a6a91cd.png` (controls exposed to a non-member).
- Browser-rendered mobile implementation: `design-qa-assets/membership-preview-mobile-390x844.png`.
- Browser-rendered desktop implementation: `design-qa-assets/membership-preview-desktop-1440x900.png`.
- Combined mobile comparison evidence: `design-qa-assets/membership-mobile-reference-comparison.png` (source on the left, corrected local implementation on the right).
- Route and state: `/klub`, logged-out preview state for visual QA. The automated unit test separately covers a logged-in session with `hasAccess: false`; live browser QA verified the full-access state with the backend-provided test entitlement.

## Viewport and normalization

- Source screenshots: `942 × 2048` pixels, mobile device captures. The comparison image normalizes the overflow source to `375 × 812` before placing it beside the browser capture.
- Mobile browser viewport: `390 × 844` CSS pixels; the visible document area was `375 × 812` CSS pixels because of browser chrome/scrollbar capture.
- Desktop browser viewport: `1440 × 900` CSS pixels; the visible document area was `1425 × 891` CSS pixels.
- Focused comparison: the locked first-card cover and its containing card are visible at equal normalized width in the combined image. No device frame or browser chrome was treated as product UI.

## Required fidelity surfaces

- Fonts and typography: Existing typography, line-height, and locked-cover label styling are unchanged; the overlay remains centered over the same 16:9 media region.
- Spacing and layout rhythm: On mobile, covers now follow the available card width rather than forcing a 210px minimum height. Card padding, media radius, and desktop media proportions remain unchanged.
- Colors and visual tokens: Existing cream, burgundy, green, blur treatment, and lock overlay colors are unchanged.
- Image quality and asset fidelity: Existing cover assets remain in use. The blur stays clipped to the existing media radius; no assets were replaced or generated.
- Copy and content: Existing Slovak copy is unchanged. Preview users retain posts and their `Náhľad pre členov` overlay, while discovery controls are absent rather than disabled.

## Comparison history

### Pass 1

- [P1] Mobile cover escaped its own card. Source evidence shows the first locked cover running past the card’s right edge. Browser measurement before the fix confirmed a `373.33px` cover inside a `351px` card at the narrow viewport.
  - Fix: removed the mobile `210px` minimum height that, combined with `aspect-ratio: 16 / 9`, forced the cover wider than its grid track; added width/min-width/max-width containment to the card media and grid item.
  - Post-fix evidence: the local mobile capture measures a `317px` cover inside a `351px` card, and the combined comparison shows the media fully inset and clipped to its rounded frame.
- [P1] IP-preview users saw discovery controls even without content entitlement. The supplied screenshot shows categories, search, and media filters above locked previews.
  - Fix: render the entire category navigation, search, media filters, saved filter, and filter context only when `/api/membership/me` returns `hasAccess: true`; preview cards continue to render in a single-column feed shell.
  - Post-fix evidence: local mobile and desktop DOM checks found zero category/filter buttons and no search form in the preview state. The logged-in no-access unit test confirms the same DOM absence.
- [P2] Removing the sidebar initially left the preview feed in the sidebar grid column on desktop.
  - Fix: the preview feed now uses its own single-column grid modifier.
  - Post-fix evidence: desktop capture measures the preview card from `16px` to `1409px`, with its cover fully within that card, and no horizontal document overflow.

### Final pass

- Full-view and focused comparison completed with the supplied mobile defect screenshot and browser-rendered local implementation.
- Mobile and desktop checks found no horizontal page overflow, no media escaping its card, no relevant console warnings/errors, and no actionable P0/P1/P2 visual differences in the requested scope.
- Interaction evidence: live full-access session showed categories, search, and all media filters; activating `Videá` updated the filter to `aria-pressed="true"`.

## Final result

final result: passed
