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
  - `banner-sunna.jpg`: Sunna, slide Personagens e topo de Personagens (`CHARACTERS_ART` em `characters-page.tsx`).
  - Topo das páginas do hub com arte: `PageBanner` (`src/components/layout/page-banner.tsx`), com `artPosition`
    para ajustar o enquadramento de cada arte.
  - A cabeça dos personagens fica no alto da arte: usar `object-[right_top]` para o rosto não ser cortado.
- Personagens: `public/characters/<templateKey>.png` (o `templateKey` de `GET /templates`, dos personagens e das
  unidades da batalha). PNG quadrado, corpo inteiro, fundo transparente, **virado para a direita**, cabeça no alto e pés
  na base. Direção de arte em `../origin-game/docs/art_direction.md`. Helper e escala por personagem em
  `src/features/game/character-images.ts`; componentes em `character-art.tsx`:
  - `CharacterPortrait`: rosto e tronco nos menus (a imagem ampliada a partir do topo; `zoom` maior = só o rosto).
  - `CharacterSprite`: boneco inteiro da batalha, sobre sombra em CSS; o **inimigo é espelhado no CSS** (`scaleX(-1)`).
    Animações no `index.css` (respirar, avançar, dano, morto em cinza), disparadas pelos eventos do servidor.
  - Sem a imagem (ainda não gerada), os dois caem no ícone da classe: um arquivo novo aparece sem mexer no código.
- Estados: `*-hover` clareia, `*-active` escurece, desabilitado = `opacity-40`, foco = utilitário `focus-ring`.
- Degradês: `bg-gradient-primary`, `bg-gradient-surface`, `bg-gradient-glow`, `bg-gradient-line`,
  `text-gradient-silver`, `text-gradient-primary`. Brilho: `shadow-glow`, `shadow-glow-danger`.
- Botão: `src/components/ui/button.tsx` (primary, secondary, ghost, danger; sm, md, lg). Em `<Link>`, usar
  `buttonClasses()` de `button-classes.ts`.

## Navegação

Barra **lateral** (`src/components/layout/sidebar.tsx`), recolhível no desktop e em gaveta no mobile, dentro do
`AppShell`. Escolhida por ser desktop primeiro e ter muitas seções (hoje e no futuro: mercado, ranqueado, baús,
organização, admin), sem roubar altura da grade. A tela de batalha fica **fora** do `AppShell`, em tela cheia.
Páginas usam `Page` e `PageHeader` (`src/components/layout/page.tsx`).

## Rodando

- Backend: `npm run start:dev` no `origin-game` (porta 3333).
- Front: `npm run dev` (porta 5173, fixa: é a origem liberada por padrão no `CORS_ORIGINS` do backend).

## Admin

`/admin` (`src/pages/admin-page.tsx`, lazy no router), atrás de `RequireAdmin` (`role` de `GET /me`); o link só
aparece na barra lateral para `ADMIN`. A guarda do front só esconde a tela; a proteção real é o 403 do backend.
Rotas em `src/features/admin/admin-api.ts`. Duas abas (`?aba=`):

- **Catálogo** (`catalog-panel.tsx`): lista por coleção e um **formulário por tipo** para quem não conhece JSON
  (`entry-forms.tsx`: variante, traço, campo; `template-form.tsx`, `skill-form.tsx`, `npc-squad-form.tsx`), com
  listas de escolha, explicação e exemplo em cada campo. O `GET /admin/catalog` já vem no formato do `PUT`; os campos
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
- Na batalha, o alvo da opção (`payload.target`) é uma célula, mas quem é atingido vem em `preview.hits`: a tela marca
  o primeiro atingido como lugar do clique. O HP pode vir fracionado (Desgaste): exibir com `displayHp()`.
- A API é chamada **direto** em `VITE_API_URL` (sem proxy do Vite): o cookie de refresh tem `path=/sessions`, e um
  prefixo como `/api` o quebraria. `localhost:5173` e `localhost:3333` são o mesmo *site*, então `SameSite=Strict` funciona.
