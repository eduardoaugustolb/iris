# Íris — Sistema de Design

> Este documento é a fonte única de verdade visual do produto. Qualquer modelo (Claude Sonnet, Claude Opus) implementando UI para o Íris deve seguir estas especificações literalmente — valores numéricos, não aproximações. Onde houver dúvida de interpretação, o valor mais restritivo (mais sóbrio, mais "Apple") vence.

---

## 1. Posicionamento da marca

**O que é:** Íris é um gravador de tela para macOS, fork do OpenScreen — mais leve, mais estável, visualmente mais refinado e mais fluido que o original.

**Conceito central:** a íris do olho é a estrutura que controla quanto de luz entra e regula o foco — é literalmente o mecanismo biológico de "captura de imagem". O produto se chama Íris porque **captura o que está na tela**, da mesma forma que uma íris captura luz. O nome não descreve a tecnologia (não é "ScreenCast" ou "RecPro"); descreve a função através de uma metáfora concreta — exatamente como "Apple" não descreve computadores.

**Personalidade:** silenciosa, precisa, confiante. Nunca gritante. É a ferramenta que desaparece na mão de quem grava — o produto não compete com o conteúdo gravado por atenção.

**O que NÃO fazer:**
- Não usar a expressão "liquid glass" em nenhum copy visível ao usuário.
- Não usar ícones de câmera/filme genéricos (câmera de cinema, claquete, etc). O vocabulário visual vem do olho/óptica: abertura (aperture), diafragma, foco, lente — nunca de forma literal ou clichê. **Exceção deliberada:** o botão "abrir estúdio/editor" do HUD usa uma claquete — decisão consciente de 2026-07-30 porque as alternativas dentro do vocabulário óptico (lente, foco+seta) não comunicaram "editar" com clareza suficiente em teste real. Não usar claquete em nenhum outro lugar do produto.
- Não usar vermelho como cor de marca. Vermelho é reservado exclusivamente ao estado semântico "gravando" (ver seção 3).

---

## 2. Conceito visual (material)

A superfície da interface se comporta como uma lente física: translúcida, com profundidade real (não um `opacity` plano), refletindo levemente o que está atrás dela, com uma borda que capta luz como uma borda de vidro lapidado. Isso é obtido por camadas empilhadas, nunca por uma única camada com blur — ver seção 5.

Duas superfícies compõem todo o sistema:
- **Base opaca** — fundo do app, nunca translúcida.
- **Vidro** — painéis, toolbars, popovers, cards flutuantes. Sempre translúcida, sempre com as 3 camadas descritas na seção 5.

---

## 3. Paleta de cores

Todos os valores em hex ou rgba. Nomes dos tokens em português para facilitar comunicação com o time; nomes das CSS custom properties em inglês para o código.

| Token | Uso | Valor | CSS var |
|---|---|---|---|
| Grafite Profundo | Fundo base do app (modo padrão, é *dark by default*) | `#0A0A0C` | `--surface-base` |
| Grafite Elevado | Fundo de painéis não-vítreos (sidebars sólidas) | `#141416` | `--surface-raised` |
| Íris Violeta | Cor de marca — accent primário, estado ativo, foco de elementos interativos | `#5E5CE6` | `--brand-primary` |
| Íris Violeta Claro | Hover/estado de destaque sobre Íris Violeta | `#8886F0` | `--brand-primary-hover` |
| Vidro Especular | Highlight de borda superior em superfícies de vidro (branco puro, sempre em baixa opacidade) | `#FFFFFF` | `--specular` |
| Texto Primário | Texto de alta ênfase sobre fundo escuro | `#F5F5F7` | `--text-primary` |
| Texto Secundário | Texto de média ênfase, labels, captions | `rgba(245,245,247,0.62)` | `--text-secondary` |
| Texto Terciário | Placeholder, texto desabilitado | `rgba(245,245,247,0.34)` | `--text-tertiary` |
| Semântico — Gravando | Indicador de gravação ativa, ponto pulsante, botão de stop | `#FF453A` | `--semantic-recording` |
| Semântico — Sucesso | Confirmações (ex: "salvo em Vídeos") | `#32D74B` | `--semantic-success` |
| Semântico — Aviso | Alertas não-bloqueantes (ex: espaço em disco baixo) | `#FF9F0A` | `--semantic-warning` |

