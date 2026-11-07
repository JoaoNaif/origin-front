import {
  ArrowLeftRight,
  BookOpen,
  Clock,
  Coins as Coins3,
  Gem,
  Package,
  Percent,
  Store,
  Crosshair,
  Eye,
  FastForward,
  Filter,
  Flag,
  Footprints,
  Gauge,
  Grid3x3,
  History,
  House,
  KeyRound,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Mountain,
  MousePointerClick,
  Play,
  Plus,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fragmentLabels, rarityTone } from '@/features/economy/economy-labels'
import { ChestArt, Coins, FragmentIcon } from '@/features/economy/economy-ui'
import { difficultyLabels, type CharacterClass } from '@/features/game/game-api'
import { FormationStep } from '@/features/squads/formation-tutorial'
import type { Tutorial, TutorialId, TutorialStep } from '@/features/tutorial/tutorial-context'
import { Flow, MockBar, MockButton, MockCard, MockGrid, MockLabel, StepLayout, Strong } from '@/features/tutorial/tutorial-kit'
import {
  ActionBarMock,
  BoardMock,
  CharacterCardMock,
  Chips,
  ClassIcon,
  DifficultyMock,
  FieldMock,
  SkillMock,
  StatsPanelMock,
  StatusTiles,
  TimelineMock,
} from '@/features/tutorial/tutorial-mocks'
import { cn } from '@/lib/cn'

// Conteúdo dos tutoriais de cada tela. Só explica o que a tela mostra e para que serve: as regras vêm do glossário e
// do game design (../origin-game/docs/game_design.md), e quem decide é o servidor. Tela nova: um tutorial aqui, o
// `TutorialButton` no topo dela e, se for importante para começar, um lugar em `tourOrder`. Miniaturas em
// tutorial-mocks.tsx.

/** Bônus de formação: o tutorial "formacao" (ícone da grade) e o fim do de Esquadrões. */
const formationSteps: TutorialStep[] = [
  { title: 'A grade', content: <FormationStep step="grid" /> },
  { title: 'Aura: vale para os vizinhos', content: <FormationStep step="aura" /> },
  { title: 'Auras iguais não somam', content: <FormationStep step="stacking" /> },
  { title: 'O que cada classe dá', content: <FormationStep step="classes" /> },
  { title: 'Executor: quer ficar sozinho', content: <FormationStep step="executor" /> },
  { title: 'Artilharia: quer ficar atrás', content: <FormationStep step="artillery" /> },
  { title: 'Agrupar ou espalhar', content: <FormationStep step="tradeoff" /> },
]

