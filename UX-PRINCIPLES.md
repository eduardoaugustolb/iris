# Íris — Fundamentação de UX

> Este documento complementa o `DESIGN.md`. Enquanto o `DESIGN.md` define os tokens visuais (cor, tipografia, espaçamento), este documento explica **por quê** cada decisão de UX foi tomada — com base na documentação técnica real do Liquid Glass da Apple e em leis de comportamento humano com lastro em pesquisa. Nenhuma decisão aqui é estética por capricho; cada uma tem uma fonte.

---

## Parte 1 — Fidelidade técnica ao Liquid Glass real

### O que o Liquid Glass é, tecnicamente

Liquid Glass não é um blur com transparência — é um material que dobra e concentra a luz em tempo real (lensing), diferente do blur tradicional que apenas espalha luz. Ele reage a movimento do dispositivo com destaques especulares dinâmicos, tem sombras adaptativas, e reage a toque com propriedades elásticas ("gel-like flexibility").

**Isso importa pro Íris:** se o app for construído com tecnologia web (Electron/Tauri/WebView, como é comum em forks de apps deste tipo), **não é possível reproduzir o material real** — só uma aproximação via `backdrop-filter: blur() saturate()`, que é exatamente o que a seção 5 do `DESIGN.md` especifica. É um teto de fidelidade honesto: a aproximação em CSS chega perto visualmente, mas não replica lensing físico nem a resposta elástica ao toque. Se em algum momento fizer sentido migrar partes da UI pra SwiftUI nativo (ex: o HUD flutuante), aí sim dá pra usar o material real via `glassEffect()`.

### Onde aplicar (regra não-negociável da Apple)

A própria documentação da Apple é explícita: Liquid Glass deve ficar reservado à camada de navegação que flutua sobre o conteúdo do app — nunca deve ser aplicado ao conteúdo em si.

Isso confirma uma regra que já estava implícita no `DESIGN.md`, mas agora com fonte oficial:
- **Aplicar vidro em**: toolbars, HUD de gravação, popovers, menus, sheets, botões flutuantes.
- **Nunca aplicar vidro em**: a lista de gravações, thumbnails, área de preview de vídeo, qualquer conteúdo que o usuário está consumindo.
- **Nunca empilhar vidro sobre vidro** — duas camadas translúcidas sobrepostas quebram a hierarquia visual e ficam confusas. Cada tela tem no máximo uma camada de vidro flutuando sobre conteúdo opaco.

### As três variantes oficiais e quando usar cada uma

| Variante | Transparência | Quando usar no Íris |
|---|---|---|
| Regular | Média, adapta a qualquer conteúdo | Padrão para toolbar, HUD, popovers — usar em 95% dos casos |
| Clear | Alta, exige camada de escurecimento por trás | Só para controles pequenos flutuando sobre o preview de vídeo (ex: botão de parar sobre uma gravação de tela colorida) |
| Identity | Nenhum efeito | Quando o usuário ativa "Reduzir transparência" no sistema — automático, nunca implementar manualmente |

### Os três pilares oficiais do HIG (iOS/macOS 26)

A Apple resume a filosofia do Liquid Glass em três princípios oficiais — vale usá-los como checklist antes de aprovar qualquer tela nova:

1. **Hierarquia** — controles elevam e se distinguem do conteúdo abaixo deles; o conteúdo é sempre o protagonista, nunca a UI.
2. **Harmonia** — formas de UI seguem a geometria do hardware (por isso a regra de `--radius-xl` na janela principal, ecoando o squircle do próprio macOS).
3. **Consistência** — o app adota convenções da plataforma em vez de inventar padrões próprios, o que reduz a carga cognitiva de aprender a usar o app.

Esses três pilares batem diretamente com o objetivo original do projeto ("uma UX que qualquer um saiba usar"): hierarquia e consistência são, na prática, os mesmos princípios que a pesquisa de usabilidade chama de "reconhecimento em vez de lembrança" e "lei de Jakob" (ver Parte 2).

### Acessibilidade: o sistema já resolve, não reimplementar

A Apple documenta que o material se adapta automaticamente a três configurações de acessibilidade do sistema, sem exigir código adicional: **Reduzir Transparência** (aumenta o efeito fosco), **Aumentar Contraste** (troca pra cores predominantemente pretas/brancas com borda de contraste) e **Reduzir Movimento** (desativa comportamento elástico e reduz intensidade de efeitos). A recomendação oficial explícita é: deixar o sistema cuidar disso automaticamente, e não sobrepor esse comportamento manualmente.

