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