export const tutorials: Record<TutorialId, Tutorial> = {
  lobby: {
    id: 'lobby',
    title: 'Lobby',
    summary: 'A tela inicial: próximo passo, avisos e o atalho para cada área.',
    steps: [
      {
        title: 'Sua base',
        content: (
          <StepLayout
            lead={
              <>
                O lobby é a primeira tela depois de entrar. Ele mostra <Strong>em que ponto você está</Strong> e qual é o próximo passo.
              </>
            }
            visual={
              <div className="space-y-3">
                <MockLabel className="text-primary-soft">Área de batalha</MockLabel>
                <p className="font-display text-3xl leading-[0.9] font-extrabold uppercase italic text-silver-bright">
                  Domine <span className="text-gradient-primary">a grade</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <MockButton>
                    <Swords className="size-3.5" /> Batalhar
                  </MockButton>
                  <MockButton variant="secondary">
                    <History className="size-3.5" /> Histórico
                  </MockButton>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <span className="h-0.5 w-8 bg-primary-soft" />
                  <span className="h-0.5 w-8 bg-overlay" />
                  <span className="h-0.5 w-8 bg-overlay" />
                </div>
              </div>
            }
            points={[
              { label: 'Destaques', text: 'O topo passa sozinho entre Batalha, Esquadrões e Personagens. Pare com o mouse em cima ou use as setas.' },
              {
                label: 'Botão principal',
                text: 'Muda com o momento: sem esquadrão, leva a montar um; com esquadrão, a batalhar; com uma batalha aberta, a retomar.',
              },
              { label: 'Barra lateral', text: 'Todas as telas ficam à esquerda. Os itens em "Em breve" ainda não abriram.' },
            ]}
          />
        ),
      },
      {
        title: 'Faixa de status',
        content: (
          <StepLayout
            lead="Logo abaixo dos destaques, três painéis dizem o que está pendente. O que pede atenção acende em roxo."
            visual={<StatusTiles />}
            points={[
              { icon: Swords, label: 'Contra a máquina', text: 'Leva à escolha do adversário. Com uma batalha em andamento, vira o atalho para voltar a ela.' },
              { icon: Sparkles, label: 'Blocos de skill', text: 'Quantas skills novas esperam a sua escolha. Clicar leva à ficha do primeiro personagem da fila.' },
              { icon: LayoutGrid, label: 'Esquadrões', text: 'Quantos você já montou. Sem nenhum, ainda não dá para batalhar.' },
            ]}
          />
        ),
      },
      {
        title: 'Elenco e registro',
        content: (
          <StepLayout
            lead="Mais abaixo, um resumo dos seus personagens e das últimas batalhas."
            visual={
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['GUARDIAN', 'EXECUTOR', 'SUPPORT'] as CharacterClass[]).map((c, i) => (
                    <MockCard key={c} className="flex h-24 w-20 flex-col justify-between p-2 [--cut:8px]">
                      <ClassIcon c={c} className="size-6 self-center text-silver/30" />
                      <span className="font-mono text-[9px] text-primary-soft">LV {14 - i * 3}</span>
                    </MockCard>
                  ))}
                </div>
                <ul className="space-y-1">
                  {[
                    { result: 'Vitória', tone: 'bg-success', text: 'text-success' },
                    { result: 'Derrota', tone: 'bg-danger', text: 'text-danger' },
                  ].map((row) => (
                    <li key={row.result} className="flex items-center gap-2 border border-line/60 bg-surface/60 py-1.5 pr-2">
                      <span className={cn('h-5 w-0.5', row.tone)} />
                      <span className={cn('font-display text-xs font-bold uppercase', row.text)}>{row.result}</span>
                      <span className="text-xs text-fg-muted">vs Adversário</span>
                    </li>
                  ))}
                </ul>
              </div>
            }
            points={[
              { icon: Users, label: 'Elenco', text: 'Seus personagens, do maior nível para o menor. Clique em um para abrir a ficha dele.' },
              { icon: ScrollText, label: 'Registro de combate', text: 'As últimas batalhas encerradas. A lista completa fica em Histórico.' },
            ]}
          />
        ),
      },
      {
        title: 'O ciclo do jogo',
        content: (
          <StepLayout
            lead="Tudo gira em um ciclo: prepare os personagens, monte o esquadrão, batalhe e volte mais forte."
            visual={
              <Flow
                items={[
                  { icon: Users, label: 'Personagens' },
                  { icon: LayoutGrid, label: 'Esquadrão' },
                  { icon: Swords, label: 'Batalhar' },
                  { icon: TrendingUp, label: 'Evoluir' },
                ]}
              />
            }
            points={[
              { label: 'Prepare', text: 'Escolha as 4 skills da build de cada personagem e distribua os pontos livres.' },
              { label: 'Monte', text: 'Escolha 4 personagens e a posição de cada um na grade 3x3.' },
              { label: 'Batalhe', text: 'Escolha um adversário, veja o campo sorteado e entre com o esquadrão.' },
              { label: 'Evolua', text: 'Batalhas dão experiência. A cada 5 níveis, uma skill nova para escolher.' },
            ]}
            tip={
              <>
                Em qualquer tela, o botão <Strong>Tutorial</Strong> no topo explica aquela tela. O <Strong>Guia</Strong>, na barra lateral,
                tem os atributos, os status e os termos da batalha.
              </>
            }
          />
        ),
      },
    ],
  },

  personagens: {
    id: 'personagens',
    title: 'Personagens',
    summary: 'O seu elenco: classe, nível, atributos e o que falta resolver em cada um.',
    steps: [
      {
        title: 'O card do personagem',
        content: (
          <StepLayout
            lead="Cada personagem do elenco aparece num card com o essencial para comparar de relance."
            visual={<CharacterCardMock />}
            points={[
              { label: 'Classe', text: 'O papel dele na batalha (Guardião, Executor...). Ela também decide a aura que ele dá aos vizinhos na grade.' },
              { label: 'Nível e XP', text: 'A barra roxa é a experiência que falta para o próximo nível. O HP fica ao lado.' },
              { label: 'Atributos', text: 'Os números de baixo: Ataque, Defesa, Velocidade, Precisão, Esquiva e Vontade. A barrinha compara um com o outro.' },
            ]}
          />
        ),
      },
      {
        title: 'Avisos no card',
        content: (
          <StepLayout
            lead="No canto do card aparecem etiquetas quando há algo para resolver. Elas somem quando você resolve na ficha."
            visual={<CharacterCardMock badges />}
            points={[
              { icon: Sparkles, label: 'Bloco de skill', text: 'Ele subiu de nível e tem uma skill nova para escolher.' },
              { label: '+ pts', text: 'Pontos de atributo ainda não distribuídos.' },
              { label: 'Build x/4', text: 'A build não tem as 4 skills. Complete antes de batalhar: são elas que ele usa na luta.' },
            ]}
          />
        ),
      },
      {
        title: 'Filtrar e abrir a ficha',
        content: (
          <StepLayout
            lead="Com o elenco crescendo, os filtros ajudam a achar quem você quer."
            visual={
              <div className="space-y-3">
                <Chips items={['Todas', 'Guardião', 'Executor', 'Suporte']} />
                <div className="flex items-center gap-2">
                  <MockLabel>Ordem</MockLabel>
                  <span className="bg-raised px-2 py-0.5 font-mono text-[10px] uppercase text-fg">Nível</span>
                  <span className="font-mono text-[10px] uppercase text-fg-subtle">Nome</span>
                  <span className="font-mono text-[10px] uppercase text-fg-subtle">Classe</span>
                </div>
              </div>
            }
            points={[
              { icon: Filter, label: 'Classe', text: 'Mostra só os personagens de uma classe.' },
              { icon: ListOrdered, label: 'Ordem', text: 'Por nível, por nome ou por classe.' },
              { icon: MousePointerClick, label: 'Ficha', text: 'Clique no card para abrir a ficha: build, atributos, passiva e traços.' },
            ]}
          />
        ),
      },
    ],
  },

  personagem: {
    id: 'personagem',
    title: 'Ficha do personagem',
    summary: 'Build de 4 skills, pontos de atributo, blocos de skill, passiva e traços.',
    steps: [
      {
        title: 'O topo da ficha',
        content: (
          <StepLayout
            lead="O topo apresenta o personagem e mostra quanto falta para o próximo nível."
            visual={
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">
                    <ClassIcon c="GUARDIAN" className="size-3" /> Guardião
                  </Badge>
                  <Badge>Raridade B</Badge>
                  <Badge>Periculosidade Discreto</Badge>
                </div>
                <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">Nome</p>
                <MockCard className="w-48 space-y-2 p-3">
                  <MockLabel>Nível</MockLabel>
                  <p className="font-display text-4xl leading-none font-extrabold italic text-silver-bright">12</p>
                  <MockBar value={65} />
                  <p className="flex justify-between font-mono text-[10px] text-fg-muted">
                    <span>XP</span>
                    <span>340 / 520</span>
                  </p>
                </MockCard>
              </div>
            }
            points={[
              { label: 'Etiquetas', text: 'Classe, raridade e periculosidade do personagem.' },
              { label: 'Variantes', text: 'A linha abaixo do nome. A linhagem de cada variante decide qual atributo as skills dela desgastam.' },
              { label: 'Nível', text: 'Sobe com a experiência das batalhas e libera pontos de atributo e skills novas.' },
            ]}
          />
        ),
      },
      {
        title: 'Bloco de skill',
        content: (
          <StepLayout
            lead={
              <>
                A cada <Strong>5 níveis</Strong> o personagem ganha um bloco com até 3 skills, e você escolhe 1. O bloco aparece no topo da
                ficha.
              </>
            }
            visual={
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  <SkillMock kind="Ataque" name="Opção 1" />
                  <SkillMock kind="Controle" name="Opção 2" active />
                  <SkillMock kind="Apoio" name="Opção 3" />
                </div>
                <MockButton>
                  <Sparkles className="size-3.5" /> Escolher
                </MockButton>
              </div>
            }
            points={[
              { icon: Clock, label: 'Sem pressa', text: 'O bloco não expira. Se houver mais de um, eles esperam na fila.' },
              { label: 'Definitiva', text: 'A escolha não volta atrás.' },
              { label: 'Vai para as aprendidas', text: 'A skill nova não entra sozinha na build: você coloca quando quiser.' },
            ]}
          />
        ),
      },
      {
        title: 'Atributos e pontos livres',
        content: (
          <StepLayout
            lead="Os atributos vêm do personagem e do nível. Os pontos livres são a parte que você decide."
            visual={<StatsPanelMock />}
            points={[
              { label: 'Pontos livres', text: '+10 a cada 10 níveis; os primeiros chegam no nível 10.' },
              { label: 'Distribuir', text: 'Use + e − em cada atributo e salve. 1 ponto em HP vale 5 de HP. Cada atributo tem um máximo.' },
              { icon: BookOpen, label: 'O que cada um faz', text: 'Passe o mouse no nome do atributo, ou veja a lista completa no Guia.' },
            ]}
          />
        ),
      },
      {
        title: 'Passiva e traços',
        content: (
          <StepLayout
            lead="Além das skills, cada personagem tem uma passiva e traços."
            visual={
              <div className="space-y-2">
                <MockCard className="space-y-1">
                  <MockLabel className="text-primary-soft">Passiva</MockLabel>
                  <p className="font-display text-base font-bold uppercase tracking-wide text-silver-bright">Nome da passiva</p>
                  <p className="text-[11px] text-fg-muted">Funciona sozinha, sem gastar a vez.</p>
                </MockCard>
                <ul className="divide-y divide-line/70 border border-line/60 bg-surface/60">
                  <li className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-fg">
                    Traço de família <Badge>Família</Badge>
                  </li>
                  <li className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-fg">
                    Traço ganho <Badge>Conquistado</Badge>
                  </li>
                </ul>
              </div>
            }
            points={[
              { label: 'Passiva', text: 'Efeito próprio do personagem, que funciona sozinho. Não ocupa lugar na build.' },
              { label: 'Traços', text: 'Vêm da família do personagem ou de conquistas.' },
              { icon: Mountain, label: 'Traços e campo', text: 'O campo sorteado em cada batalha dá bônus a quem tem certos traços.' },
            ]}
          />
        ),
      },
      {
        title: 'Build: as 4 skills da batalha',
        content: (
          <StepLayout
            lead={
              <>
                A build são as <Strong>4 skills que o personagem leva</Strong> para a batalha. Só elas aparecem na hora de jogar.
              </>
            }
            visual={
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1.5">
                  <SkillMock kind="1" name="Skill A" />
                  <SkillMock kind="2" name="Skill B" />
                  <SkillMock kind="3" name="Skill C" />
                  <SkillMock empty />
                </div>
                <div className="flex justify-end gap-2">
                  <MockButton variant="ghost">Desfazer</MockButton>
                  <MockButton>Salvar build</MockButton>
                </div>
              </div>
            }
            points={[
              { label: 'Slots', text: 'Clique num slot para ver a skill; o X no canto tira ela da build.' },
              { label: 'Aprendidas', text: 'Tudo o que o personagem já sabe. Clique para ler os detalhes e use o botão ao lado para pôr na build.' },
              { label: 'Salvar', text: 'Com os 4 slots cheios, salve. Desfazer volta ao que estava salvo.' },
            ]}
          />
        ),
      },
    ],
  },

  esquadroes: {
    id: 'esquadroes',
    title: 'Esquadrões',
    summary: 'Monte a formação: 4 personagens na grade 3x3 e os bônus de cada posição.',
    steps: [
      {
        title: 'Seus esquadrões',
        content: (
          <StepLayout
            lead="Um esquadrão é uma formação pronta para batalhar. Você pode ter vários e escolher um em cada batalha."
            visual={
              <div className="space-y-1.5">
                {['Muralha', 'Emboscada'].map((name, i) => (
                  <MockCard key={name} active={i === 0} className="flex items-center gap-3">
                    <span className="grid grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }, (_, j) => (
                        <span key={j} className={cn('size-1.5', [0, 2, 4, 7].includes((j + i * 3) % 9) ? 'bg-primary-soft' : 'bg-overlay')} />
                      ))}
                    </span>
                    <span className="flex-1 font-display text-sm font-bold uppercase tracking-wide text-fg">{name}</span>
                    <span className="font-mono text-[10px] text-fg-subtle">0{i + 1}</span>
                  </MockCard>
                ))}
                <span className="flex h-9 items-center gap-2 border border-line px-3 font-display text-xs font-semibold uppercase tracking-widest text-fg-muted">
                  <Plus className="size-3.5" /> Novo esquadrão
                </span>
              </div>
            }
            points={[
              { label: 'Salvos', text: 'A lista à esquerda. A miniatura mostra quais casas estão ocupadas.' },
              { icon: Plus, label: 'Novo', text: 'Começa com a grade vazia. O nome é dado na criação.' },
              { icon: Trash2, label: 'Apagar', text: 'Ao lado do título do esquadrão aberto. Pede confirmação.' },
            ]}
          />
        ),
      },
      {
        title: 'Montar a formação',
        content: (
          <StepLayout
            lead={
              <>
                <Strong>4 personagens</Strong> em <Strong>9 casas</Strong>. A coluna da frente, à direita, encara o inimigo.
              </>
            }
            visual={
              <div className="space-y-2">
                <div className="grid w-fit grid-cols-3 gap-1.5 pr-6">
                  {['Fundo', 'Meio', 'Frente'].map((label, i) => (
                    <span key={label} className={cn('w-12 text-center font-mono text-[8px] uppercase tracking-[0.16em]', i === 2 ? 'text-primary-soft' : 'text-fg-subtle')}>
                      {label}
                    </span>
                  ))}
                </div>
                <MockGrid
                  arrow
                  units={[
                    { row: 0, column: 0, characterClass: 'GUARDIAN' },
                    { row: 1, column: 1, characterClass: 'SUPPORT' },
                    { row: 2, column: 2, characterClass: 'ARTILLERY' },
                  ]}
                  highlight={[{ row: 1, column: 0 }]}
                />
              </div>
            }
            points={[
              { icon: MousePointerClick, label: 'Posicionar', text: 'Clique num personagem da lista e depois numa casa. Arrastar também funciona.' },
              { icon: ArrowLeftRight, label: 'Mover e trocar', text: 'Clique em quem já está na grade e depois em outra casa. O X tira da grade.' },
              {
                icon: Shield,
                label: 'Frente e fundo',
                text: 'O primeiro de cada linha leva os golpes corpo a corpo; quem está atrás dele fica coberto contra golpes à distância.',
              },
              { label: 'Salvar', text: 'Com 4 na grade, salve. Quem não tem build completa aparece com aviso.' },
            ]}
            tip="A posição também decide os bônus de formação: os próximos passos mostram como."
          />
        ),
      },
      ...formationSteps.slice(1),
    ],
  },

  formacao: {
    id: 'formacao',
    title: 'Bônus de formação',
    summary: 'Auras de classe, Executor, Artilharia e a troca entre agrupar e espalhar.',
    steps: formationSteps,
  },

  batalhar: {
    id: 'batalhar',
    title: 'Batalhar',
    summary: 'Escolha o adversário, veja o campo sorteado e entre com o esquadrão.',
    steps: [
      {
        title: 'Escolha o adversário',
        content: (
          <StepLayout
            lead="Os adversários da máquina ficam agrupados por dificuldade. Clique em um para começar a pré-batalha."
            visual={<DifficultyMock />}
            points={[
              { icon: Gauge, label: 'Dificuldade', text: '5 níveis, do Iniciante ao Grão-mestre. Quanto mais alto, maior o nível dos personagens e melhor a máquina joga.' },
              { label: 'Perfil', text: 'O jeito da máquina jogar: Agressivo, Cauteloso, Focado em abater ou Equilibrado.' },
              { label: 'LV', text: 'O nível dos personagens do adversário.' },
            ]}
          />
        ),
      },
      {
        title: 'O campo sorteado',
        content: (
          <StepLayout
            lead={
              <>
                Escolhido o adversário, o servidor <Strong>sorteia o campo</Strong> antes de você escolher o esquadrão. Adaptar o esquadrão ao
                campo faz parte da estratégia.
              </>
            }
            visual={<FieldMock />}
            points={[
              { icon: Mountain, label: 'Bônus', text: 'Quem tem um dos traços listados ganha um bônus em dois atributos enquanto o campo valer.' },
              { label: 'Troca de campo', text: 'Algumas skills trocam o campo no meio da batalha, por algumas rodadas.' },
              { label: 'Sem campo', text: 'Às vezes não há campo, e ninguém ganha bônus.' },
            ]}
          />
        ),
      },
      {
        title: 'Esquadrão e início',
        content: (
          <StepLayout
            lead="Na mesma janela, escolha o esquadrão. Cada um mostra o que importa para este campo."
            visual={
              <div className="space-y-3">
                <MockCard active className="flex gap-3 p-3">
                  <MockGrid size="sm" units={[{ row: 0, column: 0, characterClass: 'GUARDIAN' }, { row: 1, column: 1, characterClass: 'EXECUTOR' }, { row: 2, column: 0, characterClass: 'VANGUARD' }, { row: 1, column: 2, characterClass: 'SUPPORT' }]} />
                  <span className="min-w-0 space-y-1.5">
                    <span className="block font-display text-base font-bold uppercase tracking-wide text-silver-bright">Muralha</span>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone="warning">2 com bônus do campo</Badge>
                      <Badge tone="danger">1 sem build completa</Badge>
                    </span>
                  </span>
                </MockCard>
                <div className="flex justify-end">
                  <MockButton>
                    <Swords className="size-3.5" /> Enfrentar
                  </MockButton>
                </div>
              </div>
            }
            points={[
              { label: 'Bônus do campo', text: 'Quantos personagens do esquadrão ganham o bônus deste campo.' },
              { label: 'Sem build completa', text: 'Alguém sem as 4 skills na build: ele entra com menos opções.' },
              { icon: Clock, label: '30 minutos', text: 'A pré-batalha vale 30 minutos. Passou disso, escolha o adversário de novo.' },
              { icon: Play, label: 'Em andamento', text: 'Uma batalha aberta aparece no topo da tela, com o atalho para retomar.' },
            ]}
          />
        ),
      },
    ],
  },

  batalha: {
    id: 'batalha',
    title: 'Batalha',
    summary: 'Placar, fila de vezes, o campo de batalha e como escolher cada jogada.',
    steps: [
      {
        title: 'O topo da batalha',
        content: (
          <StepLayout
            lead="A batalha abre em tela cheia. O topo resume a partida."
            visual={
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/85 px-3 py-2">
                <span className="font-display text-xs font-bold uppercase text-primary-soft">Você · 4</span>
                <span className="flex flex-col items-center">
                  <MockLabel>Rodada</MockLabel>
                  <span className="font-display text-2xl leading-none font-extrabold italic text-silver-bright">
                    7<span className="text-xs text-fg-subtle not-italic">/30</span>
                  </span>
                </span>
                <span className="font-display text-xs font-bold uppercase text-danger-hover">3 · Inimigo</span>
                <span className="flex w-full items-center justify-end gap-2">
                  <span className="flex items-center gap-1 border border-warning/45 px-1.5 py-0.5 font-mono text-[9px] uppercase text-warning">
                    <Mountain className="size-3" /> Campo
                  </span>
                  <MockButton variant="ghost">
                    <Flag className="size-3" /> Desistir
                  </MockButton>
                </span>
              </div>
            }
            points={[
              { label: 'Placar', text: 'Quantos de cada lado ainda estão de pé.' },
              { label: 'Rodada', text: 'A rodada fecha quando todos os vivos agiram. Na rodada 30, vence quem causou mais dano.' },
              { icon: Mountain, label: 'Campo', text: 'O campo em vigor e o bônus dele. Passe o mouse para ver até quando vale.' },
              { icon: Flag, label: 'Desistir', text: 'Pede confirmação. A máquina vence e não há XP.' },
            ]}
          />
        ),
      },
      {
        title: 'A fila: quem joga agora',
        content: (
          <StepLayout
            lead={
              <>
                Abaixo do topo fica a <Strong>fila de vezes</Strong>. O primeiro, em destaque, é quem age agora; roxo é seu, vermelho é do
                inimigo.
              </>
            }
            visual={<TimelineMock />}
            points={[
              { label: 'Velocidade', text: 'A ordem sai da Velocidade. Quem é bem mais rápido pode agir duas vezes na mesma rodada.' },
              { label: 'Vez da máquina', text: 'Ela joga sozinha. A jogada aparece animada no campo antes da sua vez voltar.' },
            ]}
          />
        ),
      },
      {
        title: 'O campo de batalha',
        content: (
          <StepLayout
            lead="Seu esquadrão fica à esquerda e o inimigo à direita, com as frentes viradas para o centro, na mesma formação que foi montada."
            visual={<BoardMock />}
            points={[
              { icon: Eye, label: 'Olhar alguém', text: 'Passe o mouse num personagem: aparece o painel com vida, atributos e status, com o que cada status faz.' },
              { label: 'Etiquetas', text: 'As siglas acima da cabeça são status (MAR = Marcado, ATR = Atordoado...). Laranja é controle; vermelho aumenta o dano recebido.' },
              { label: 'Vida', text: 'A barra acima de cada um. Chegou a zero, ele cai e sai da batalha.' },
            ]}
          />
        ),
      },
      {
        title: 'Sua vez: escolher a skill',
        content: (
          <StepLayout
            lead={
              <>
                Na sua vez, a barra de baixo mostra as <Strong>4 skills da build</Strong> de quem age. Escolha uma e clique no alvo:{' '}
                <Strong>o clique já envia a jogada</Strong>.
              </>
            }
            visual={
              <div className="space-y-4">
                <BoardMock targets />
                <ActionBarMock chosen />
              </div>
            }
            points={[
              { icon: Eye, label: 'Ler a skill', text: 'Passe o mouse numa skill: o painel à esquerda mostra o que ela faz.' },
              { icon: Crosshair, label: 'Alvo', text: 'Escolhida a skill, as casas que ela alcança acendem. Algumas pedem uma escolha extra no painel.' },
              { label: 'Prévia', text: 'Sobre o alvo, o painel mostra a chance de acerto, a força e o Desgaste da jogada.' },
              { label: 'Recarga', text: 'Skill usada fica alguns turnos esperando, apagada na barra.' },
            ]}
          />
        ),
      },
      {
        title: 'Mover, trocar, defender',
        content: (
          <StepLayout
            lead="Ao lado das skills ficam as ações de posição. A formação continua importando durante a luta."
            visual={<ActionBarMock />}
            points={[
              { icon: Footprints, label: 'Mover', text: 'Vai para uma casa vizinha. Custa meio turno.' },
              { icon: ArrowLeftRight, label: 'Trocar', text: 'Troca de lugar com um aliado. Meio turno para os dois.' },
              { icon: Shield, label: 'Defender', text: 'Recebe menos dano até o próximo turno e alivia o Desgaste.' },
              { label: 'Engajado', text: 'Na frente, encarando um Vanguarda, Guardião ou Executor: mover ou trocar custa o turno inteiro.' },
            ]}
          />
        ),
      },
      {
        title: 'Depois da jogada',
        content: (
          <StepLayout
            lead="O servidor resolve a jogada e a tela reproduz o que aconteceu, um evento por vez."
            visual={
              <div className="space-y-3">
                <div className="mx-auto w-fit border border-primary-soft/40 bg-surface/90 px-3 py-1.5 text-center">
                  <span className="font-display text-sm font-bold uppercase text-fg">Nome</span>{' '}
                  <MockLabel className="inline">usa</MockLabel>{' '}
                  <span className="font-display text-sm font-extrabold uppercase italic text-primary-soft">Investida</span>
                  <span className="block font-mono text-[10px] text-danger-hover">Alvo −86</span>
                </div>
                <div className="flex items-center justify-between border border-line/60 bg-surface/80 px-3 py-2">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                    <span className="size-1.5 rounded-pill bg-primary-soft" /> Resolvendo · 2/5
                  </span>
                  <MockButton variant="ghost">
                    <FastForward className="size-3" /> Pular
                  </MockButton>
                </div>
              </div>
            }
            points={[
              { label: 'Faixa da skill', text: 'No topo do campo: quem usou o quê, e o que fez em quem.' },
              { icon: FastForward, label: 'Pular', text: 'Mostra o resultado na hora.' },
              { icon: ScrollText, label: 'Registro', text: 'Todas as jogadas da partida, à direita (em telas menores, no botão Registro).' },
              { label: 'Fim', text: 'Ao acabar, a tela mostra o resultado. A partida fica no Histórico.' },
            ]}
            tip="Os termos da batalha (Cobertura, Protegido, Interceptar, Desgaste...) estão explicados no Guia."
          />
        ),
      },
    ],
  },

  historico: {
    id: 'historico',
    title: 'Histórico',
    summary: 'Suas últimas batalhas, com resumo, filtros e o detalhe de cada uma.',
    steps: [
      {
        title: 'O resumo',
        content: (
          <StepLayout
            lead="As suas últimas 50 batalhas contra a máquina. O topo resume o desempenho."
            visual={
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['Combates', '12', 'text-silver-bright'],
                  ['Vitórias', '8', 'text-success'],
                  ['Aproveitamento', '67%', 'text-silver-bright'],
                  ['Sequência', '3', 'text-success'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="hud-corners border border-line/60 bg-surface/60 p-3">
                    <MockLabel>{label}</MockLabel>
                    <p className={cn('font-mono text-2xl leading-none tabular-nums', tone)}>{value}</p>
                  </div>
                ))}
              </div>
            }
            points={[
              { label: 'Aproveitamento', text: 'A parte das batalhas que terminou em vitória.' },
              { label: 'Sequência', text: 'Quantos resultados iguais seguidos, contando da última batalha.' },
            ]}
          />
        ),
      },
      {
        title: 'Cada batalha',
        content: (
          <StepLayout
            lead="Abaixo do resumo, uma linha por batalha. A cor da borda é o resultado."
            visual={
              <div className="space-y-2">
                <Chips items={['Todas', 'Vitórias', 'Derrotas', 'Desistências']} />
                <ul className="space-y-1">
                  {[
                    ['Vitória', 'bg-success', 'text-success'],
                    ['Derrota', 'bg-danger', 'text-danger'],
                    ['Desistência', 'bg-line-strong', 'text-fg-muted'],
                  ].map(([result, bar, text]) => (
                    <li key={result} className="flex items-center gap-2 border border-line/60 bg-surface/60 py-1.5 pr-2">
                      <span className={cn('h-5 w-0.5', bar)} />
                      <span className={cn('w-20 font-display text-xs font-bold uppercase', text)}>{result}</span>
                      <span className="flex-1 text-xs text-fg-muted">vs Adversário</span>
                      <span className="font-mono text-[9px] text-fg-subtle">{difficultyLabels.ADVANCED}</span>
                    </li>
                  ))}
                </ul>
              </div>
            }
            points={[
              { icon: Filter, label: 'Filtros', text: 'Por resultado e, quando houver mais de uma, por dificuldade.' },
              { icon: MousePointerClick, label: 'Abrir', text: 'Clique na linha: esquadrão usado, rodadas, duração e como terminou cada personagem dos dois lados.' },
              { icon: Play, label: 'Em andamento', text: 'Uma batalha aberta aparece no topo, com o atalho para retomar.' },
            ]}
          />
        ),
      },
    ],
  },

  mercado: {
    id: 'mercado',
    title: 'Mercado',
    summary: 'Compre baús com a moeda das batalhas e troque fragmentos para aprimorar skills.',
    steps: [
      {
        title: 'Moeda e fragmentos',
        content: (
          <StepLayout
            lead="A carteira, no topo, tem a moeda (M) e os fragmentos de cada tipo. Os dois vêm do fim de toda batalha."
            visual={
              <div className="hud-corners flex flex-wrap items-center gap-4 border border-line/60 bg-surface/60 p-3 [--hud-color:var(--color-coin)]">
                <Coins value={1250} className="text-xl font-bold text-silver-bright" iconClassName="size-5" />
                <span className="flex flex-wrap gap-3 font-mono text-xs text-fg">
                  {(['ELEMENTAL', 'VECTORIAL', 'NONE'] as const).map((type, i) => (
                    <span key={type} className="flex items-center gap-1">
                      <FragmentIcon type={type} />
                      {[12, 4, 7][i]}
                      <span className="text-fg-subtle">{fragmentLabels[type]}</span>
                    </span>
                  ))}
                </span>
              </div>
            }
            points={[
              { icon: Coins3, label: 'Moeda', text: 'Vitória dá mais que derrota; adversário difícil rende mais. Repetir o mesmo adversário rende menos.' },
              { icon: Gem, label: 'Fragmentos', text: 'Um tipo por linhagem, mais o Neutro. Servem para aprimorar skills. Até 500 por tipo: o que passar vira moeda.' },
              { icon: Flag, label: 'Desistir', text: 'Desistir de uma batalha não dá nada.' },
            ]}
          />
        ),
      },
      {
        title: 'Comprar baús',
        content: (
          <StepLayout
            lead="Cada baú traz 1 item, da raridade sorteada, e alguns fragmentos. Baú de nível mais alto custa mais e dá mais chance de raridade alta."
            visual={
              <div className="flex items-end gap-3">
                {(['E', 'D', 'C'] as const).map((tier) => (
                  <MockCard key={tier} className="flex flex-1 flex-col items-center gap-1" active={tier === 'D'}>
                    <ChestArt tier={tier} className="h-10 w-12" />
                    <span className={cn('font-display text-lg font-extrabold italic', rarityTone[tier].text)}>Baú {tier}</span>
                  </MockCard>
                ))}
              </div>
            }
            points={[
              { icon: Package, label: 'O item', text: 'Um personagem da raridade sorteada. Se você já tem, ou se não houver nenhum dessa raridade, vira moeda.' },
              { icon: Percent, label: 'Chances', text: 'Cada baú mostra a chance de cada raridade, e abaixo estão os personagens que ainda faltam no seu elenco.' },
              { icon: Store, label: 'Depois', text: 'O baú comprado chega fechado na tela Baús.' },
            ]}
          />
        ),
      },
      {
        title: 'Trocar fragmentos',
        content: (
          <StepLayout
            lead="Escolha o tipo na lista e a quantidade. Comprar custa bem mais do que vender rende."
            visual={
              <div className="flex gap-2">
                <MockButton>Comprar</MockButton>
                <MockButton variant="secondary">Vender</MockButton>
              </div>
            }
            points={[
              { icon: Sparkles, label: 'Para quê', text: 'O aprimoramento pede fragmentos da linhagem da skill. Compre o tipo que falta, venda o que sobra.' },
              { icon: Gem, label: 'Limite', text: 'Não dá para comprar além de 500 no tipo.' },
            ]}
          />
        ),
      },
    ],
  },

  baus: {
    id: 'baus',
    title: 'Baús',
    summary: 'Seus baús fechados, comprados ou caídos na batalha, e a abertura de cada um.',
    steps: [
      {
        title: 'Abrir um baú',
        content: (
          <StepLayout
            lead="Aqui ficam os baús fechados: os comprados no Mercado e os que caem no fim da batalha. Clique num para abrir."
            visual={
              <div className="flex items-center justify-center gap-4">
                <ChestArt tier="C" className="h-16 w-20" />
                <span className="font-mono text-fg-subtle">→</span>
                <ChestArt tier="C" open className="h-16 w-20" />
              </div>
            }
            points={[
              { icon: Sparkles, label: 'Personagem novo', text: 'Entra no seu elenco na hora, no nível 0. O atalho leva à ficha dele.' },
              { icon: Coins3, label: 'Repetido', text: 'Vira moeda, pelo valor da raridade.' },
              { icon: Gem, label: 'Fragmentos', text: 'Todo baú também traz fragmentos de tipo sorteado.' },
              { icon: Swords, label: 'Na batalha', text: 'O fim da batalha às vezes deixa um baú (na derrota, menos chance). No máximo um por batalha.' },
            ]}
          />
        ),
      },
    ],
  },

  conta: {
    id: 'conta',
    title: 'Minha conta',
    summary: 'Nome exibido, senha e sair.',
    steps: [
      {
        title: 'Minha conta',
        content: (
          <StepLayout
            lead="Os dados da sua conta. Você chega aqui pelo cartão com o seu nome, no pé da barra lateral."
            points={[
              { icon: UserRound, label: 'Perfil', text: 'O nome exibido, que aparece no lobby e na batalha. O usuário de login não muda.' },
              { icon: KeyRound, label: 'Senha', text: 'Informe a atual e a nova. Trocar a senha encerra a sessão nos outros aparelhos.' },
              { icon: LogOut, label: 'Sessão', text: 'Sair desta conta neste aparelho.' },
            ]}
          />
        ),
      },
    ],
  },
}

/** O tour do primeiro acesso: as telas nesta ordem. */
export const tourOrder: TutorialId[] = ['lobby', 'personagens', 'personagem', 'esquadroes', 'batalhar', 'batalha', 'historico']

/** Tutoriais listados no Guia (o de formação fica dentro de Esquadrões). */
export const guideTutorials: TutorialId[] = [
  'lobby',
  'personagens',
  'personagem',
  'esquadroes',
  'formacao',
  'batalhar',
  'batalha',
  'mercado',
  'baus',
  'historico',
  'conta',
]

/** Ícone de cada tutorial (lista do Guia). */
export const tutorialIcons: Record<TutorialId, LucideIcon> = {
  lobby: House,
  personagens: Users,
  personagem: UserRound,
  esquadroes: LayoutGrid,
  formacao: Grid3x3,
  batalhar: Swords,
  batalha: Crosshair,
  mercado: Store,
  baus: Package,
  historico: History,
  conta: KeyRound,
}
