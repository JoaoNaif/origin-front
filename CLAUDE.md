# CLAUDE.md

Front-end do **Origin** (jogo de estratégia por turnos com esquadrão). O backend é o projeto irmão
[`../origin-game`](../origin-game) (NestJS): **sempre ler o backend antes de mexer no front**, em especial:

- [`../origin-game/CLAUDE.md`](../origin-game/CLAUDE.md): contexto geral do jogo.
- [`../origin-game/docs/api.md`](../origin-game/docs/api.md): contrato HTTP que o front consome (fonte da verdade das rotas).
- [`../origin-game/docs/game_design.md`](../origin-game/docs/game_design.md): regras do jogo. O servidor é a autoridade
  do combate; o front só envia a jogada e exibe o resultado. Não reimplementar regra de combate no cliente.

## Stack

- Vite + React 19 + TypeScript (strict), Tailwind CSS v4 (plugin `@tailwindcss/vite`, sem `tailwind.config`).
- Axios (`src/lib/api.ts`), TanStack Query (`src/lib/query-client.ts`), React Router (`src/routes/router.tsx`).
- Formulários: react-hook-form + zod + `@hookform/resolvers` (v5: a v6 tem conflito de peer com `effect`).
- Ícones: lucide-react. Carrossel: Embla (`src/components/ui/carousel.tsx`, sem estilo próprio).
- Lint: oxlint (`npm run lint`). Alias `@/` → `src/`.

## Visual

Tema escuro, elegante, moderno, com cara de estratégia. Paleta (tokens em `src/index.css`, `@theme`):
preto profundo + prata + **roxo como energia**. O roxo é raro: ação principal, vez do jogador, foco. Aliado = roxo,
inimigo = vermelho. Usar sempre os tokens (`bg-surface`, `text-fg-muted`, `text-primary`...), nunca cor solta.
**Cara de jogo, não de painel/e-commerce** (referências: HUD de Cyberpunk, lobby de The Finals): títulos enormes
em caixa alta itálica condensada, rótulos e números em mono, cantos chanfrados, molduras de canto, arte de fundo.
Fontes gratuitas (OFL): Barlow Condensed (`font-display`, títulos e botões), Inter (texto), JetBrains Mono
(`font-mono`, rótulos de HUD, números, índices "01"). Referência viva em `/design` (`src/pages/design-page.tsx`).

- Formas: `chamfer` (cantos cortados; cores por `--chamfer-bg`/`--chamfer-border`, corte por `--cut`) para botões,
  destaques e cards de personagem; `hud-corners` (só os 4 cantos, cor `--hud-color`) para painéis de dados.
  Extras: `scanlines`, `bg-grid`, `text-outline` (palavra gigante vazada de fundo).
- Arredondamento quase reto: `rounded-control` (4px), `rounded-card` (6px), `rounded-panel` (8px), `rounded-pill`
  (avatar, ponto). Não usar `rounded-md`/`rounded-lg` soltos.
- Títulos de página e seção: `PageHeader`, `Eyebrow`, `SectionTitle` (`src/components/layout/page.tsx`).
- Arte: `public/art/`. Sem arquivo, o lobby mostra uma grade 3x3 em perspectiva. Todas as artes são 16:9, com o
  personagem à direita e a esquerda vazia para o texto. O topo do lobby é um carrossel de destaques (`LobbyHero` e
  `slides` na home), um slide por área, cada um com a sua arte:
  - `lobby-batalha.jpg`: slide Batalha do lobby.
  - `lobby-mascarado.jpg`: guerreiro mascarado, slide Esquadrões do lobby.
  - `lobby-ecko.jpg`: Ecko, topo de Esquadrões (`SQUADS_ART` em `squads-page.tsx`).
  - `banner-sunna.jpg`: Sunna, topo de Personagens (`CHARACTERS_ART` em `characters-page.tsx`).
  - `banner-explosao.jpg`: topo de Batalhar (`PLAY_ART` em `play-page.tsx`).
  - `banner-adagas.jpg`: topo de Histórico (`HISTORY_ART` em `history-page.tsx`).
  - `banner-lanca.jpg`: slide Personagens do lobby e topo de Minha conta (`ACCOUNT_ART` em `account-page.tsx`).
  - `banner-arsenal.jpg`: topo do Arsenal (`GEAR_ART` em `gear-page.tsx`; sem arquivo, fica a grade).
  - `banner-bestas.jpg`: topo de Bestas (`BEASTS_ART` em `beasts-page.tsx`; sem arquivo, fica a grade).
  - Topo das páginas do hub com arte: `PageBanner` (`src/components/layout/page-banner.tsx`). A arte aparece **inteira**,
    sem recorte (`BannerArt`: altura do banner, largura na proporção, colada à direita, borda esquerda sumindo no fundo);
    o lobby usa o mesmo `BannerArt`.