Como o Íris está aproximando o material via CSS (não usando o framework nativo), isso vira responsabilidade nossa de implementar manualmente — é por isso que a seção 11 do `DESIGN.md` já lista contraste mínimo 4.5:1 e suporte a `prefers-reduced-motion` como piso obrigatório, não opcional.

### Performance é parte do orçamento de design

Testes de bateria em iPhone 16 Pro Max mostraram salto de ~1% pra ~13% de consumo de bateria comparando iOS 18 e iOS 26 durante uso do material Liquid Glass nativo — o custo de renderização em tempo real é real, não hipotético (número de teste de beta, vale tratar como ordem de grandeza, não valor exato). Isso reforça uma regra que o `DESIGN.md` já tinha (seção 8, "todo o resto do motion é utilitário e discreto"): a única animação elaborada do produto inteiro é o botão de gravar. Todo resto é fade/scale barato de renderizar — inclusive porque o Íris pretende ser **mais leve** que o original, não mais pesado.

---

## Parte 2 — Vieses e leis de comportamento humano aplicadas ao Íris

Cada lei abaixo tem pesquisa por trás e uma decisão concreta de design que ela justifica no produto.

### Lei de Fitts (Paul Fitts, 1954)
**O que diz:** o tempo pra atingir um alvo é função da distância até ele e do seu tamanho — alvos maiores e mais próximos são mais rápidos de acertar, o que é especialmente relevante em telas de toque.
**Aplicação no Íris:** o botão de parar gravação no HUD nunca pode ser pequeno nem estar num canto distante — é por isso que o `DESIGN.md` especifica área mínima de clique 32×32px pra qualquer controle (seção 11) e posiciona o HUD ancorado no topo central da tela (seção 6), o ponto mais previsível e rápido de alcançar com o mouse vindo de qualquer direção.

### Lei de Hick (William Edmund Hick)
**O que diz:** quanto mais opções (e mais complexas) são apresentadas de uma vez, mais tempo o usuário leva pra decidir.
**Aplicação no Íris:** a tela principal de gravação mostra só 2-3 escolhas (janela, tela inteira, área) — todo o resto (zoom automático, cursor, webcam) fica atrás de um painel de configurações separado, carregado por demanda. É a justificativa formal pra "progressive disclosure" (ver Parte 3).

### Lei de Miller (George Miller, "Magical Number Seven")
**O que diz:** a memória de trabalho humana comporta cerca de 7 itens (±2) por vez.
**Aplicação no Íris:** nenhuma seção do painel de configurações deve ter mais de ~7 controles visíveis simultaneamente sem agrupamento — acima disso, agrupar em subseções com título, não apenas empilhar itens.

### Lei de Jakob (Jakob Nielsen)
**O que diz:** usuários passam a maior parte do tempo em outros produtos, então preferem que o seu funcione do jeito que os outros já funcionam.
**Aplicação no Íris:** é a justificativa direta pra seguir convenções do macOS ao pé da letra (menu bar app, atalhos padrão do sistema, `Cmd+,` pra configurações) em vez de inventar uma navegação própria — o pilar "Consistência" do HIG (Parte 1) é essa mesma lei aplicada pela própria Apple.

### Efeito Estética-Usabilidade (Aesthetic-Usability Effect)
**O que diz:** pessoas percebem designs esteticamente agradáveis como mais fáceis de usar, mesmo quando a usabilidade real não mudou — mostrado classicamente pela preferência por caixas eletrônicos mais bonitos mesmo com fluxo de tarefas idêntico (Kurosu & Kashimura, 1995).
**Aplicação no Íris:** justifica o investimento inteiro na identidade visual premium — mas com uma ressalva importante: **esse efeito não substitui usabilidade real**. Um app bonito com fluxo confuso ainda frustra depois dos primeiros segundos. O `DESIGN.md` existe justamente pra garantir que o polimento visual não seja a única coisa carregando a experiência.

### Doherty Threshold (Doherty & Thadani, IBM, 1982)
**O que diz:** produtividade e engajamento sobem quando o sistema responde em menos de 400ms — acima disso, o usuário começa a se desconectar mentalmente da tarefa.
**Aplicação no Íris:** todas as durações de transição do `DESIGN.md` (seção 8: 150/280/420ms) ficam abaixo ou próximas desse limiar — inclusive a mais longa (HUD entrando/saindo de tela, 420ms) é uma exceção deliberada porque é um evento raro e cheio de significado (início/fim de gravação), não uma interação repetitiva onde o atraso seria sentido como lentidão.

