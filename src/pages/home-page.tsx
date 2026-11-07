import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, History, LayoutGrid, Play, Sparkles, Swords, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { ArrowButton, Carousel } from '@/components/ui/carousel'
import { buttonClasses } from '@/components/ui/button-classes'
import { SectionTitle } from '@/components/layout/page'
import { BannerArt } from '@/components/layout/page-banner'
import { useMe } from '@/features/auth/auth-api'
import {
  classLabels,
  difficultyLabels,
  useBattles,
  useCharacters,
  useSkillOffers,
  useSquads,
  useTemplates,
  type BattleSummary,
  type Character,
  type Rarity,
} from '@/features/game/game-api'
import { rarityTone } from '@/features/economy/economy-labels'
import { CharacterPortrait, PortraitPop } from '@/features/game/character-art'
import { classIcons } from '@/features/game/class-icons'
import { battleOutcome, outcomeLabels, type BattleOutcome } from '@/features/game/game-labels'
import { TutorialButton } from '@/features/tutorial/tutorial-button'
import { cn } from '@/lib/cn'

/** Um destaque do carrossel do lobby: a arte de fundo (public/art; sem o arquivo, a grade em perspectiva) e o texto. */
type Slide = {
  key: string
  /** Nome curto no indicador. */
  name: string
  art: string
  eyebrow: string
  title: [string, string]
  text: ReactNode
  actions: ReactNode
}