- Personagens: `public/characters/<templateKey>.png` (o `templateKey` de `GET /templates`, dos personagens e das
  unidades da batalha). PNG quadrado, corpo inteiro, fundo transparente, **virado para a direita**, cabeça no alto e pés
  na base. Direção de arte em `../origin-game/docs/art_direction.md`. Helper e escala por personagem em
  `src/features/game/character-images.ts`; componentes em `character-art.tsx`:
  - `CharacterPortrait`: rosto e tronco nos menus (a imagem ampliada a partir do topo; `zoom` maior = só o rosto).
  - `CharacterSprite`: boneco inteiro da batalha, sobre sombra em CSS; o **inimigo é espelhado no CSS** (`scaleX(-1)`).
    Fica solto no campo, sem card: `battle-board.tsx` desenha o chão em perspectiva (SVG, casas = alvo do clique e do
    teclado) e posiciona cada boneco pelos pés no meio da casa, com a barra de vida acima da cabeça.
    Animações no `index.css` (respirar, avançar, dano, morto em cinza), disparadas pelos eventos do servidor.
  - Sem a imagem (ainda não gerada), os dois caem no ícone da classe: um arquivo novo aparece sem mexer no código.
- Estados: `*-hover` clareia, `*-active` escurece, desabilitado = `opacity-40`, foco = utilitário `focus-ring`.
- Degradês: `bg-gradient-primary`, `bg-gradient-surface`, `bg-gradient-glow`, `bg-gradient-line`,
  `text-gradient-silver`, `text-gradient-primary`. Brilho: `shadow-glow`, `shadow-glow-danger`.
- Botão: `src/components/ui/button.tsx` (primary, secondary, ghost, danger; sm, md, lg). Em `<Link>`, usar
  `buttonClasses()` de `button-classes.ts`.

## Explicações para o jogador

Texto único em `src/features/game/glossary.ts` (atributos, status, termos da batalha; etiquetas de status). Três níveis,
do mais leve ao completo: **`Term`** (`src/components/ui/term.tsx`: o próprio rótulo com sublinhado pontilhado e balão no
mouse/modal no toque, sem ícone extra; não usar dentro de link, lá vai `title`), o **painel da unidade** na batalha
(status com efeito e observação) e a página **Guia** (`/guia`, `guide-page.tsx`, com âncoras `#atributos`, `#status`,
`#classes`, `#batalha`). Termo novo do jogo: escrever no glossário e mostrar nesses lugares.

**Tutoriais das telas** (`src/features/tutorial/`): cada tela tem um passo a passo em modal, aberto pelo botão
`TutorialButton` no topo dela (`tutorial` do `PageBanner`; no lobby, na ficha do personagem e na barra da batalha, direto).
Conteúdo em `tutorials.tsx` (passos com `StepLayout` de `tutorial-kit.tsx`: frase, miniatura "Na tela" e pontos numerados;
miniaturas em `tutorial-mocks.tsx`, só desenho, sem dado real). O `TutorialProvider` (dentro do `RequireAuth`) desenha o
modal e, no primeiro acesso da conta neste navegador (`localStorage` `origin:tutorial-seen:<id>`), pergunta se a pessoa quer
o **tour**: passa pelas telas de `tourOrder`, navegando até cada uma. O Guia lista todos e refaz o tour. Tela nova: um
tutorial em `tutorials.tsx` e o botão no topo dela.

## Navegação

Barra **lateral** (`src/components/layout/sidebar.tsx`), recolhível no desktop e em gaveta no mobile, dentro do
`AppShell`. Escolhida por ser desktop primeiro e ter muitas seções (hoje e no futuro: mercado, ranqueado, baús,
organização, admin), sem roubar altura da grade. A tela de batalha fica **fora** do `AppShell`, em tela cheia.
Páginas usam `Page` e `PageHeader` (`src/components/layout/page.tsx`).
O cartão da conta no pé da barra leva a `/conta` (`account-page.tsx`): números da conta, nome exibido e senha
(`PATCH /me`, `useUpdateAccount`) e sair. Senha atual errada vem como 400, marcada no campo.