Regra fixa: **Íris Violeta nunca é usado em área grande** (nunca preenche um painel inteiro). É sempre um acento pontual — ícone ativo, borda de foco, botão primário, barra de progresso. A interface é majoritariamente neutra (grafite + vidro); a cor é usada com a mesma economia com que a Apple usa o azul do sistema.

Modo claro é suportado mas secundário — deriva automaticamente do modo escuro invertendo `--surface-base` para `#F5F5F7` e `--text-primary` para `#1D1D1F`, mantendo Íris Violeta idêntico (é a única cor que não se inverte).

---

## 4. Tipografia

Fonte do sistema Apple, sem fallback para fontes de terceiros — o app roda exclusivamente em macOS, então usar a stack nativa é a escolha correta (e é literalmente o que a Apple usa):

```css
--font-display: -apple-system, "SF Pro Display", system-ui, sans-serif;
--font-text: -apple-system, "SF Pro Text", system-ui, sans-serif;
--font-mono: "SF Mono", ui-monospace, monospace;
```

Escala tipográfica (usar exatamente estes 7 degraus, nenhum valor intermediário):

| Nome | Tamanho | Peso | Uso |
|---|---|---|---|
| Display | 34px / line-height 1.1 | 700 (Bold) | Tela de boas-vindas, títulos de onboarding apenas |
| Título 1 | 22px / 1.2 | 600 (Semibold) | Cabeçalho de janela principal |
| Título 2 | 17px / 1.3 | 600 (Semibold) | Cabeçalhos de seção dentro de painéis |
| Corpo | 13px / 1.4 | 400 (Regular) | Texto padrão de UI |
| Corpo Ênfase | 13px / 1.4 | 590 (Medium) | Labels de controles, itens de menu ativos |
| Caption | 11px / 1.3 | 400 (Regular) | Timestamps, metadados, texto auxiliar |
| Caption Numérica | 11px / 1.3, `font-variant-numeric: tabular-nums` | 500 (Medium) | Contador de tempo de gravação, tamanho de arquivo |

Regra: nunca usar peso 800/900 (Black/Heavy) em nenhum lugar — é o erro mais comum que faz uma UI "Apple-style" parecer falsa. O peso máximo do sistema é 700, e só na tela Display.

---

## 5. Material de vidro (especificação técnica)

Toda superfície "vidro" (toolbars, popovers, painel de configurações, HUD de gravação flutuante) é construída com exatamente 3 camadas empilhadas, nesta ordem, nunca menos:

**Camada 1 — Blur de fundo:**
```css
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
```
`saturate(180%)` é obrigatório — é o que faz o conteúdo atrás do vidro parecer vívido em vez de lavado. Sem saturação extra, o efeito lê como "cinza translúcido genérico" em vez de vidro Apple.

**Camada 2 — Tinta de superfície:**
```css
background: rgba(255, 255, 255, 0.08); /* modo escuro */
```
Nunca branco puro, nunca preto puro. É sempre uma tinta branca em opacidade muito baixa (0.06–0.12, nunca fora dessa faixa) sobre o blur.

**Camada 3 — Borda especular:**
```css
border: 0.5px solid rgba(255, 255, 255, 0.14);
border-top: 0.5px solid rgba(255, 255, 255, 0.24); /* borda superior mais clara — simula luz vindo de cima */
box-shadow:
  0 0 0 0.5px rgba(0, 0, 0, 0.3),   /* contorno de definição contra o fundo */
  0 12px 32px rgba(0, 0, 0, 0.28),  /* sombra de elevação */
  inset 0 1px 0 rgba(255, 255, 255, 0.08); /* brilho interno superior */
```
A borda superior sempre mais clara que as outras 3 bordas — é o detalhe que faz o material parecer ter espessura física, não é decoração opcional.

**Raio de canto:** escala fixa de 4 valores, sempre múltiplos entre si — nunca um valor arbitrário fora desta lista:
```css
--radius-sm: 8px;   /* botões pequenos, chips */
--radius-md: 14px;  /* botões padrão, campos de input */
--radius-lg: 20px;  /* cards, popovers */
--radius-xl: 28px;  /* janela principal, HUD flutuante */
```