### Reconhecimento em vez de lembrança (heurística #6 de Nielsen)
**O que diz:** reconhecer algo visível na tela exige muito menos esforço cognitivo do que lembrar de algo de memória — é mais fácil confirmar que Lisboa é a capital de Portugal do que responder de memória qual é a capital.
**Aplicação no Íris:** o ícone da menu bar muda de estado visualmente (parado vs. gravando) em vez de exigir que o usuário lembre se apertou o botão certo; o HUD mostra o timer e os controles disponíveis o tempo todo — nada precisa ser memorizado ou descoberto por tentativa.

### Visibilidade do status do sistema (heurística #1 de Nielsen)
**O que diz:** o sistema deve manter o usuário informado sobre o que está acontecendo, com feedback em tempo razoável.
**Aplicação no Íris:** é a razão de existir do ponto pulsante vermelho no HUD (seção 9 do `DESIGN.md`) — comunica "está gravando agora" sem exigir nenhuma leitura de texto.

### Regra do Pico-Fim (Peak-End Rule — Kahneman)
**O que diz:** pessoas julgam uma experiência principalmente pelo pico emocional dela e por como ela termina, não pela média de cada momento.
**Aplicação no Íris:** o momento em que a gravação termina e o arquivo é salvo é desproporcionalmente importante pra como a pessoa vai lembrar do app inteiro — por isso vale garantir que a confirmação ("Salvo em Vídeos", seção 10 do `DESIGN.md`) seja instantânea, clara, e sem fricção nenhuma. É o "fim" que fica na memória, não o meio da gravação.

### Controle e liberdade do usuário (heurística #3 de Nielsen)
**O que diz:** usuários precisam de uma "saída de emergência" clara pra qualquer ação, sem precisar passar por um diálogo longo.
**Aplicação no Íris:** pausar e parar a gravação sempre visíveis e acessíveis em 1 clique no HUD — nunca escondidos num menu secundário, porque é justamente numa gravação em andamento que o usuário mais precisa de controle imediato.

---

## Parte 3 — Configurabilidade organizada

Juntando a Lei de Hick (menos opções visíveis de uma vez) com a heurística de "flexibilidade e eficiência de uso" de Nielsen (a interface deve servir tanto o iniciante quanto o usuário avançado), a estrutura de configurações do Íris segue **divulgação progressiva**:

1. **Nível 1 — Essencial, sempre visível:** fonte de gravação, microfone, salvar em.
2. **Nível 2 — Um clique de distância:** zoom automático, cursor, webcam, captions — agrupados em abas ou seções dentro de "Configurações", cada uma com no máximo ~7 controles (Lei de Miller).
3. **Nível 3 — Avançado, atrás de um disclosure explícito ("Mostrar opções avançadas"):** atalhos de teclado customizados, exportação com parâmetros técnicos (bitrate, codec) — fica escondido por padrão porque a maioria nunca vai mexer nisso, mas fica lá pra quem precisa (é exatamente o caso de uso que a heurística de flexibilidade/eficiência descreve).

Cada nível usa os mesmos rótulos e ícones em todo o app (heurística de consistência) e cada configuração é identificada por reconhecimento visual — ícone + label lado a lado — nunca por um código ou abreviação que o usuário precisaria decorar.

---

## Parte 4 — Fluidez: orçamento de tempo de resposta e transições

Fluidez não é uma sensação vaga — a Apple documenta números concretos, e existe pesquisa de HCI por trás de cada um. Três limiares, do mais rápido ao mais lento:

| Limiar | Tempo | O que significa | Onde se aplica no Íris |
|---|---|---|---|
| Feedback instantâneo | até 100ms | Abaixo disso, a ação parece causar o efeito diretamente — a percepção humana não separa causa e efeito | Estado de "pressed" de qualquer botão, hover, toggle — tem que disparar no frame seguinte ao clique, nunca esperar uma resposta de rede ou disco |
| Doherty Threshold | até 400ms | Acima disso, o usuário começa a se desconectar mentalmente da tarefa e a produtividade cai (ver `UX-PRINCIPLES.md` Parte 2) | Abrir o painel de configurações, iniciar/parar gravação — toda ação que o usuário dispara e espera uma confirmação |
| Transições do sistema | 250–400ms | Faixa em que a própria Apple documenta que as animações do sistema operam — mais rápido que isso e a mudança passa despercebida; mais devagar e parece lento | Abertura de popover, morphing do HUD, transição entre telas do app |

**Regra de ouro documentada pela Apple: motion existe pra comunicar, não pra decorar** — e evitar adicionar animação a interações que já acontecem com frequência, porque o próprio sistema operacional já entrega uma animação sutil padrão pra essas. Ou seja: nem tudo precisa de uma transição autoral; reaproveitar o comportamento nativo do SO em interações repetitivas (scroll, foco de campo, hover) é a escolha certa — o esforço de design fica reservado pra momentos que realmente merecem (abrir/fechar o HUD de gravação, por exemplo).