## Bônus de formação

Na montagem do esquadrão (`formation-editor.tsx`), cada personagem mostra na grade quantos bônus tem na posição atual
(a lista abre no hover da célula; passar o mouse no painel ou no elenco acende a célula dele), as células
vazias mostram o que muda se alguém vier para elas (`cellBonuses`: o que recebe dos vizinhos e o bônus próprio que liga ou,
em laranja, desliga em Executor e Artilharia da grade) e o painel ao lado detalha, a cada movimento e
sem nova requisição. Os valores vêm da API (`GET /formation-bonuses`,
`useFormationBonuses`, com cache como o resto do catálogo); sem resposta, a tela não mostra percentual. Só as condições
(adjacência, fundo da linha, sem aliado ao lado, Vanguarda ancora) continuam espelhadas de `battle-engine.ts` em
`src/features/squads/formation-bonus.ts`: **mudou a condição lá, muda aqui**. Quem aplica é o servidor.
O ícone de ajuda sobre a grade abre o tutorial `formacao` (passos em `formation-tutorial.tsx`, lista em `tutorials.tsx`,
que também fecha o tutorial de Esquadrões): grades de exemplo que passam pelo mesmo cálculo, então nenhum número do
tutorial é escrito à mão. Regra nova de formação: novo passo aqui.

## Economia (Mercado e Baús)

Carteira com moeda (M) e 7 tipos de fragmento, baús e aprimoramento de skill (D150). Rotas e tipos em
`src/features/economy/economy-api.ts`; nomes, ordem e cores em `economy-labels.ts` (tokens `coin`, `rarity-*` e
`lineage-*` no `index.css`); peças visuais em `economy-ui.tsx` (`Coins`, `FragmentIcon`, `FragmentDeltaList`, `RarityTag`
e `ChestArt`, o baú desenhado em SVG na cor do nível). **Preços e chances vêm de `GET /economy`** (`useEconomy`, com cache
como o catálogo): nenhum valor escrito à mão. Toda resposta de gasto traz a carteira nova e grava no cache; um 409 (a
carteira mudou em outra aba) recarrega a carteira.

- `/mercado` (`market-page.tsx`): carteira (`WalletBar`), baús à venda com a chance de cada raridade, personagens fora do
  elenco (o que pode sair), troca de fragmentos e o que a batalha dá.
- `/baus` (`chests-page.tsx`): baús fechados e a abertura em modal (o baú treme um tempo mínimo e revela o item: personagem
  novo, repetido que virou moeda ou raridade sem personagem, mais os fragmentos).
- Fim da batalha: o `loot` (`result.loot`) aparece no `ResultOverlay` e no detalhe do Histórico; `useRefreshAfterBattle`
  recarrega carteira e baús.
- Aprimorar: `EnhancePanel` sob a skill na build (ficha do personagem), com custo pelo tipo e a linhagem da skill.
- Barra lateral: grupo Economia (badge = baús fechados) e a moeda no cartão da conta. Artes do topo:
  `banner-mercado.jpg` e `banner-baus.jpg` (sem arquivo, fica a grade).

## Despertar

Tudo oculto (D151): o jogador só vê o `awakeningHint` do personagem (`SILENT`, `SIGNS`, `IMMINENT`, `AWAKENED`), nunca
qual despertar nem as missões. Peças em `src/features/characters/awakening-ui.tsx`: `AwakeningCard` (topo da ficha, com a
trilha de estágios), `AwakeningChip` (cartão de Personagens) e `AwakenedBanner` (`reward.awakened` no `ResultOverlay` e no
detalhe do Histórico). Textos em `awakeningHints` e `awakeningTerms` do glossário e na seção `#despertar` do Guia. Os
blocos de recuperação (`source: AWAKENING`) aparecem em `SkillOffers` com título e aviso próprios. A API do jogador não
manda o nome da variante despertada (só a key), então a ficha mostra só "Despertado". No admin, a coleção `awakenings`
(`awakening-form.tsx`: variante despertada, perfil alto/baixo e pool de missões com uma de cada categoria; tipos em
`admin-schema.ts`, espelho de `catalog.ts`); a skill de variante despertada pede a referência com `isAwakened`.

