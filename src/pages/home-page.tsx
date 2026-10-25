import { useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, LayoutGrid, Play, Sparkles, Swords, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Carousel } from '@/components/ui/carousel'
import { buttonClasses } from '@/components/ui/button-classes'
import { SectionTitle } from '@/components/layout/page'
import { useMe } from '@/features/auth/auth-api'
import {
  classLabels,
  difficultyLabels,
  useBattles,
  useCharacters,
  useSkillOffers,
  useSquads,
  type BattleSummary,
  type Character,
} from '@/features/game/game-api'
import { CharacterPortrait, PortraitPop } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

/** Arte de fundo do lobby (public/art). Sem o arquivo, entra a grade em perspectiva. */
const LOBBY_ART = '/art/lobby-mascarado.jpg'

export function HomePage() {
  const { data: account } = useMe()
  const characters = useCharacters()
  const squads = useSquads()
  const battles = useBattles()
  const offers = useSkillOffers()

  const finished = battles.data?.filter((b) => b.status === 'FINISHED') ?? []
  const inProgress = battles.data?.find((b) => b.status === 'IN_PROGRESS')
  const roster = [...(characters.data ?? [])].sort((a, b) => b.level - a.level)
  const hasSquad = !!squads.data?.length

  const primaryCta = inProgress
    ? { to: `/batalha/${inProgress.id}`, label: 'Retomar batalha' }
    : hasSquad
      ? { to: '/batalhar', label: 'Batalhar' }
      : { to: '/esquadroes', label: 'Montar esquadrão' }

  return (
    <div className="pb-12">
      {/* Lobby */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <LobbyBackdrop />

        <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-8 lg:px-10 lg:pt-16">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="primary">Temporada 0</Badge>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">
                Formação. Leitura. Decisão.
              </span>
            </div>

            <h1 className="mt-5 font-display text-7xl leading-[0.85] font-extrabold uppercase italic text-silver-bright sm:text-8xl xl:text-9xl">
              Domine
              <br />
              <span className="text-gradient-primary pr-3">a grade</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-fg-muted">
              Bem-vindo, <span className="font-semibold text-fg">{account?.displayName}</span>. Não vence o mais forte: vence
              quem posiciona melhor. Monte a formação, leia o adversário e escolha cada jogada.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryCta.to}
                aria-disabled={squads.isPending || battles.isPending}
                className={buttonClasses({ size: 'lg', className: 'group' })}
              >
                <Swords className="size-5" />
                {primaryCta.label}
                <ArrowRight className="size-5 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
              <Link to="/esquadroes" className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
                <LayoutGrid className="size-5" />
                Esquadrões
              </Link>
            </div>
          </div>
        </div>

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
              : roster.map((character, i) => <RosterCard key={character.id} character={character} index={i + 1} />)}
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
            <BattleLog battles={finished.slice(0, 6)} />
          )}
        </section>
      </div>
    </div>
  )
}