**Elevação (z-depth):** 3 níveis, cada um aumenta simultaneamente blur do backdrop e blur da sombra — nunca um sem o outro:

| Nível | Uso | backdrop-filter blur | box-shadow blur |
|---|---|---|---|
| 1 | Elementos inline (chips, badges) | 12px | 8px |
| 2 | Toolbars, barras fixas | 24px | 32px |
| 3 | Popovers, HUD flutuante, modais | 40px | 48px |

---

## 6. Grid e espaçamento

Escala de espaçamento em base 4, usar exclusivamente estes valores (nunca `13px`, `17px` etc. para espaçamento):
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
```

Janela principal do app: largura mínima 720px, altura mínima 480px. HUD de gravação flutuante (barra que aparece durante a gravação): pílula horizontal fixa de altura 44px, largura auto, sempre `--radius-xl` com elevação nível 3, ancorada no topo central da tela — nunca em um canto.

---

## 7. Logo e ícone

**Regra geral de iconografia:** a marca Íris (símbolo de olho/lente, ver detalhamento abaixo) é a **única** peça de iconografia desenhada pelo produto. Todo ícone funcional da interface — toolbar, HUD, menu de configurações, qualquer botão com ícone — usa **SF Symbols reais da Apple**, não um ícone customizado equivalente. Motivo prático, não só estético: SF Symbols já vem com peso óptico casado à fonte do sistema, 3 escalas e 4 modos de renderização, e herda Dynamic Type e acessibilidade de graça — nenhum ícone desenhado à mão reproduz isso sem trabalho manual constante. Detalhamento completo dessa decisão está em `UX-PRINCIPLES.md`, Parte 5.

**Conceito de construção da marca:** um diafragma de abertura óptica (aperture) estilizado — as lâminas curvas que se abrem/fecham em uma lente de câmera real, não uma câmera inteira, só o padrão geométrico do diafragma. 6 lâminas em rotação simétrica, formando um vazio central hexagonal-arredondado (nunca um círculo perfeito — o hexágono arredondado é o que torna a forma reconhecível e não-genérica).

- Cor do ícone: gradiente sutil de `--brand-primary` (#5E5CE6) para `--brand-primary-hover` (#8886F0), 135deg, aplicado apenas nas lâminas — nunca no fundo do ícone.
- Fundo do ícone (app icon do macOS): segue o padrão de squircle nativo do macOS (o SO aplica a máscara automaticamente — não desenhar o squircle manualmente), preenchido com `--surface-raised` (#141416).
- Versão monocromática (menu bar icon, 16×16 e 20×20): apenas o contorno das lâminas em `--text-primary`, sem preenchimento, stroke de 1.2px.

**Uso proibido:** nunca desenhar o diafragma totalmente fechado (viraria um ponto sem forma) nem totalmente aberto (viraria um círculo genérico) — o ângulo de referência oficial é 35% aberto, é o ponto em que a forma hexagonal do vazio central é mais legível.

---

## 8. Motion

**Orçamento de resposta (não-negociável):** qualquer feedback de toque/clique (estado pressed, hover) dispara em até 100ms — abaixo disso a ação parece causar o efeito diretamente. Qualquer ação que o usuário espera confirmação (abrir painel, iniciar gravação) responde em até 400ms. Nenhuma transição de UI passa de 400ms, com a única exceção documentada na seção 8 abaixo (HUD entrando/saindo de tela). Fundamentação completa em `UX-PRINCIPLES.md`, Parte 4.

**Nunca corte seco entre estados.** Todo popover/painel nasce visualmente do elemento que o abriu (crossfade + scale a partir da posição/tamanho do gatilho, nunca aparecendo "do nada"), e elementos relacionados que mudam juntos se movem como um único gesto contínuo, não como um sumindo e outro aparecendo em sequência.

Duas curvas de easing, nunca uma terceira:
```css
--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);   /* entradas, transições de estado */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* elementos que "assentam" — toggles, HUD aparecendo */
```

Durações fixas:
```css
--duration-fast: 150ms;    /* hover, toggle de switch */
--duration-standard: 280ms; /* abertura de painel, popover */
--duration-slow: 420ms;     /* HUD de gravação entrando/saindo de tela */
```

**Elemento-assinatura (signature element):** o botão de iniciar gravação é o próprio diafragma do logo, animado — ao clicar, as 6 lâminas giram e fecham até o centro em `--duration-slow` com `--ease-spring`, revelando o ponto vermelho de "gravando" (`--semantic-recording`) exatamente onde o vazio central estava. É a única animação orquestrada e elaborada do produto; todo o resto do motion é utilitário e discreto (fade + micro-scale de 0.98→1, nunca bounce, nunca rotação, exceto neste botão).

`prefers-reduced-motion`: a animação do diafragma vira um crossfade simples de 150ms entre o ícone parado e o ponto vermelho, sem rotação.

---

## 9. Componentes principais

**Botão primário:** fundo `--brand-primary`, texto `--text-primary` peso 590, altura 32px, `--radius-md`, sem borda. Hover: `--brand-primary-hover`. Sem sombra própria (herda a elevação do painel onde está).

**Botão secundário:** fundo `rgba(255,255,255,0.06)`, texto `--text-primary`, mesma altura/raio do primário, borda `0.5px solid rgba(255,255,255,0.12)`. Hover: fundo sobe para `rgba(255,255,255,0.1)`.

**Toggle/Switch:** trilho 40×24px, `--radius-xl` (pill), off = `rgba(255,255,255,0.12)`, on = `--brand-primary`. Thumb branco puro `#FFFFFF` com sombra `0 1px 3px rgba(0,0,0,0.4)`. Transição `--duration-fast` com `--ease-spring`.