## DOM

Visível, é treino (D152): 4 pilares (Mente, Coração, Corpo, Aura) com básico, intermediário e avançado. O personagem traz
`dom` (nível, pontos na janela, pontos por papel, próximo limiar, piso da perda e título de cada pilar); regras, feitos e
skills únicas vêm de `GET /dom-rules` (`useDomRules`, com cache): nenhum número escrito à mão. Nomes, ícones e cores em
`src/features/game/dom-labels.ts` (tokens `dom-*` no `index.css`).

- Ficha: seção 04 `DomPanel` (`dom-panel.tsx`: janela, um cartão por pilar com barra até o próximo nível, marca da perda,
  papéis do avançado e os feitos) e os títulos no topo. Fim da batalha e Histórico: `DomChangeBadges` (`reward.domChanges`).
- Batalha: as skills únicas vêm depois das 4 da build (`singleUse`, `domPillar`) e ficam numa faixa fina acima da build
  (`DomChip` em `action-panel.tsx`: chip em paralelogramo na cor do pilar, de propósito diferente do slot de skill, para
  não parecer uma 5ª skill; teclas 5 em diante; riscada e "usada" depois de usar). Efeitos `WEAKEN`, `FORESIGHT` e `INVULNERABLE` em
  `skill-text.ts`; prévia `WEAKEN` e `INVULNERABLE`. `unit.invulnerable` desenha a casca no boneco (`IND`). O golpe anulado
  vem como `DAMAGE` 0. Os 7 `MODIFIER` do Rei em cada alvo viram um evento só do front (`foldModifiers`, `WEAKEN`).
- Guia: seção `#dom` (`domTerms` e `DomGuide`). Admin, aba Contas: clicar no personagem abre o editor do DOM
  (`PUT /admin/characters/:id/dom`, `useSetCharacterDom`).

## Equipamento vivo

Armas e armaduras vivas (D94, D153), um slot por personagem. Rotas e tipos em `src/features/gear/gear-api.ts`; nomes,
cores e textos em `gear-labels.ts` (tokens `grade-*` no `index.css`, a cor da raridade equivalente); peças em `gear-ui.tsx`
(`GearEmblem`, sem arquivo de arte: o ícone do tipo na cor do grau; `GradeTag`, `BondBadge`, `RequirementChips`,
`BondDetails`). **O elo e o efeito vêm prontos do servidor** (`bond.effects`); regras e catálogo de `GET /gear-rules`
(`useGearRules`, com cache): nenhum número escrito à mão.

- `/arsenal` (`gear-page.tsx`, grupo Coleção da barra): inventário com a compra de +5 espaços, filtro, e o detalhe do item
  com o elo de cada personagem (`GET /gear/:id/bonds`), equipar, tirar e vender (com confirmação). `?item=` escolhe o item.
- Ficha: seção 05 `CharacterGearPanel` (`character-gear-panel.tsx`): o do slot, o elo atual, os stats com o bônus
  (`character.gear.stats`; os da seção 01 são sem ele) e o seletor com a prévia do elo antes de equipar. Elenco: ícone do
  tipo na cor do grau no cartão.
- As ações do personagem (build, pontos, aprimorar) **não devolvem o `gear`**: `storeCharacter` (game-api) mantém o do
  cache; pontos livres relêem a ficha e o inventário (o elo sai dos stats).
- Baú: `contents.gear` / `convertedGearKey` (`GearReveal` em `chests-page.tsx`). Batalha: `unit.gear` no painel da unidade
  (passiva dos dois lados; elo, queda e chance de perder a vez só nas suas); `SKIP` com `reason: 'GEAR'` (faixa e "Rebelde!"),
  `HEAL`/`STATUS` com `source: 'GEAR'` no registro; o painel compara com `gear.stats`.
- Guia `#equipamento` (`gearTerms` e `GearGuide`), tutorial `arsenal`. Admin: coleção `gear` (`gear-form.tsx`, espelho de
  `GearTemplate.create`; `saleValue` só de leitura) e "Dar equipamento" na aba Contas (`useGrantGear`).

## Bestas

