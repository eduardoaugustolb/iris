# Íris — Editor, sub-fase 1: moldura e barra de menu — design

Este documento é a spec da primeira sub-fase do Editor no plano de fundação do Íris. O Editor (`VideoEditor.tsx` e afins, ~14.700 linhas em ~24 componentes) é a maior superfície do app ainda inteiramente em Tailwind cru, sem o design system estabelecido nas Fases 0-2 e já aplicado ao HUD na Fase 3 (`docs/superpowers/plans/2026-07-30-iris-hud-fase3.md`). É grande demais para uma spec/plano único — cada sub-fase segue seu próprio ciclo brainstorm → spec → plano.

## Escopo desta sub-fase

**Dentro do escopo:**
- `src/components/video-editor/EditorMenuBar.tsx` (198 linhas) — barra File/Edit/View do editor.
- `src/components/video-editor/EditorEmptyState.tsx` (209 linhas) — tela de "nenhum vídeo carregado", incluindo o overlay de drag-over e o diálogo de erro de drop que já vivem nesse arquivo.
- `src/components/ui/dialog.tsx` — primitivo Radix compartilhado por **todo** diálogo do app (não só os desta sub-fase). Migração deliberadamente ampliada: corrigir aqui evita reescrever a mesma correção em cada sub-fase futura do editor.
- `src/components/ui/dropdown-menu.tsx` — primitivo Radix compartilhado por todo menu-dropdown do app, mesma lógica.

**Fora do escopo (sub-fases futuras):**
- Qualquer outro componente do editor (timeline, painéis laterais, players, outros diálogos como `ExportDialog`/`ShortcutsConfigDialog`/`UnsavedChangesDialog`/`AddCustomFontDialog` — esses herdam a correção do `dialog.tsx` automaticamente, mas seu conteúdo interno não é tocado agora).
- Qualquer outro primitivo de `src/components/ui/` além de `dialog.tsx`/`dropdown-menu.tsx`.

## Arquitetura

- **`dialog.tsx`**: `DialogContent` para de aplicar `bg-background`/`border`/`shadow-lg` cru e passa a envolver seu conteúdo em `Glass level={3}` (elevação de modal — maior que o `level={2}` usado em popovers/menus, seguindo DESIGN.md §5). Como `Glass` não aceita `style`, a `DialogPrimitive.Content` (que já controla position/transform/animação via Radix) vira o wrapper posicionado, e `Glass` preenche por dentro — mesmo padrão já validado no menu de idioma do HUD (Fase 3, `HudSidebar.tsx`). O `X` do botão de fechar embutido (hoje `lucide-react`) vira `@phosphor-icons/react` (`XIcon`).
- **`dropdown-menu.tsx`**: `DropdownMenuContent` ganha `Glass level={2}`, mesmo princípio. `Check`/`ChevronRight`/`Circle` (lucide) viram Phosphor (`CheckIcon`/`CaretRightIcon`/`CircleIcon`).
- **`EditorMenuBar.tsx`**: remove o `className` que hoje reimplementa material cru em `DropdownMenuContent` (`bg-[#09090b]/95 backdrop-blur-md border border-white/[0.08]`), já que o primitivo passa a trazer isso de fábrica. Cores de texto migram para tokens (`color.textPrimary`/`color.textSecondary` conforme a tabela de mapeamento já usada na Fase 3: ≥0.7 opacidade → textPrimary, 0.45–0.69 → textSecondary, <0.45 → textTertiary). O item "Quit" (hoje vermelho) usa `color.semanticWarning` — decisão explícita desta spec: DESIGN.md reserva vermelho exclusivamente ao estado "gravando" (§3), então reutilizá-lo aqui violaria essa regra; "Sair" também não é uma ação destrutiva de dados (há confirmação de alterações não salvas em outro fluxo), então o laranja de aviso (já usado para "pausado" no HUD) é o tom certo.
- **`EditorEmptyState.tsx`**: `#34B27B` (verde herdado do OpenScreen, não existe na paleta do Íris) em botão primário e no overlay de drag-over vira `color.brandPrimary` (#5E5CE6). `Film`/`FolderOpen`/`Upload`/`X`/`AlertCircle` (lucide) viram Phosphor. O diálogo de erro de drop herda `Glass` automaticamente via `dialog.tsx`.

## Motion

Radix anima abertura/fechamento de `Dialog`/`DropdownMenu` via classes Tailwind (`animate-in`/`zoom-in-95`/`fade-in-0`, plugin `tailwindcss-animate`), não via `element.animate()`. Verificar durante a implementação se os valores de duração dessas classes (padrão do Tailwind/Radix, tipicamente 150-200ms via a variável `--tw-duration` do plugin) batem com os tokens do projeto (`duration.fast`/`standard`/`slow` = 150/280/420ms); se não baterem, ajustar para o token mais próximo, mesma exigência já aplicada a `HudDeviceSelectors`/`HudNotices` na Fase 3.

## Guardrail

`src/design/guardrails/noRogueGlass.test.ts` hoje pula todo `src/components/` via `LEGACY_ALLOWLIST`. Seguindo o padrão já usado para `components/hud` na Fase 3 (carve-out específico em vez de abrir todo `components/ui/`, que ainda tem outros primitivos não migrados), o guardrail passa a vasculhar especificamente `components/ui/dialog.tsx` e `components/ui/dropdown-menu.tsx`, deixando o resto de `components/ui/` e `components/video-editor/` (exceto os dois arquivos desta sub-fase) exemptos por enquanto.

## Testes

- RTL para `EditorMenuBar`: montagem dos três menus (File/Edit/View), atalhos formatados corretamente por plataforma (`formatShortcut`/`formatShiftShortcut`, já testados e não alterados), estados `disabled` de undo/redo, cor do item "Quit".
- RTL para `EditorEmptyState`: fluxo de importar vídeo, carregar projeto, overlay de drag-over, diálogo de erro de drop (formato não suportado vs. falha ao carregar) — casos que já devem ter cobertura implícita a validar/preservar.
- `dialog.tsx`/`dropdown-menu.tsx`: teste de que `Glass` é usado (nenhum `backdrop-filter` cru sobrevive) e que os ícones internos vêm de Phosphor.
- Guardrail atualizado conforme acima.

## Não-decisões explícitas

- Não tocar em nenhum outro diálogo/painel do editor nesta sub-fase — eles herdam a correção do primitivo automaticamente na aparência, mas seu conteúdo interno (novos tokens de espaçamento, ícones específicos, etc.) fica para quando cada um tiver sua própria sub-fase.
- Não introduzir nenhuma cor nova fora da paleta já definida em `color.ts`.
