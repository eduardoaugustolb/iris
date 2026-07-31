# Íris — Plano de migração do rebranding: Fases 4–7

> Este documento é o plano de migração que leva o restante do app para o sistema de design de
> `DESIGN.md` e `UX-PRINCIPLES.md`, seguindo o roadmap estabelecido em
> `docs/superpowers/specs/2026-07-29-iris-leve-design.md`. As Fases 0–3 e o Editor sub-fase 1 já
> estão fechados (PR #1 `refactor/hud-phosphor-icons`, PR #2 `refactor/editor-shell-glass`).

## 1. Contexto — o que o histórico mostra

| Fase | Escopo (spec `2026-07-29`) | Status em `fork/main` |
|---|---|---|
| 0 | Baseline e instrumentação (budgets, CLIs `bench:*`, `dependencyGuard`) | ✅ mergeado |
| 1 | Poda de dependências e config Electron | ✅ `gsap`/`motion`/`emoji-picker-react`/`mp4box` fora; `dependencyGuard` os bane |
| 2 | Camada de design (`src/design/tokens`, `Glass`, motion, guardrails) | ✅ mergeado |
| 3 | HUD sobre `Glass` + Phosphor, animação-diafragma | ✅ mergeado (PR #1) |
| 4 | Launch, source selector, countdown, notes | ⬜ **não iniciada** |
| 5 | Editor (Pilar C + reconstrução visual) | 🔶 sub-fase 1 (menubar, empty state, `dialog.tsx`, `dropdown-menu.tsx`) fechada (PR #2) |
| 6 | Timeline | ⬜ **não iniciada** |
| 7 | Endurecimento (budgets apertados, emenda de docs) | ⬜ **não iniciada** |

### Inventário do que ainda é legado (levantado em 2026-07-31)

**Cores banidas do OpenScreen ainda em uso:** `#34B27B` (verde da marca antiga) em
`src/components/ui/switch.tsx`, `slider.tsx`, `color-picker.tsx`, `gradient-editor.tsx`,
`item-content.tsx`, `src/components/launch/SourceSelector.tsx` (+ `.module.css`),
`src/components/video-editor/CropControl.tsx`, `timeline/ItemGlass.module.css`, `src/index.css` (290,
312) e no fallback de loading em `src/App.tsx:76`. `#09090b` em `App.tsx:74` e `ui/sonner.tsx`.

**Superfícies com material plano (shadcn `bg-background`/`bg-popover`/`border`/`shadow-*`):**

- `src/index.css` — o tema `hsl(var(--...))` do shadcn ainda é a base das telas não migradas.
- `src/components/ui/` — 17 primitivos ainda legados (lista na Fase 5).
- `src/components/launch/` — `SourceSelector`, `NotesToolbar`, `NotesWindow`, `CountdownOverlay` e o
  que sobra do `LaunchWindow.module.css` (tints brancos fora da primitiva `Glass`).
- `src/components/video-editor/` — `VideoEditor` (3353 linhas), `VideoPlayback` (2333),
  `SettingsPanel` (2221), `TimelineEditor` (1873), `TimelineWrapper` (545), diálogos
  (`ExportDialog`, `ShortcutsConfigDialog`, `UnsavedChangesDialog`, `AddCustomFontDialog` — herdam o
  shell de `Glass` do `dialog.tsx` mas o conteúdo interno é cru), painéis (`AnnotationSettingsPanel`,
  `AnnotationOverlay`, `CropControl`, `BlurSettingsPanel`, `PlaybackControls`, `GifOptionsPanel`,
  `FormatSelector`, `TutorialHelp`, `KeyboardShortcutsHelp`) e a timeline
  (`Item`/`Row`/`Subrow`/`BackgroundWaveform`/`KeyframeMarkers`).

**Vazamentos de material (guardrail `noRogueGlass` ainda não cobre):** `timeline/ItemGlass.module.css`
aplica `backdrop-filter` cru (`.glassRed`) — o guardrail só varre `design/`, `components/hud/` e os
dois primitivos migrados de `components/ui/` (`LEGACY_ALLOWLIST` de `noRogueGlass.test.ts`).

**Dependências de ícone a eliminar:** `lucide-react` em 17 arquivos e `react-icons` em
`SourceSelector.tsx` (`MdCheck`). A regra do produto (DESIGN.md §7 / UX-PRINCIPLES.md Parte 5) é
`@phosphor-icons/react` com deep import `dist/csr/<Name>`.

**Fontes/tipografia:** `DESIGN.md` §4 é macOS-only; a spec `2026-07-29` emendou isso para a Fase 7
(é o único valor dos docs que muda). Não há guardrail ainda para peso >700 nem contraste fora de
`src/design/` (os testes `noBannedFonts`/`spacingScale` só varrem `src/design/`).

**App shell:** `src/App.tsx` tem fallback de loading do editor com o spinner verde legado e a janela
`default` é um `<h1>Íris</h1>` vazio (placeholder nunca estilizado).

## 2. Restrições globais (herdadas dos planos 0–3)

- `Glass` (`src/design/glass/Glass.tsx`) é o único lugar autorizado a construir
  `backdrop-filter`; não aceita `style`. Posicionamento dinâmico vive num wrapper plano, nunca em
  `Glass`.
- Elevação: `level={2}` para superfícies ancoradas junto a painel persistente; `level={3}` para
  overlays portalizados (diálogos, menus) sem contexto de âncora.
- Cores só vêm de `src/design/tokens/color.ts` (ex.: `color.brandPrimary = "#5E5CE6"`,
  `color.brandPrimaryHover = "#8886F0"`, `color.semanticWarning = "#FF9F0A"`). Onde uma classe
  Tailwind estática precisar de token, usar bracket com o literal: `text-[#FF9F0A]`. Nunca um valor
  aproximado. `#34B27B` (e qualquer verde herdado) é banido.
- Durações/easings só de `src/design/tokens/motion.ts` (`fast/standard/slow` = 150/280/420ms;
  `--ease-standard`/`--ease-spring`). Classes Radix `animate-in/out` precisam de duração explícita.
- Ícones: `@phosphor-icons/react` com deep import `dist/csr/<Name>`; zero `lucide-react` e zero
  `react-icons` em arquivo tocado.
- `prefers-reduced-motion` respeitado em toda animação; `--semantic-recording` (vermelho) exclusivo
  de "gravando"; Íris Violeta no máximo 1–2 elementos por tela e nunca em área grande.
- Vidro nunca em conteúdo (lista de gravações, thumbs, preview, timeline) — DESIGN.md + UX-PRINCIPLES
  Parte 1. Timeline item com `backdrop-filter` é, além de violação, custo de render: **remover**, não
  embrulhar em `Glass`.
- Teste para cada comportamento novo no mesmo pacote; guardrail atualizado na mesma PR; cada fase
  termina com `npm run test`, `npx tsc --noEmit`, `npm run lint`, budgets verdes e mergeável sozinha.

## 3. Fase 4 — Launch, source selector, countdown, notes

**Meta:** todas as superfícies fora do editor sobre a camada de design; eliminar o verde legado do
fluxo de escolha de fonte.

- [ ] **Task 4.1** — Migrar `SourceSelector.tsx` + `SourceSelector.module.css`: `#34B27B` →
  `color.brandPrimary`/`hover`, `MdCheck` → `CheckIcon` (Phosphor deep import), áreas de janela em
  `--surface-base`, cards de fonte em `Glass level={2}` (janela não portalizada, ancorada ao app) ou
  `level={3}` se virar overlay — seguir o precedente do HUD. `react-icons` some do repo.
- [ ] **Task 4.2** — Migrar `NotesToolbar.tsx` (`lucide-react` → Phosphor) e `NotesWindow.tsx` +
  `NotesWindow.module.css` para tokens/`Glass`.
- [ ] **Task 4.3** — `CountdownOverlay.tsx` para tokens (timer em Caption Numérica, `--surface-base`
  translúcido só se necessário — é conteúdo de gravação, então preferir opaco).
- [ ] **Task 4.4** — `LaunchWindow.module.css`: mover o que resta de material cru para `Glass`/tokens;
  manter só o que é Electron-only (`-webkit-app-region`, scrollbars custom em linguagens).
- [ ] **Task 4.5** — Guardrail: estender a varredura de `noRogueGlass.test.ts` para
  `components/launch` (padrão dos carve-outs de `components/hud`), com teste da mudança.

## 4. Fase 5 — Editor (sub-fases 2–5)

Pré-requisito: os primitivos `components/ui` que o editor usa em massa estão migrados primeiro
(mesma lógica de ampliar `dialog.tsx` na sub-fase 1 — corrigir aqui corrige todos os consumidores).
Mapa de uso medido: `button` (9), `dialog` (6), `select` (4), `slider` (3), `tooltip`/`tabs`/`switch`/
`label` (2 cada), `popover`/`input`/`accordion`/`toggle-group` (1 cada).

- [ ] **Task 5.1 (sub-fase 2) — Primitivos `components/ui`:** `button`, `switch`, `slider`, `select`,
  `popover`, `tabs`, `tooltip`, `accordion`, `input`, `label`, `toggle-group`, `toggle`, `card`,
  `sonner`. Cada um: material → `Glass` quando for superfície flutuante (popover, select-content,
  accordion, sonner toast) ou tokens puros quando for controle inline (switch/slider/button usam
  `--brand-primary` no estado ativo, não `#34B27B`); ícones lucide → Phosphor; extender guardrail a
  cada arquivo migrado (a lista `MIGRATED_UI_PRIMITIVES` de `noRogueGlass.test.ts`). O `switch` segue
  a spec do toggle de DESIGN.md §9 (trilho 40×24, thumb branco, `--ease-spring`).
- [ ] **Task 5.2 (sub-fase 3) — Diálogos:** conteúdo interno de `ExportDialog`, `ShortcutsConfigDialog`,
  `UnsavedChangesDialog`, `AddCustomFontDialog` em tokens/Phosphor/escala base-4 (o shell de `Glass`
  já vem do `dialog.tsx`). Botões via `button.tsx` migrado. Copiar o checklist de DESIGN.md §12 por
  diálogo.
- [ ] **Task 5.3 (sub-fase 4) — Painéis de configuração:** `SettingsPanel` (2221 linhas),
  `AnnotationSettingsPanel`, `BlurSettingsPanel`, `GifOptionsPanel`, `CropControl`, `FormatSelector`,
  `PlaybackControls`, `TutorialHelp`, `KeyboardShortcutsHelp`. Grupos com ≤ ~7 controles visíveis
  (Lei de Miller, UX-PRINCIPLES Parte 3), seções com título, divulgação progressiva para opções
  avançadas. Material: painéis laterais sólidos em `--surface-raised`, popovers/tooltips em `Glass`
  `level={3}`.
- [ ] **Task 5.4 (sub-fase 5) — Casca e playback:** `VideoEditor.tsx` (3353) e `VideoPlayback.tsx`
  (2333). Shell em `--surface-base`; toolbar em `Glass level={2}`; barra de progresso em
  `--brand-primary` pontual. Verde legado banido do fallback de loading em `App.tsx` (trocar por
  diafragma Phosphor `Aperture` + tokens). Sem vidro no preview (é conteúdo).
- [ ] **Task 5.5** — Guardrail: zerar a exemption de `components/video-editor` em
  `noRogueGlass.test.ts` ao fim da sub-fase 5; mover os carve-outs restantes de `components/ui` para
  a lista migrada completa.

## 5. Fase 6 — Timeline

**Meta:** última superfície, conteúdo opaco (nunca vidro).

- [ ] **Task 6.1** — `TimelineEditor.tsx` (1873), `TimelineWrapper.tsx` (545) em tokens/escala base-4;
  trilho da linha do tempo em `--surface-raised`, cores de seleção neutras/acento pontual.
- [ ] **Task 6.2** — `Item.tsx` + `ItemGlass.module.css`: **remover** o `backdrop-filter` do `.glassRed`
  (viola guardrail e custa render) e o verde legado do `.glassGreen` (remap para tokens). Item de
  timeline é conteúdo → opaco, com borda especular sutil em vez de material translúcido.
- [ ] **Task 6.3** — `Row`/`Subrow`/`BackgroundWaveform`/`KeyframeMarkers` em tokens.
- [ ] **Task 6.4** — Guardrail: `noRogueGlass` passa a varrer `components/video-editor/timeline`
  integralmente.

## 6. Fase 7 — Endurecimento

- [ ] **Task 7.1** — Remover `lucide-react` e `react-icons` de `package.json` (últimos arquivos já
  migrados nas fases 4–6) e adicioná-los a `BANNED_DEPENDENCIES` (`src/lib/perf/dependencyGuard.ts`).
  Re-medir bundle (`npm run bench:*` / budgets) e confirmar ganho registrado.
- [ ] **Task 7.2** — Guardrails novos: banir cores legadas (`#34B27B`, `#09090b`) fora de
  `src/design/tokens/color.ts`; estender `noBannedFonts`/`spacingScale` (hoje só varrem
  `src/design/`) para `src/components`; checar peso >700 e contraste ≥4.5:1 na UI migrada (os
  utilitários `contrast.ts` já existem).
- [ ] **Task 7.3** — `src/index.css`: remover o tema `hsl(var(--...))` do shadcn quando o último
  consumidor legado migrar; `body` passa a `--surface-base` + `--text-primary`; reconciliar com
  `tokens.generated.css` (fonte única em `scripts/generate-design-css.ts`).
- [ ] **Task 7.4** — `src/App.tsx`: estilizar a janela `default` (hoje `<h1>Íris</h1>` vazio) e o
  fallback de loading do editor nos tokens; remover último `#09090b`/verde.
- [ ] **Task 7.5** — `sonner.tsx` (toasts) em tokens/Glass; conferir voz de DESIGN.md §10
  ("Salvo em Vídeos", sem "Oops!") nos textos existentes.
- [ ] **Task 7.6** — Docs: aplicar a emenda prevista em `2026-07-29` (DESIGN.md §4/§7,
  UX-PRINCIPLES.md Parte 5, README/ROADMAP/CLAUDE.md deixam de declarar macOS-only); re-apertar
  budgets nos números conquistados; checklist final de DESIGN.md §12 sobre cada tela.

## 7. Sequenciamento e dependências

```
Fase 4 ─┐
        ├─→ Fase 5 (5.1 primitivos → 5.2 diálogos → 5.3 painéis → 5.4 shell/playback) ─→ Fase 6 ─→ Fase 7
Fase 5.1 pode começar em paralelo à 4 (não compartilham arquivos), 4 e 5.1 só disputam os
guardrails — fazer os dois carve-outs na PR que tocar cada área.
```

Cada fase termina verde e mergeável sozinha; o app permanece utilizável em todas (regra da spec
`2026-07-29` § Fases).

## 8. Riscos

- **Fase 5 domina o cronograma** (~10k LOC). Mitigado pelas sub-fases 1–5 com PRs pequenas e pelos
  primitivos migrados primeiro (5.1 desbloqueia o resto).
- **Guardrail falso-positivo ao estender a varredura:** cada carve-out novo deve ter teste provando
  que pega o ofensor (padrão usado nas fases 3 e editor-1), e `LEGACY_ALLOWLIST` só encolhe.
- **Timeline com vidro é custo de render:** remoção do `backdrop-filter` do `.glassRed` é
  obrigatória na Fase 6, não opcional.
- **Vidro sobre conteúdo:** qualquer tentação de colocar `Glass` no preview/timeline viola a regra
  da Apple; revisar em código.
- **Budget de bundle:** a saída de `lucide-react` (17 arquivos) e `react-icons` só é segura porque
  cada PR migra os consumidores primeiro — nunca remover a dependência antes dos imports.

## 9. Definição de pronto (todas as fases)

- [ ] `npm run test` (Vitest) verde, incluindo guardrails.
- [ ] `npx tsc --noEmit` sem erros; `npm run lint` (Biome) limpo.
- [ ] `npm run bench:*` dentro dos orçamentos de `perf-budgets.json`.
- [ ] Zero `lucide-react`/`react-icons` nos arquivos da fase; zero hex legado (`#34B27B`, `#09090b`).
- [ ] Nenhuma superfície com `backdrop-filter` fora de `Glass`; checklist DESIGN.md §12 por tela.
- [ ] Smoke manual em macOS (o HUD/recording é native-fragile — ver AGENTS.md) antes de merge de fase
  que toque janelas/recording.