**HUD de gravação (elemento mais visível do produto):** pílula flutuante nível 3 (seção 5/6), contém da esquerda pra direita: ponto pulsante `--semantic-recording` (pulso de opacidade 1↔0.4 em loop de 1.2s), contador de tempo em Caption Numérica, botão de pausar (ícone, sem label), botão de parar (círculo sólido `--semantic-recording`). Nunca inclui texto além do timer — é reconhecível pela forma, não por rótulos.

**Menu de configurações:** popover nível 3, `--radius-lg`, largura fixa 320px, itens em lista com altura 36px cada, ícone monocromático `--text-secondary` à esquerda + label Corpo + controle (toggle/chevron) à direita.

---

## 10. Voz e copy

Direto, no controle, sem entusiasmo artificial. Nunca usar exclamação. Nunca "Oops!" em erros — o app não se desculpa, explica o que houve e o que fazer.

- Botão: "Iniciar gravação" (não "Gravar agora!" nem "Começar a capturar sua tela")
- Confirmação: "Salvo em Vídeos" (não "Sucesso! Seu vídeo foi salvo com sucesso")
- Erro: "Sem permissão para gravar a tela. Ative em Ajustes do Sistema → Privacidade." (afirma o fato, dá o caminho — nunca "Algo deu errado")
- Estado vazio (nenhuma gravação ainda): "Suas gravações aparecem aqui." (convite neutro, não vendedor)

---

## 11. Acessibilidade — piso mínimo obrigatório

- Contraste texto/fundo mínimo 4.5:1 para Corpo e abaixo; 3:1 para Título 1/2 (já satisfeito pelos tokens acima — não escurecer `--text-secondary` além do especificado).
- Todo elemento focável tem anel de foco visível: `box-shadow: 0 0 0 2px var(--brand-primary)`, nunca `outline: none` sem substituto.
- `prefers-reduced-motion` respeitado em 100% das animações (ver seção 8).
- Área mínima de toque/clique: 32×32px para qualquer controle, mesmo que o ícone visual seja menor (usar padding invisível para completar a área).

---

## 12. Checklist de aplicação

Antes de considerar qualquer tela pronta, confirmar:
- [ ] Nenhum texto na UI menciona "vidro", "liquid glass" ou termos técnicos do material.
- [ ] Íris Violeta aparece em no máximo 1–2 elementos por tela.
- [ ] Toda superfície vítrea tem as 3 camadas da seção 5, nenhuma "atalho" com `opacity` simples.
- [ ] Nenhum peso de fonte acima de 700 foi usado.
- [ ] Todos os valores de espaçamento pertencem à escala da seção 6.
- [ ] O botão de gravar usa a animação-assinatura da seção 8, e nenhum outro elemento reutiliza essa mesma animação.