Contratos com bestas (D95, D154). Rotas e tipos em `src/features/beasts/beast-api.ts`; nomes, cores e textos dos
contratos em `beast-labels.ts` (tokens `beast` e `contract-*` no `index.css`; o grau usa `grade-*`, a sagrada o Divino);
peças em `beast-ui.tsx` (`BeastEmblem`, sem arquivo de arte: a pata na cor do grau com o filete do contrato; `ContractTag`,
`BeastGradeTag`, `BeastSkillList`). **Regras e números vêm de `GET /beast-rules`** (`useBeastRules`, com cache).

- `/bestas` (`beasts-page.tsx`, grupo Coleção): as bestas da conta, o contrato em números, as skills em campo e o dono;
  firmar (personagem + slot da build, com os requisitos do Mestre por personagem), trocar o slot, vender e soltar (com
  confirmação: desfazer o contrato perde a besta). `?besta=` escolhe. Os requisitos usam `RequirementList` do equipamento.
- Ficha: seção 06 `CharacterBeastsPanel` (`character.beasts`, com o slot e o aviso de build bloqueada no Mestre).
- Batalha: a invocação é uma skill de uso único com `beastKey`, **no slot dela na build** (a faixa de cima é só das únicas
  do DOM, `singleUse && domPillar`). As bestas são unidades com `beast` (fora de campo: `alive` falso e sem posição): pata
  no lugar do ícone (`CharacterSprite icon`), turnos na plaquinha, fora do placar e sem marca ao cair. A do Mestre joga
  pela `ActionBar` (o card mostra a besta). `equality` no dono: barra e etiqueta `IGU`. Eventos `SUMMON`, `BEAST_LEAVE`,
  `EQUALITY`, `EQUALITY_ABSORB` e `EQUALITY_BREAK` em `battle-events.ts`; efeitos `SUMMON`/`EQUALITY` em `skill-text.ts`
  (papel `SUMMON`).
- Guia `#bestas` (`beastTerms` e `BeastGuide`), tutorial `bestas`. Admin: coleção `beasts` (`beast-form.tsx`, espelho de
  `BeastTemplate`; os passos mudam com o contrato) e "Dar besta" na aba Contas (`useGrantBeast`).

## Eventos

Momentos raros, sempre com fim (D155, D156): cada evento é uma lista de **etapas em sequência**, cada uma uma batalha PvE
contra um squad de NPC. Rotas e tipos em `src/features/events/event-api.ts`; nomes, ícones, cores e textos (requisito,
modificador, tipo) em `event-labels.ts` (tokens `event-*` no `index.css`, a caça usa a cor das bestas); hooks em
`event-hooks.ts` (`useServerNow` com a hora do servidor, `phaseClock`, `useRewardCatalog` que acha o nome do prêmio pela
`key`); peças em `event-ui.tsx` (`EventEmblem`, `EventKindTag`, `PhaseTag`, `RewardChip`/`RewardList`, `EventOutcomePanel`).
**Fase, tentativas, requisitos e prêmios vêm do servidor** (`GET /events`): nenhum número escrito à mão.

- `/eventos` (`events-page.tsx`, grupo Jogar; badge = prêmios na caixa): abertos, em breve ("começa em", sem entrar) e
  encerrados em que a conta jogou; o detalhe com a contagem, tentativas, squad fixo (e os travados), campo, requisitos,
  modificadores, a trilha das etapas (adversário, prêmio, captura na caça com a chance) e os prêmios de conclusão e
  participação. `?evento=` escolhe. Jogar: `POST /events/:key/draft` abre o mesmo modal de Batalhar (`FieldSection` e
  `SquadSection` de `src/features/battle/pre-battle.tsx`), com os avisos de requisito e squad travado por esquadrão
  (`event-requirements.ts`, espelho de `eventRequirementError` só para orientar: **mudou lá, muda aqui**). Quem confere é
  o `POST /battles` (400 com a mensagem).
- Caixa de recompensas (`#caixa`, no topo de `/eventos`): equipamento e besta sem espaço; retirar (pede espaço), descartar
  (com confirmação) e o prazo.
- Fim da batalha: `result.eventOutcome` no `ResultOverlay` (e "Voltar ao evento") e no detalhe do Histórico
  (`EventOutcomePanel`: etapa, captura, conclusão e cada prêmio com o status: na conta, repetido virou moeda, na caixa,
  indisponível). Começar a batalha e o fim dela recarregam os eventos e a caixa.
