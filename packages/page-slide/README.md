# page-slide

Page-transition theme for the site: the destination page's top-level window
slides in from the side where its menu item sits relative to the current page
(right if later in the menu, left if earlier, downwards if undecidable).

Built on `lightdni-jssas-toggle`: the effect is a theme (class on `<html>` +
CSS variables) plus an injected stylesheet, added and removed at runtime.

```ts
import { createPageSlide } from "@page-slide";
const slide = createPageSlide({ target: ".page > .window" });
slide.enable(); // apply theme
slide.disable(); // remove theme, variables and stylesheet
slide.navigate(fromPath, toPath, menuOrder); // set direction before paint
```

- `src/direction.ts` – pure direction logic (no DOM)
- `src/style.ts` – stylesheet and injection
- `src/pageSlide.ts` – controller using lightdni-jssas-toggle
- `src/react.ts` – optional `usePageSlide` hook; the core has no React dependency