export function HomePage() {
  const { data: account } = useMe()
  const characters = useCharacters()
  const squads = useSquads()
  const battles = useBattles()
  const offers = useSkillOffers()
  const templates = useTemplates()

  const finished = battles.data?.filter((b) => b.status === 'FINISHED') ?? []
  const inProgress = battles.data?.find((b) => b.status === 'IN_PROGRESS')
  const roster = [...(characters.data ?? [])].sort((a, b) => b.level - a.level)
  const hasSquad = !!squads.data?.length

  const primaryCta = inProgress
    ? { to: `/batalha/${inProgress.id}`, label: 'Retomar batalha' }
    : hasSquad
      ? { to: '/batalhar', label: 'Batalhar' }
      : { to: '/esquadroes', label: 'Montar esquadrão' }

  const slides: Slide[] = [
    {
      key: 'batalha',
      name: 'Batalha',
      art: '/art/lobby-batalha.jpg',
      eyebrow: 'Área de batalha',
      title: ['Domine', 'a grade'],
      text: (
        <>
          Bem-vindo, <span className="font-semibold text-fg">{account?.displayName}</span>. Não vence o mais forte: vence quem
          posiciona melhor. Leia o adversário e escolha cada jogada.
        </>
      ),
      actions: (
        <>
          <Link
            to={primaryCta.to}
            aria-disabled={squads.isPending || battles.isPending}
            className={buttonClasses({ size: 'lg', className: 'group' })}
          >
            <Swords className="size-5" />
            {primaryCta.label}
            <ArrowRight className="size-5 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <Link to="/historico" className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
            <History className="size-5" />
            Histórico
          </Link>
        </>
      ),
    },
    {
      key: 'esquadroes',
      name: 'Esquadrões',
      art: '/art/lobby-mascarado.jpg',
      eyebrow: 'Esquadrões',
      title: ['Monte', 'a formação'],
      text: 'Quatro personagens na grade 3x3. Quem segura a frente, quem age do fundo, quem protege quem: a formação decide a batalha antes do primeiro golpe.',
      actions: (
        <Link to="/esquadroes" className={buttonClasses({ size: 'lg', className: 'group' })}>
          <LayoutGrid className="size-5" />
          {hasSquad ? `Esquadrões · ${squads.data!.length}` : 'Montar esquadrão'}
          <ArrowRight className="size-5 transition-transform duration-150 group-hover:translate-x-1" />
        </Link>
      ),
    },
    {
      key: 'personagens',
      name: 'Personagens',
      art: '/art/banner-lanca.jpg',
      eyebrow: 'Personagens',
      title: ['Evolua', 'o elenco'],
      text: 'Cada batalha dá experiência. A cada 5 níveis, um bloco de skill novo: escolha o que entra na build de cada personagem.',
      actions: (
        <>
          <Link to="/personagens" className={buttonClasses({ size: 'lg', className: 'group' })}>
            <Users className="size-5" />
            Ver personagens
            <ArrowRight className="size-5 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          {!!offers.data?.length && (
            <Link to={`/personagens/${offers.data[0].characterId}`} className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
              <Sparkles className="size-5" />
              {offers.data.length} {offers.data.length === 1 ? 'bloco' : 'blocos'} de skill
            </Link>
          )}
        </>
      ),
    },
  ]

  return (
    <div className="pb-12">
      {/* Lobby */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <LobbyHero slides={slides} />

        {/* Faixa de status, como os painéis de evento de um lobby */}
        <div className="relative mx-auto grid max-w-7xl gap-3 px-6 pb-10 md:grid-cols-3 lg:px-10">
          {inProgress ? (
            <StatusTile
              to={`/batalha/${inProgress.id}`}
              icon={Play}
              label="Batalha em andamento"
              tone="warning"
              title={`vs ${inProgress.opponent.name}`}
              detail={`${inProgress.rounds ? `Rodada ${inProgress.rounds} · ` : ''}${difficultyLabels[inProgress.opponent.difficulty]}`}
            />
          ) : (
            <StatusTile
              to="/batalhar"
              icon={Swords}
              label="Contra a máquina"
              title="Escolher adversário"
              detail="5 dificuldades · do Iniciante ao Grão-mestre"
            />
          )}
          <StatusTile
            // a escolha é na ficha: vai para o primeiro personagem da fila
            to={offers.data?.[0] ? `/personagens/${offers.data[0].characterId}` : '/personagens'}
            icon={Sparkles}
            label="Blocos de skill"
            tone={offers.data?.length ? 'primary' : undefined}
            title={offers.data?.length ? `${offers.data.length} para escolher` : 'Nenhum pendente'}
            detail="A cada 5 níveis, 1 skill nova"
          />
          <StatusTile
            to="/esquadroes"
            icon={LayoutGrid}
            label="Esquadrões"
            tone={squads.data?.length === 0 ? 'primary' : undefined}
            title={squads.data?.length ? `${squads.data.length} montados` : 'Monte o primeiro'}
            detail="4 personagens na grade 3x3"
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-6 pt-10 lg:px-10">
        {/* Elenco */}
        <section className="space-y-5">
          <SectionTitle
            index="01"
            actions={
              <Link to="/personagens" className="focus-ring group flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-primary-soft">
                Ver elenco <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          >
            Elenco
          </SectionTitle>
          <Carousel label="Elenco" viewportClassName="-mt-10 pt-12">
            {characters.isPending
              ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-72 w-48 animate-pulse bg-raised" />)
              : roster.map((character) => (
                  <RosterCard
                    key={character.id}
                    character={character}
                    rarity={templates.data?.find((t) => t.key === character.templateKey)?.rarity}
                    offers={offers.data?.filter((o) => o.characterId === character.id).length ?? 0}
                  />
                ))}
          </Carousel>
        </section>

        {/* Registro de batalhas */}
        <section className="space-y-5">
          <SectionTitle
            index="02"
            actions={
              <Link to="/historico" className="focus-ring group flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-primary-soft">
                Histórico <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          >
            Registro de combate
          </SectionTitle>
          {battles.isPending ? (
            <div className="h-40 animate-pulse bg-raised" />
          ) : finished.length === 0 ? (
            <EmptyLog />
          ) : (
            <BattleLog battles={finished.slice(0, 6)} form={finished.slice(0, 10)} />
          )}
        </section>
      </div>
    </div>
  )
}

/** Entrada em cascata do texto do slide: cada parte com um atraso maior; a saída é imediata e junta. */
const enterDelays = ['delay-0', 'delay-75', 'delay-150', 'delay-200', 'delay-300']
function enter(current: boolean, step: number) {
  return cn(
    'transition-all ease-out-soft motion-reduce:transition-none',
    current ? `translate-x-0 opacity-100 duration-700 ${enterDelays[step]}` : '-translate-x-6 opacity-0 duration-300',
  )
}

/**
 * Carrossel de destaques no topo do lobby: a arte de fundo troca com fade, o texto desliza. Passa sozinho (a barra do
 * slide enche e, no fim, vai para o próximo); pausa com o mouse ou o foco em cima e não roda com movimento reduzido.
 * Setas, indicadores, ← → no teclado e arrastar no touch.
 */
function LobbyHero({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const swipeStart = useRef<number | null>(null)
  const go = (next: number) => setIndex((next + slides.length) % slides.length)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') go(index - 1)
    if (event.key === 'ArrowRight') go(index + 1)
  }

  return (
    <>
      <LobbyBackdrop arts={slides.map((s) => s.art)} index={index} />

      <div
        role="region"
        aria-roledescription="carrossel"
        aria-label="Destaques"
        className="relative mx-auto max-w-7xl touch-pan-y px-6 pt-12 pb-8 lg:px-10 lg:pt-16"
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={(e) => (swipeStart.current = e.pointerType === 'mouse' ? null : e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current == null) return
          const delta = e.clientX - swipeStart.current
          swipeStart.current = null
          if (Math.abs(delta) > 50) go(index + (delta < 0 ? 1 : -1))
        }}
      >
        <TutorialButton id="lobby" className="absolute top-4 right-6 z-10 lg:top-6 lg:right-10" />

        {/* todos os slides na mesma célula: a altura é a do maior, nada pula ao trocar */}
        <div className="grid">
          {slides.map((slide, i) => {
            const current = i === index
            return (
              <div
                key={slide.key}
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${slides.length}: ${slide.name}`}
                aria-hidden={!current}
                inert={!current}
                className={cn('flex flex-col justify-center [grid-area:1/1]', !current && 'pointer-events-none')}
              >
                {/* cada parte entra em cascata (o atraso só na entrada; a saída é junta) */}
                <div className={cn(enter(current, 0), 'flex flex-wrap items-center gap-3')}>
                  <Badge tone="primary">Temporada 0</Badge>
                  <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">
                    <span className={cn('h-px bg-primary transition-all duration-700 ease-out-soft', current ? 'w-6' : 'w-0')} />
                    {slide.eyebrow}
                  </span>
                </div>

                <h1 className="mt-5 font-display text-7xl leading-[0.85] font-extrabold uppercase italic text-silver-bright sm:text-8xl xl:text-9xl">
                  <span className={cn(enter(current, 1), 'block')}>{slide.title[0]}</span>
                  <span className={cn(enter(current, 2), 'block')}>
                    <span className="text-gradient-primary pr-3">{slide.title[1]}</span>
                  </span>
                </h1>

                <p className={cn(enter(current, 3), 'mt-6 max-w-md text-[15px] leading-relaxed text-fg-muted')}>{slide.text}</p>

                <div className={cn(enter(current, 4), 'mt-8 flex flex-wrap gap-3')}>{slide.actions}</div>
              </div>
            )
          })}
        </div>

        {/* indicadores: número, nome e a barra que enche até a troca; no hover, a barra acende um pouco */}
        <div className="mt-10 flex items-center gap-4">
          <div className="flex flex-1 gap-2 sm:gap-3">
            {slides.map((slide, i) => {
              const current = i === index
              return (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ir para ${slide.name}`}
                  aria-current={current}
                  className="focus-ring group w-20 py-1 text-left sm:w-36"
                >
                  <span className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                    <span className={cn('transition-colors', current ? 'text-primary-soft' : 'text-fg-subtle group-hover:text-primary-soft')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'hidden truncate transition-all duration-200 sm:inline',
                        current ? 'text-silver-bright' : 'text-fg-subtle group-hover:translate-x-0.5 group-hover:text-fg',
                      )}
                    >
                      {slide.name}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'relative mt-2 block h-[3px] -skew-x-12 overflow-hidden transition-all duration-200',
                      current ? 'bg-line-strong' : 'bg-line-strong/70 group-hover:h-1 group-hover:bg-line-strong',
                    )}
                  >
                    {!current && (
                      <span className="absolute inset-y-0 left-0 w-0 bg-primary/40 transition-all duration-300 ease-out-soft group-hover:w-1/3" />
                    )}
                    {current && (
                      <span
                        key={index}
                        className={cn(
                          'block h-full origin-left bg-primary shadow-[0_0_8px_var(--color-primary)] motion-safe:animate-slide-progress',
                          paused && '[animation-play-state:paused]',
                        )}
                        onAnimationEnd={() => go(index + 1)}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <ArrowButton direction="prev" disabled={false} onClick={() => go(index - 1)} />
            <ArrowButton direction="next" disabled={false} onClick={() => go(index + 1)} />
          </div>
        </div>
      </div>
    </>
  )
}

// Fundo do lobby: a arte do slide (se existir) ou grade 3x3 em perspectiva, brilho roxo, quadriculado e palavra vazada.
function LobbyBackdrop({ arts, index }: { arts: string[]; index: number }) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const artLoaded = !!loaded[arts[index]]

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-bg">
      {arts.map((art, i) => (
        // a arte inteira, sem recorte; só a do slide atual aparece
        <BannerArt
          key={art}
          src={art}
          loaded={i === index && !!loaded[art]}
          onLoad={() => setLoaded((l) => ({ ...l, [art]: true }))}
          // aproxima devagar enquanto o slide está na tela (recomeça a cada volta)
          className={cn('origin-right', i === index && 'motion-safe:animate-kenburns')}
        />
      ))}
      {/* Sem arte: grade em perspectiva e quadriculado. Com arte: só o necessário para o texto ficar legível. */}
      {!artLoaded && <PerspectiveFormation />}
      {!artLoaded && <div className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent_85%)]" />}
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgb(139_92_246/0.14),transparent_70%)]" />
      <div
        className={cn(
          'absolute inset-0 bg-linear-to-r from-bg to-transparent',
          artLoaded ? 'via-bg/60 via-30% to-60%' : 'via-bg/85',
        )}
      />
      <div className="absolute inset-0 bg-linear-to-t from-bg to-transparent to-20%" />
      <div className="absolute inset-0 scanlines" />
      <span className="absolute -bottom-10 -left-4 font-display text-[16rem] leading-none font-extrabold italic text-outline select-none">
        ORIGIN
      </span>
    </div>
  )
}