- Guia `#eventos` (`eventTerms` e `EventGuide`), tutorial `eventos`. Admin: coleção `events` (`event-form.tsx`, espelho de
  `EventTemplate.create` e `catalogIntegrityError`; datas no `DateTimeField`, hora local e ISO para o servidor). Arte do topo:
  `banner-eventos.jpg` (sem arquivo, fica a grade).

## Rodando

- Backend: `npm run start:dev` no `origin-game` (porta 3333).
- Front: `npm run dev` (porta 5173, fixa: é a origem liberada por padrão no `CORS_ORIGINS` do backend).

## Admin

`/admin` (`src/pages/admin-page.tsx`, lazy no router), atrás de `RequireAdmin` (`role` de `GET /me`); o link só
aparece na barra lateral para `ADMIN`. A guarda do front só esconde a tela; a proteção real é o 403 do backend.
Rotas em `src/features/admin/admin-api.ts`. Duas abas (`?aba=`):

- **Catálogo** (`catalog-panel.tsx`): lista por coleção e um **formulário por tipo** para quem não conhece JSON
  (`entry-forms.tsx`: variante, traço, campo; `template-form.tsx`, `skill-form.tsx`, `npc-squad-form.tsx`), com
  listas de escolha, explicação e exemplo em cada campo, e `*` nos obrigatórios. **Todo formulário é um passo a
  passo**, pensado para quem não conhece o projeto: cada passo explica o que é, mostra o que falta (espelho das regras
  do domínio no backend, só para orientar) e termina numa revisão. Peças em `wizard.tsx` (trilha, cabeçalho, navegação,
  revisão) e `wizard-steps.ts`; escolhas explicadas em cartões (`ChoiceCards`). Item novo começa do passo 1; existente
  abre na revisão. No modelo (`template-form.tsx`), variante, traço e skills do kit são escolhidos ou criados ali mesmo
  (`inline-entry.tsx`, salva na hora), porque o servidor só aceita o modelo com as 4 skills do kit já criadas. A skill
  (`skill-form.tsx`) tem desenho da grade para área e alcance e a frase que o jogador vai ler. O `GET /admin/catalog` já vem no formato do `PUT`; os campos
  só de leitura ficam fora. Tipos, nomes, explicações e valores de partida dos efeitos/gatilhos em `admin-schema.ts`
  (espelho de `../origin-game/src/infra/http/schemas/catalog.ts`: **mudou lá, muda aqui**); campos em
  `form-fields.tsx`, lista de efeitos em `effects-editor.tsx`. Dicas que repetem o servidor só para ajudar
  (orçamento do modelo, referência da skill via `GET /admin/skills/reference`, faixa de nível do NPC); quem decide é
  o servidor, e o erro dele aparece no topo com o nome do campo em português. Modo JSON fica como avançado.
- **Contas** (`accounts-panel.tsx`): tabela das contas, personagens e batalhas da escolhida, dar personagem.

## API

- `src/lib/api.ts`: axios com `withCredentials` (sessão em cookies httpOnly) e refresh automático em 401.
- O `options[].payload` de `GET /battles/:id/options` já é o corpo da jogada: o front mostra as opções e envia a escolhida.
- Os `events` de `POST /battles/:id/actions` **repetem o começo da vez** (do último `TURN` em diante, que já estava no
  registro). Juntar com `newEvents()` (`src/features/battle/battle-events.ts`); conferido contra `GET /battles/:id`.
- `POST /battles` já vem com as vezes da máquina que agiram antes do jogador: a tela reproduz essa abertura a partir
  de todos com vida cheia (`openingUnits()` em `battle-events.ts`). Cada skill e cada Atordoado sobem uma faixa no topo
  do campo (`CastBanner` em `battle-page.tsx`), com o que a skill fez em quem.
- Na batalha, o alvo da opção (`payload.target`) é uma célula, mas quem é atingido vem em `preview.hits`: a tela marca
  o primeiro atingido como lugar do clique. O HP pode vir fracionado (Desgaste): exibir com `displayHp()`.
- A API é chamada **direto** em `VITE_API_URL` (sem proxy do Vite): o cookie de refresh tem `path=/sessions`, e um
  prefixo como `/api` o quebraria. `localhost:5173` e `localhost:3333` são o mesmo *site*, então `SameSite=Strict` funciona.