// Fundo do lobby: arte (se existir) ou grade 3x3 em perspectiva, brilho roxo, quadriculado e palavra gigante vazada.
function LobbyBackdrop() {
  const [artLoaded, setArtLoaded] = useState(false)

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-bg">
      <img
        src={LOBBY_ART}
        alt=""
        onLoad={() => setArtLoaded(true)}
        onError={(e) => (e.currentTarget.hidden = true)}
        className={cn(
          // ancorada no topo: a cabeça do personagem fica no alto da arte e não pode ser cortada
          'absolute inset-y-0 right-0 h-full w-full object-cover object-[right_top] transition-opacity duration-700 ease-out-soft lg:w-3/4',
          artLoaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* Sem arte: grade em perspectiva e quadriculado. Com arte: só o necessário para o texto ficar legível. */}
      {!artLoaded && <PerspectiveFormation />}
      {!artLoaded && <div className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent_85%)]" />}
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgb(139_92_246/0.14),transparent_70%)]" />
      <div
        className={cn(
          'absolute inset-0 bg-linear-to-r from-bg to-transparent',
          artLoaded ? 'via-bg/60 via-40%' : 'via-bg/85',
        )}
      />
      <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
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
  return (
    <Link
      to={to}
      className={cn(
        'focus-ring chamfer group flex items-center gap-4 p-4 [--cut:14px]',
        'backdrop-blur-sm transition-all duration-150 ease-out-soft',
        tone === 'warning'
          ? '[--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)]'
          : tone === 'primary'
            ? '[--chamfer-bg:rgb(34_26_61/0.85)] [--chamfer-border:rgb(139_92_246/0.5)]'
            : '[--chamfer-bg:rgb(18_18_22/0.85)] [--chamfer-border:var(--color-line)]',
        'hover:[--chamfer-border:rgb(167_139_250/0.7)]',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center border',
          tone === 'warning' ? 'border-warning/40 text-warning' : 'border-line-strong text-primary-soft',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('font-mono text-[10px] uppercase tracking-[0.18em]', tone === 'warning' ? 'text-warning' : 'text-fg-subtle')}>
          {tone === 'warning' && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-pill bg-warning align-middle" />}
          {label}
        </p>
        <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg">{title}</p>
        <p className="truncate text-xs text-fg-muted">{detail}</p>
      </div>
      <ChevronRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary-soft" />
    </Link>
  )
}

function RosterCard({ character, index }: { character: Character; index: number }) {
  const progress = character.xpToNextLevel ? Math.min(100, (character.xp / character.xpToNextLevel) * 100) : 100
  const [first, ...rest] = character.name.split(' ')

  return (
    <Link
      to={`/personagens/${character.id}`}
      className={cn(
        'focus-ring chamfer group flex h-72 w-48 flex-col justify-between p-4 [--cut:16px] hover:z-10 focus-visible:z-10',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        'transition-all duration-200 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:rgb(167_139_250/0.7)]',
        'hover:drop-shadow-[0_10px_24px_rgb(139_92_246/0.35)]',
      )}
    >
      {/* Retrato de fundo do card inteiro (recortado no chanfro); o texto fica por cima, sobre o degradê */}
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
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/60 via-30% to-transparent to-60%" />
        <div className="absolute inset-x-0 top-0 h-12 bg-linear-to-b from-surface/80 to-transparent" />
      </div>
      {/* no hover, o personagem cresce e sai do card */}
      <PortraitPop templateKey={character.templateKey} />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-subtle">{String(index).padStart(2, '0')}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">{classLabels[character.characterClass]}</span>
      </div>

      <div className="relative space-y-2">
        <p className="font-display text-2xl leading-[0.95] font-extrabold uppercase italic text-silver-bright">
          {first}
          {/* linha do sobrenome sempre reservada: o LV fica alinhado em todos os cards */}
          <span className="block min-h-[1lh] text-base font-semibold not-italic text-fg-muted">{rest.join(' ')}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary-soft">LV {character.level}</span>
          <div className="h-[3px] flex-1 bg-overlay">
            <div className="h-full bg-gradient-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function BattleLog({ battles }: { battles: BattleSummary[] }) {
  return (
    <div className="overflow-x-auto border border-line bg-surface/60">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            <Th>Resultado</Th>
            <Th>Adversário</Th>
            <Th>Dificuldade</Th>
            <Th className="text-right">Rodadas</Th>
            <Th className="text-right">Data</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {battles.map((battle) => {
            const won = battle.winner === 'PLAYER'
            return (
              <tr key={battle.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="py-3 pr-4 pl-4">
                  <span className={cn('flex items-center gap-2.5 font-display text-lg font-bold uppercase italic', won ? 'text-success' : 'text-danger')}>
                    <span className={cn('h-5 w-[3px]', won ? 'bg-success' : 'bg-danger')} />
                    {won ? 'Vitória' : battle.endReason === 'ABANDON' ? 'Desistência' : 'Derrota'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-fg">{battle.opponent.name}</td>
                <td className="px-4 py-3 text-sm text-fg-muted">{difficultyLabels[battle.opponent.difficulty]}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted tabular-nums">R{battle.rounds}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-fg-subtle tabular-nums">
                  {battle.finishedAt ? dateFormat.format(new Date(battle.finishedAt)) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn('px-4 py-2.5 font-medium', className)}>{children}</th>
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