const allyLit = [0, 4, 5, 7]
const enemyLit = [1, 3, 4, 8]

function PerspectiveFormation() {
  const grid = (lit: number[], side: 'ally' | 'enemy') => (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'size-24 border',
            lit.includes(i)
              ? side === 'ally'
                ? 'border-primary-soft/70 bg-primary/25 shadow-[0_0_40px_rgb(139_92_246/0.6)]'
                : 'border-enemy/60 bg-enemy/15 shadow-[0_0_30px_rgb(229_72_77/0.4)]'
              : 'border-silver/15 bg-white/[0.02]',
          )}
        />
      ))}
    </div>
  )

  return (
    <div className="absolute top-1/2 right-[-6%] hidden -translate-y-1/2 lg:block">
      <div
        className="flex gap-16"
        style={{ transform: 'perspective(1400px) rotateX(58deg) rotateZ(-32deg)', transformStyle: 'preserve-3d' }}
      >
        {grid(allyLit, 'ally')}
        {grid(enemyLit, 'enemy')}
      </div>
    </div>
  )
}


function StatusTile({ to, icon: Icon, label, title, detail, tone }: {
  to: string
  icon: LucideIcon
  label: string
  title: string
  detail: string
  tone?: 'primary' | 'warning'
}) {
  // cor do cartão: alerta (batalha aberta), roxo (algo pede ação) ou prata (informativo)
  const color = tone === 'warning' ? 'var(--color-warning)' : tone === 'primary' ? 'var(--color-primary-soft)' : 'var(--color-silver)'

  return (
    <Link
      to={to}
      style={{ '--tone': color } as CSSProperties}
      className={cn(
        'focus-ring chamfer group relative flex items-center gap-4 overflow-hidden p-4 pr-5 [--cut:14px]',
        'backdrop-blur-sm transition-transform duration-300 ease-out-soft hover:-translate-y-1',
        tone
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_10%,rgb(18_18_22/0.88))] [--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]'
          : '[--chamfer-bg:rgb(18_18_22/0.85)] [--chamfer-border:var(--color-line)]',
        'hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_85%,transparent)]',
      )}
    >
      {/* brilho do canto, ícone gigante ao fundo e a linha que corre na base no hover */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_0%_50%,color-mix(in_srgb,var(--tone)_14%,transparent),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Icon className="pointer-events-none absolute -right-3 -bottom-5 size-24 -rotate-12 text-(--tone) opacity-[0.04] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.1]" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-linear-to-r from-(--tone) to-transparent transition-transform duration-500 ease-out-soft group-hover:scale-x-100" />

      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span
          className={cn(
            'absolute inset-1.5 rotate-45 border transition-all duration-300 ease-out-soft group-hover:rotate-135',
            tone ? 'border-(--tone)/60 bg-(--tone)/10 shadow-[0_0_16px_-6px_var(--tone)]' : 'border-line-strong bg-bg/60 group-hover:border-(--tone)/50',
          )}
        />
        <Icon className={cn('relative size-4.5 transition-colors', tone ? 'text-(--tone)' : 'text-fg-muted group-hover:text-silver-bright')} />
      </span>

      <div className="relative min-w-0 flex-1">
        <p className={cn('flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]', tone === 'warning' ? 'text-warning' : 'text-fg-subtle')}>
          {tone && <span className="inline-block size-1.5 animate-pulse rounded-pill bg-(--tone) shadow-[0_0_6px_var(--tone)]" />}
          {label}
        </p>
        <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg transition-colors group-hover:text-silver-bright">{title}</p>
        <p className="truncate text-xs text-fg-muted">{detail}</p>
      </div>

      <span className="relative flex size-7 shrink-0 items-center justify-center border border-transparent transition-all duration-200 group-hover:border-(--tone)/40 group-hover:bg-(--tone)/10">
        <ChevronRight className="size-4 text-fg-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-(--tone)" />
      </span>
    </Link>
  )
}