### Como evitar "mudança de tela brusca" na prática

O motivo técnico de uma transição parecer "brusca" quase sempre é o mesmo: o elemento antigo desaparece e o novo aparece em posições/tamanhos diferentes, sem nenhum elemento visual compartilhado entre os dois estados — o olho perde o rastro do que estava olhando. A solução documentada pela Apple pro Liquid Glass real é a **transição de zoom com origem compartilhada** (`matchedTransitionSource` + `navigationTransition(.zoom)`): quando um sheet/popover abre, ele literalmente nasce do botão que foi clicado, cresce até o tamanho final, e o caminho inverso acontece ao fechar — nunca um corte seco de uma tela pra outra.

Como o Íris está aproximando o material via web, a tradução prática dessa regra é:
- **Nunca troca de estado por corte** — todo popover/painel nasce visualmente do elemento que o abriu (crossfade + scale a partir da posição/tamanho do gatilho), nunca aparece "do nada" no centro da tela.
- **Curvas sempre com leve inércia**, nunca lineares — os tokens `--ease-standard` e `--ease-spring` do `DESIGN.md` (seção 8) já seguem essa lógica; a faixa de damping recomendada pela própria Apple pra spring animations fica entre 0.7 e 1.0, o que bate com o "assentamento" sem oscilação exagerada que o `--ease-spring` já busca.
- **Elementos relacionados que mudam juntos (ex: HUD expandindo pra mostrar mais controles) fazem isso como um só movimento contínuo**, não como um elemento sumindo e outro aparecendo em sequência — é o equivalente visual ao que a Apple chama de "morphing" entre estados de vidro.

---

## Parte 5 — Ícones: usar uma biblioteca única de verdade, não reinventar

A exigência de ícones consistentes tem uma resposta técnica direta: **não desenhar um sistema de ícones customizado pro app inteiro**. A escolha é **`@phosphor-icons/react`** com deep import `dist/csr/<Nome>` — não SF Symbols, que é exclusivo de Apple e quebraria em Windows/Linux:

- Cada ícone Phosphor existe na mesma família de pesos (thin→fill) e escala da fonte embarcada Iris Sans, então um ícone ao lado de um texto sempre parece desenhado pela mesma mão, sem trabalho manual de alinhamento.
- É uma biblioteca cross-platform embarcada (nenhum recurso do sistema), então o rodapé visual é idêntico em macOS, Windows e Linux — o mesmo motivo pelo qual a tipografia é embarcada (Parte 1).
- Deep import `dist/csr/<Nome>` mantém o tree-shaking no bundle: só os ícones usados entram no build.

**Aplicação prática no Íris:**
- **Todo ícone funcional da interface** (toolbar, menu de configurações, botões do HUD — pausar, parar, configurações, microfone, câmera, etc.) vem de `@phosphor-icons/react` com deep import `dist/csr/<Nome>`, renderizado como `<Nome>Icon` com `weight="regular"`. Nada de redesenhar um "ícone de pausa" do zero, nem importar de `lucide-react`/`react-icons` (banidos no `dependencyGuard`).
- **A única peça de iconografia autoral do produto é a própria marca Íris** (o símbolo de íris/lente da seção 7 do `DESIGN.md`) — porque é isso que carrega identidade de marca. Todo o resto da UI é funcional, não precisa (e não deve) ter assinatura visual própria.
- **Se um dia for necessário um símbolo customizado** que a biblioteca não cobre, ele precisa seguir as mesmas regras dos ícones Phosphor: mesmo nível de detalhe, peso óptico e alinhamento à grade — nunca "quase parecido".

## Referências

- Apple Developer — [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- Apple Developer — [WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- Create with Swift — [Liquid Glass: Hierarchy, Harmony and Consistency](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/)
- conorluddy/LiquidGlassReference — [Referência técnica completa iOS 26](https://github.com/conorluddy/LiquidGlassReference)
- Nielsen Norman Group — [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Nielsen Norman Group — [Recognition vs. Recall](https://www.nngroup.com/videos/recognition-vs-recall/)
- Laws of UX — leis de Fitts, Hick, Jakob, Miller — [uxdesigninstitute.com/blog/laws-of-ux](https://www.uxdesigninstitute.com/blog/laws-of-ux/)
- Doherty & Thadani (IBM, 1982) via LogRocket — [Doherty Threshold](https://blog.logrocket.com/ux-design/designing-instant-feedback-doherty-threshold/)
- Apple Developer — [Motion — Foundations, Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/foundations/motion)