function RosterCard({ character, rarity, offers }: {
  character: Character
  rarity?: Rarity
  /** Blocos de skill esperando a escolha. */
  offers: number
}) {
  const ClassIcon = classIcons[character.characterClass]
  const progress = character.xpToNextLevel ? Math.min(100, (character.xp / character.xpToNextLevel) * 100) : 100
  const [first, ...rest] = character.name.split(' ')

  const tone = rarity ? rarityTone[rarity].color : 'var(--color-line-strong)'
  const xp = character.xpToNextLevel ? `${character.xp} / ${character.xpToNextLevel} XP` : 'Nível máximo'

  return (
    <Link
      to={`/personagens/${character.id}`}
      aria-label={`${character.name}, ${classLabels[character.characterClass]}, nível ${character.level}${offers ? `, ${offers} ${offers === 1 ? 'bloco' : 'blocos'} de skill` : ''}`}
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'focus-ring chamfer group flex h-72 w-48 flex-col justify-end p-4 [--cut:16px] hover:z-10 focus-visible:z-10',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        'transition-all duration-200 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:rgb(167_139_250/0.7)]',
        'hover:drop-shadow-[0_10px_24px_rgb(139_92_246/0.35)]',
      )}
    >
      {/* Retrato de fundo do card inteiro (recortado no chanfro); o texto fica embaixo, sobre o degradê */}
      <div className="pointer-events-none absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
        <div className="absolute inset-x-6 top-8 bottom-20 rounded-pill bg-primary/10 blur-2xl transition-colors group-hover:bg-primary/25" />
        <CharacterPortrait
          templateKey={character.templateKey}
          characterClass={character.characterClass}
          zoom={1.9}
          hideOnHover
          className="size-full"
          iconClassName="size-14 text-silver/30 transition-colors group-hover:text-primary-soft"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/85 via-25% to-transparent to-55%" />
        {/* raridade: só uma linha fina no topo, na cor dela */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-(--tone) opacity-70 shadow-[0_0_10px_var(--tone)] transition-opacity group-hover:opacity-100" />
      </div>
      {/* no hover, o personagem cresce e sai do card */}
      <PortraitPop templateKey={character.templateKey} />

      {/* bloco de skill esperando a escolha: só um ícone no canto */}
      {offers > 0 && (
        <span
          title={`${offers} ${offers === 1 ? 'bloco' : 'blocos'} de skill para escolher`}
          className="chamfer absolute top-3 right-3 flex size-6 items-center justify-center [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] [--cut:5px] shadow-[0_0_14px_-2px_var(--color-primary)]"
        >
          <Sparkles className="size-3.5 text-on-primary motion-safe:animate-pulse" />
        </span>
      )}

      <div className="relative space-y-2.5">
        {/* classe e raridade numa linha só */}
        <p className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
          <span className="flex items-center gap-1 transition-colors group-hover:text-fg-muted">
            <ClassIcon className="size-3" />
            {classLabels[character.characterClass]}
          </span>
          {rarity && <span className="font-display text-sm font-extrabold not-italic tracking-normal text-(--tone)">{rarity}</span>}
        </p>

        <p className="font-display text-2xl leading-[0.95] font-extrabold uppercase italic text-silver-bright">
          {first}
          {/* linha do sobrenome sempre reservada: o LV fica alinhado em todos os cards */}
          <span className="block min-h-lh text-sm font-semibold not-italic tracking-wide text-fg-muted">{rest.join(' ')}</span>
        </p>

        <div className="flex items-center gap-2" title={xp}>
          <span className="font-mono text-[10px] text-primary-soft">LV {character.level}</span>
          <div className="h-0.75 flex-1 -skew-x-12 bg-overlay transition-all duration-200 group-hover:h-1">
            <div className="h-full bg-gradient-primary transition-shadow group-hover:shadow-[0_0_8px_var(--color-primary)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Cor de cada resultado (vitória verde, derrota vermelha, desistência apagada). */
const outcomeColor: Record<BattleOutcome, string> = {
  WIN: 'var(--color-success)',
  LOSS: 'var(--color-danger)',
  ABANDON: 'var(--color-fg-subtle)',
}

/**
 * Registro de combate do lobby: a forma recente (as últimas batalhas como segmentos, da mais antiga à mais nova) e as
 * linhas das últimas 6, que acendem na cor do resultado e levam ao Histórico.
 */
function BattleLog({ battles, form }: { battles: BattleSummary[]; form: BattleSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const wins = form.filter((b) => battleOutcome(b) === 'WIN').length

  return (
    <div className="space-y-4">
      {/* forma recente */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Forma recente · <span className="text-success">{wins}V</span> <span className="text-danger">{form.length - wins}D</span>
        </p>
        <ul className="flex flex-1 gap-1" aria-label={`Últimas ${form.length} batalhas: ${wins} vitórias`}>
          {[...form].reverse().map((battle) => {
            const outcome = battleOutcome(battle)
            return (
              <li
                key={battle.id}
                title={`${outcomeLabels[outcome]} vs ${battle.opponent.name}`}
                style={{ '--tone': outcomeColor[outcome] } as CSSProperties}
                className={cn(
                  'h-2 max-w-12 flex-1 -skew-x-12 bg-(--tone) transition-all duration-200',
                  hovered && hovered !== battle.id ? 'opacity-25' : 'opacity-80',
                  hovered === battle.id && 'scale-y-150 opacity-100 shadow-[0_0_10px_var(--tone)]',
                )}
              />
            )
          })}
        </ul>
      </div>

      <ul className="divide-y divide-line/70 border border-line bg-surface/60" onMouseLeave={() => setHovered(null)}>
        {battles.map((battle) => {
          const outcome = battleOutcome(battle)
          return (
            <li key={battle.id} onMouseEnter={() => setHovered(battle.id)}>
              <Link
                to="/historico"
                style={{ '--tone': outcomeColor[outcome] } as CSSProperties}
                className="focus-ring group relative grid grid-cols-[8rem_1fr_auto] items-center gap-4 overflow-hidden py-3 pr-4 pl-4 transition-colors sm:grid-cols-[9rem_1fr_9rem_4rem_7rem_1rem]"
                onFocus={() => setHovered(battle.id)}
              >
                {/* luz na cor do resultado, que entra pela esquerda no hover */}
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-linear-to-r from-(--tone)/12 to-transparent transition-transform duration-500 ease-out-soft group-hover:translate-x-0" />
                <span className="relative flex items-center gap-2.5 font-display text-lg font-bold uppercase italic text-(--tone)">
                  <span className="h-5 w-0.75 bg-(--tone) transition-all duration-200 group-hover:h-7 group-hover:shadow-[0_0_10px_var(--tone)]" />
                  {outcomeLabels[outcome]}
                </span>
                <span className="relative truncate text-sm font-medium text-fg transition-colors group-hover:text-silver-bright">{battle.opponent.name}</span>
                <span className="relative hidden text-sm text-fg-muted sm:block">{difficultyLabels[battle.opponent.difficulty]}</span>
                <span className="relative hidden text-right font-mono text-xs text-fg-muted tabular-nums sm:block">R{battle.rounds}</span>
                <span className="relative text-right font-mono text-xs text-fg-subtle tabular-nums">
                  {battle.finishedAt ? dateFormat.format(new Date(battle.finishedAt)) : '—'}
                </span>
                <ChevronRight className="relative hidden size-4 -translate-x-1 text-(--tone) opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EmptyLog() {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-14 text-center">
      <Swords className="size-6 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhum combate registrado</p>
      <p className="text-sm text-fg-muted">Sua primeira batalha aparece aqui.</p>
      <Link to="/batalhar" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-2' })}>
        Primeira batalha
      </Link>
    </div>
  )
}
