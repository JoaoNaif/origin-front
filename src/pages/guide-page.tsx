import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronRight,
  Coins,
  Compass,
  Crosshair,
  Crown,
  Flame,
  GraduationCap,
  Grid3x3,
  Play,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  type LucideIcon,
} from 'lucide-react'
import { useGearRules, type GearLineage } from '@/features/gear/gear-api'
import { fmt, gradeColors, gradeLabels, lineageCostTarget, loseActionText, passiveLabels, passiveText, percentsText } from '@/features/gear/gear-labels'
import { GradeTag } from '@/features/gear/gear-ui'
import { fragmentTone } from '@/features/economy/economy-labels'
import { lineageLabels } from '@/features/game/game-labels'
import { useLocation } from 'react-router-dom'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, difficultyLabels, useDomRules, type AiDifficulty, type CharacterClass, type StatusType } from '@/features/game/game-api'
import { domLevelLabels, domPillarColors, domPillarIcons, domPillarLabels, domPillarThemes, domRoleLabels } from '@/features/game/dom-labels'
import { classAuras, statLabels, statOrder, statShort, statusLabels } from '@/features/game/game-labels'
import { awakeningTerms, battleTerms, domTerms, economyTerms, gearTerms, statInfo, statusDetails, statusShort, statusTone } from '@/features/game/glossary'
import { statusEffects } from '@/features/game/skill-text'
import { useTutorial } from '@/features/tutorial/tutorial-context'
import { guideTutorials, tutorialIcons, tutorials } from '@/features/tutorial/tutorials'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const GUIDE_ART = '/art/banner-guia.jpg'

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'tutoriais', label: 'Tutoriais', icon: GraduationCap },
  { id: 'atributos', label: 'Atributos', icon: Crosshair },
  { id: 'status', label: 'Status', icon: Sparkles },
  { id: 'classes', label: 'Classes', icon: Shield },
  { id: 'batalha', label: 'Batalha', icon: ScrollText },
  { id: 'dom', label: 'DOM', icon: Crown },
  { id: 'despertar', label: 'Despertar', icon: Flame },
  { id: 'equipamento', label: 'Equipamento', icon: Sword },
  { id: 'economia', label: 'Economia', icon: Coins },
]

const statusOrder = Object.keys(statusLabels) as StatusType[]
const classOrder = Object.keys(classAuras) as CharacterClass[]

/** Grupo do status pela cor da etiqueta (`statusTone`): controle, dano recebido ou os outros. */
type StatusGroup = 'ALL' | 'CONTROL' | 'DAMAGE' | 'OTHER'
const statusGroupOf = (status: StatusType): Exclude<StatusGroup, 'ALL'> =>
  statusTone[status].includes('warning') ? 'CONTROL' : statusTone[status].includes('danger') ? 'DAMAGE' : 'OTHER'
const statusColor = (status: StatusType) =>
  statusTone[status].includes('warning')
    ? 'var(--color-warning)'
    : statusTone[status].includes('danger')
      ? 'var(--color-danger)'
      : statusTone[status].includes('primary')
        ? 'var(--color-primary-soft)'
        : 'var(--color-success)'
const statusGroups: { value: StatusGroup; label: string; tone: string }[] = [
  { value: 'ALL', label: 'Todos', tone: 'var(--color-primary-soft)' },
  { value: 'CONTROL', label: 'Controle', tone: 'var(--color-warning)' },
  { value: 'DAMAGE', label: 'Dano recebido', tone: 'var(--color-danger)' },
  { value: 'OTHER', label: 'Outros', tone: 'var(--color-success)' },
]

/** Guia do jogador: o que cada atributo, status, classe, termo da batalha e da economia quer dizer (texto de `glossary.ts`). */
export function GuidePage() {
  // âncora vinda de outro lugar (ex.: "O que cada atributo faz" no personagem)
  const { hash } = useLocation()
  const { open, startTour } = useTutorial()
  const active = useActiveSection()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="pb-16">
      <PageBanner
        art={GUIDE_ART}
        outlineWord="Manual"
        meta={
          <>
            <Badge tone="primary">
              <BookOpen className="size-3" />
              Manual de campo
            </Badge>
            <BannerMeta>
              {sections.length} seções · {guideTutorials.length} tutoriais
            </BannerMeta>
          </>
        }
        title={
          <>
            Gu
            <span className="text-gradient-primary pr-3">ia</span>
          </>
        }
        description="Como cada tela funciona, para que serve cada atributo, o que os status fazem e os termos da batalha e da economia."
        actions={
          <Button size="lg" onClick={startTour} className="group">
            <Compass className="size-5 transition-transform duration-500 group-hover:rotate-180" />
            Fazer o tour
          </Button>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 pt-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-10">
        <SectionNav active={active} />

        <div className="min-w-0 space-y-16">
          {/* 01 Tutoriais */}
          <Section id="tutoriais" index="01" title="Tutoriais das telas" lead="Cada tela tem o seu passo a passo, também aberto pelo botão Tutorial no topo dela.">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <li className="sm:col-span-2 xl:col-span-3">
                <TourCard onStart={startTour} />
              </li>
              {guideTutorials.map((id, i) => {
                const { title, summary, steps } = tutorials[id]
                return (
                  <li key={id}>
                    <TutorialCard index={i + 1} icon={tutorialIcons[id]} title={title} summary={summary} steps={steps.length} onOpen={() => open(id)} />
                  </li>
                )
              })}
            </ul>
          </Section>

          {/* 02 Atributos */}
          <Section id="atributos" index="02" title="Atributos" lead="Os 7 números de cada personagem. Sobem com o nível e com os pontos livres que você distribui.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {statOrder.map((stat, i) => (
                <HoverCard key={stat} tone="var(--color-primary-soft)" watermark={statShort[stat]}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 min-w-12 items-center justify-center border border-(--tone)/50 bg-(--tone)/10 px-2 font-mono text-sm font-bold text-(--tone) transition-colors group-hover:bg-(--tone)/20">
                      {statShort[stat]}
                    </span>
                    <p className="flex-1 font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{statLabels[stat]}</p>
                    <span className="font-mono text-[10px] text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{statInfo[stat]}</p>
                </HoverCard>
              ))}
            </div>
          </Section>

          {/* 03 Status */}
          <Section
            id="status"
            index="03"
            title="Status"
            lead="Efeitos que as skills deixam no alvo. A chance de pegar é a base, disputada entre a Precisão de quem usa e a Vontade de quem recebe. A duração conta nos turnos de quem recebe."
          >
            <StatusList />
          </Section>

          {/* 04 Classes */}
          <Section
            id="classes"
            index="04"
            title="Classes e auras"
            lead="Cada classe dá uma aura aos aliados vizinhos na grade (frente, trás e lados). Auras iguais não somam: a formação conta. Passe o mouse para ver onde vale."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {classOrder.map((cls) => (
                <ClassCard key={cls} characterClass={cls} />
              ))}
            </div>
          </Section>

          {/* 05 Batalha */}
          <Section id="batalha" index="05" title="Termos da batalha" lead="O vocabulário da tela de batalha.">
            <TermGrid terms={battleTerms} tone="var(--color-primary-soft)" />
          </Section>

          {/* 06 DOM */}
          <Section id="dom" index="06" title="DOM" lead="Treino, não segredo: quatro pilares que sobem com feitos em batalha e caem quando você para.">
            <TermGrid terms={domTerms} tone="var(--color-dom-aura)" />
            <DomGuide />
          </Section>

          {/* 07 Despertar */}
          <Section id="despertar" index="07" title="Despertar" lead="A evolução secreta do poder, a partir do nível 80.">
            <TermGrid terms={awakeningTerms} tone="var(--color-warning)" />
          </Section>

          {/* 08 Equipamento */}
          <Section id="equipamento" index="08" title="Equipamento vivo" lead="Armas e armaduras que escolhem quem as usa. O elo decide se ajudam ou atrapalham.">
            <TermGrid terms={gearTerms} tone="var(--color-grade-king)" />
            <GearGuide />
          </Section>

          {/* 09 Economia */}
          <Section id="economia" index="09" title="Economia" lead="Moeda, fragmentos, baús e aprimoramento: o que você ganha e onde gasta.">
            <TermGrid terms={economyTerms} tone="var(--color-coin)" />
          </Section>

          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            <BookOpen className="size-3.5" /> Os números exatos de cada jogada aparecem na prévia da batalha.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Seção visível agora (para o índice): a mais alta que passou do terço de cima da tela. */
function useActiveSection() {
  const [active, setActive] = useState(sections[0].id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

/** Índice: fixo ao lado no desktop (com a seção atual acesa e a trilha de progresso); faixa rolável no mobile. */
function SectionNav({ active }: { active: string }) {
  const current = sections.findIndex((s) => s.id === active)

  return (
    <nav aria-label="Seções do guia" className="lg:sticky lg:top-6 lg:self-start">
      <p className="mb-3 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle lg:block">
        <span className="text-primary-soft">//</span> Índice
      </p>
      <ol className="relative flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {/* trilha: enche até a seção atual */}
        <span className="pointer-events-none absolute top-2 bottom-2 left-0 hidden w-px bg-line lg:block" />
        <span
          className="pointer-events-none absolute top-2 left-0 hidden w-px bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all duration-500 ease-out-soft lg:block"
          style={{ height: `calc(${((current + 1) / sections.length) * 100}% - 1rem)` }}
        />
        {sections.map((s, i) => {
          const isActive = s.id === active
          const Icon = s.icon
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'focus-ring chamfer group flex items-center gap-2.5 py-2 pr-3 pl-3 [--cut:8px] transition-all duration-200 lg:pl-4',
                  isActive
                    ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.12)] [--chamfer-border:rgb(167_139_250/0.5)]'
                    : 'text-fg-muted [--chamfer-bg:transparent] [--chamfer-border:transparent] hover:text-fg hover:[--chamfer-bg:var(--color-surface)] hover:[--chamfer-border:var(--color-line)] lg:hover:translate-x-1',
                )}
              >
                <span className={cn('font-mono text-[10px] transition-colors', isActive ? 'text-primary-soft' : 'text-fg-subtle group-hover:text-primary-soft')}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon className={cn('size-3.5 transition-colors', isActive ? 'text-primary-soft' : 'text-fg-subtle group-hover:text-fg-muted')} />
                <span className="font-display text-sm font-bold uppercase tracking-widest">{s.label}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Section({ id, index, title, lead, children }: { id: string; index: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-6">
      <header className="relative space-y-2 border-b border-line pb-4">
        <span className="pointer-events-none absolute -top-6 right-0 font-display text-8xl leading-none font-extrabold italic text-outline opacity-60 select-none">
          {index}
        </span>
        <h2 className="flex items-baseline gap-3 font-display text-4xl leading-none font-extrabold uppercase italic text-silver-bright">
          <span className="font-mono text-xs font-medium not-italic text-primary-soft">{index}</span>
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{lead}</p>
      </header>
      {children}
    </section>
  )
}

/** Cartão base do guia: chanfro com a cor em `--tone`, brilho e marca d'água que acordam no hover. */
function HoverCard({ tone, watermark, className, children }: { tone: string; watermark?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'chamfer group relative h-full overflow-hidden p-4 [--cut:14px]',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        'transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_65%,transparent)]',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_0%,color-mix(in_srgb,var(--tone)_14%,transparent),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {watermark && (
        <span className="pointer-events-none absolute -right-1 -bottom-4 font-display text-7xl leading-none font-extrabold italic text-(--tone) opacity-[0.05] transition-all duration-500 ease-out-soft select-none group-hover:-translate-x-1 group-hover:opacity-[0.12]">
          {watermark}
        </span>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}

function TourCard({ onStart }: { onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="focus-ring chamfer group relative flex w-full items-center gap-5 overflow-hidden p-5 text-left [--cut:18px] [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(167_139_250/0.45)] transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:var(--color-primary-soft)]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_50%,rgb(139_92_246/0.3),transparent)] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="pointer-events-none absolute inset-0 scanlines" />
      <Compass className="pointer-events-none absolute -right-6 -bottom-10 size-44 text-primary-soft opacity-[0.07] transition-transform duration-700 ease-out-soft group-hover:rotate-90" />

      <span className="relative flex size-14 shrink-0 items-center justify-center">
        <span className="absolute inset-2 rotate-45 border border-primary-soft/70 bg-primary/20 shadow-[0_0_20px_-4px_var(--color-primary)] transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
        <Play className="relative size-5 text-silver-bright" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-soft">Comece por aqui</span>
        <span className="block font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">Tour guiado</span>
        <span className="mt-1 block text-sm text-fg-muted">Passa pelas telas principais em sequência, explicando cada uma no lugar.</span>
      </span>
      <span className="relative hidden items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-soft sm:flex">
        Começar <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  )
}

function TutorialCard({ index, icon: Icon, title, summary, steps, onOpen }: {
  index: number
  icon: LucideIcon
  title: string
  summary: string
  steps: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring chamfer group relative flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-left [--cut:14px] [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:rgb(167_139_250/0.6)]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-linear-to-r from-primary/10 to-transparent transition-transform duration-500 ease-out-soft group-hover:translate-x-0" />
      <Icon className="pointer-events-none absolute -right-3 -bottom-4 size-20 -rotate-12 text-primary-soft opacity-[0.04] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.1]" />

      <span className="relative flex items-center gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <span className="absolute inset-1.5 rotate-45 border border-line-strong bg-bg/60 transition-all duration-300 ease-out-soft group-hover:rotate-135 group-hover:border-primary-soft/60 group-hover:bg-primary/10" />
          <Icon className="relative size-4 text-primary-soft" />
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{title}</span>
        <span className="font-mono text-[10px] text-fg-subtle">{String(index).padStart(2, '0')}</span>
      </span>
      <span className="relative flex-1 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{summary}</span>
      <span className="relative flex items-center gap-3">
        {/* um traço por passo */}
        <span className="flex flex-1 gap-0.5" aria-hidden>
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              className="h-1 max-w-6 flex-1 -skew-x-12 bg-overlay transition-colors duration-300 group-hover:bg-primary-soft"
              style={{ transitionDelay: `${i * 40}ms` }}
            />
          ))}
        </span>
        <span className="font-mono text-[10px] text-fg-subtle">
          {steps} {steps === 1 ? 'passo' : 'passos'}
        </span>
        <ChevronRight className="size-4 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-primary-soft" />
      </span>
    </button>
  )
}

function StatusList() {
  const [group, setGroup] = useState<StatusGroup>('ALL')
  const shown = statusOrder.filter((s) => group === 'ALL' || statusGroupOf(s) === group)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar status">
        {statusGroups.map((g) => {
          const count = g.value === 'ALL' ? statusOrder.length : statusOrder.filter((s) => statusGroupOf(s) === g.value).length
          const isActive = group === g.value
          return (
            <button
              key={g.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setGroup(g.value)}
              style={{ '--tone': g.tone } as CSSProperties}
              className={cn(
                'focus-ring chamfer group flex h-9 items-center gap-2 px-3.5 font-display text-sm font-semibold uppercase tracking-widest transition-all [--cut:8px]',
                isActive
                  ? 'text-silver-bright [--chamfer-bg:color-mix(in_srgb,var(--tone)_14%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_65%,transparent)]'
                  : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:text-fg hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_40%,var(--color-line))]',
              )}
            >
              <span className={cn('size-1.5 rotate-45 bg-(--tone)', isActive ? 'shadow-[0_0_6px_var(--tone)]' : 'opacity-50 group-hover:opacity-100')} />
              {g.label}
              <span className={cn('font-mono text-[10px]', isActive ? 'text-(--tone)' : 'text-fg-subtle')}>{count}</span>
            </button>
          )
        })}
      </div>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((status) => {
          const detail = statusDetails[status]
          return (
            <li key={status} className="motion-safe:animate-fade-in">
              <HoverCard tone={statusColor(status)} watermark={statusShort[status]}>
                <div className="flex items-center gap-2.5">
                  <span className={cn('px-1.5 py-0.5 font-mono text-[10px] font-bold', statusTone[status])}>{statusShort[status]}</span>
                  <span className="font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{statusLabels[status]}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-fg first-letter:uppercase">{statusEffects[status]}.</p>
                {detail.note && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{detail.note}</p>}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">Duração</p>
                    <p className="font-mono text-xs text-fg">{detail.turns ? `${detail.turns} ${detail.turns === 1 ? 'turno' : 'turnos'}` : 'até a recarga'}</p>
                  </div>
                  <div>
                    <p className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">
                      Chance base <span className="text-fg">{Math.round(detail.chance * 100)}%</span>
                    </p>
                    <span className="mt-1.5 block h-1 -skew-x-12 bg-overlay">
                      <span className="block h-full bg-(--tone) transition-shadow group-hover:shadow-[0_0_8px_var(--tone)]" style={{ width: `${detail.chance * 100}%` }} />
                    </span>
                  </div>
                </div>
              </HoverCard>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Onde a aura de cada classe vale, numa grade 3x3 (frente à direita, como na montagem): a classe no meio e os vizinhos
 * acesos. Executor vale sozinho; Artilharia no fundo da linha com alguém à frente. Só desenho: o texto vem de `classAuras`.
 */
function AuraGrid({ characterClass }: { characterClass: CharacterClass }) {
  // células na ordem da tela: linha a linha, da esquerda (fundo) para a direita (frente)
  const self = characterClass === 'ARTILLERY' ? 3 : 4
  const lit =
    characterClass === 'EXECUTOR' ? [] : characterClass === 'ARTILLERY' ? [4] : [1, 3, 5, 7]
  return (
    <span className="grid grid-cols-3 gap-0.5" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-3 border transition-all duration-300',
            i === self
              ? 'border-(--tone) bg-(--tone)'
              : lit.includes(i)
                ? characterClass === 'ARTILLERY'
                  ? 'border-silver/40 bg-silver/20'
                  : 'border-(--tone)/30 bg-(--tone)/5 group-hover:border-(--tone)/80 group-hover:bg-(--tone)/35 group-hover:shadow-[0_0_6px_var(--tone)]'
                : 'border-line bg-bg/40',
          )}
          style={lit.includes(i) ? { transitionDelay: `${lit.indexOf(i) * 60}ms` } : undefined}
        />
      ))}
    </span>
  )
}

function ClassCard({ characterClass }: { characterClass: CharacterClass }) {
  const Icon = classIcons[characterClass]
  return (
    <HoverCard tone="var(--color-primary-soft)">
      <Icon className="pointer-events-none absolute -top-2 -right-3 size-20 text-(--tone) opacity-[0.05] transition-all duration-500 ease-out-soft group-hover:rotate-12 group-hover:opacity-[0.12]" />
      <div className="flex items-start justify-between gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <span className="absolute inset-1.5 rotate-45 border border-(--tone)/50 bg-(--tone)/10 transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
          <Icon className="relative size-4 text-(--tone)" />
        </span>
        <AuraGrid characterClass={characterClass} />
      </div>
      <p className="mt-3 font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{classLabels[characterClass]}</p>
      <p className="mt-1 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{classAuras[characterClass]}</p>
      <p className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
        <Grid3x3 className="size-3" /> frente à direita
      </p>
    </HoverCard>
  )
}

function TermGrid({ terms, tone }: { terms: { term: string; text: string }[]; tone: string }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {terms.map((t, i) => (
        <div
          key={t.term}
          style={{ '--tone': tone } as CSSProperties}
          className="group relative border border-line/60 bg-surface/50 py-3 pr-4 pl-5 transition-all duration-200 hover:border-line-strong hover:bg-surface"
        >
          <span className="absolute inset-y-3 left-0 w-0.5 bg-(--tone)/50 transition-all duration-200 group-hover:inset-y-0 group-hover:w-0.75 group-hover:bg-(--tone) group-hover:shadow-[0_0_8px_var(--tone)]" />
          <dt className="flex items-baseline gap-2.5">
            <span className="font-mono text-[10px] text-fg-subtle transition-colors group-hover:text-(--tone)">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-display text-lg font-bold uppercase tracking-wide text-silver-bright">{t.term}</span>
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{t.text}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Passivas por linhagem e a régua dos graus do equipamento vivo, de `GET /gear-rules`. */
function GearGuide() {
  const rules = useGearRules()
  if (rules.isPending) return <div className="h-64 animate-pulse bg-raised" />
  if (!rules.data) return <p className="text-sm text-fg-subtle">Não foi possível carregar as regras do equipamento.</p>
  const r = rules.data.gearRules
  const pct = (n: number) => `${fmt(n * 100)}%`

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.entries(r.lineagePassives) as [GearLineage, (typeof r.lineagePassives)[GearLineage]][]).map(([lineage, passive]) => (
          <HoverCard key={lineage} tone={fragmentTone[lineage].color} watermark={lineageLabels[lineage]}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-(--tone)">{lineageLabels[lineage]}</p>
            <p className="font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{passiveLabels[passive.type]}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{passiveText(passive)}.</p>
            <p className="mt-2 font-mono text-[10px] text-fg-subtle">Custo do elo pleno no {lineageCostTarget[lineage]}</p>
          </HoverCard>
        ))}
      </div>

      <div className="hud-corners overflow-x-auto border border-line/60 bg-surface/60 [--hud-color:var(--color-line-strong)]">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
              <th className="px-4 py-2.5 font-normal">Grau</th>
              <th className="px-4 py-2.5 font-normal">Bônus</th>
              <th className="px-4 py-2.5 font-normal">Pede</th>
              <th className="px-4 py-2.5 font-normal">Custo pleno</th>
              <th className="px-4 py-2.5 font-normal">Parcial</th>
              <th className="px-4 py-2.5 font-normal">Sem elo</th>
              <th className="px-4 py-2.5 font-normal">Venda</th>
            </tr>
          </thead>
          <tbody>
            {r.grades.map((g) => (
              <tr key={g.grade} className="border-b border-line/50 align-top transition-colors last:border-0 hover:bg-white/[0.02]" style={{ '--tone': gradeColors[g.grade] } as CSSProperties}>
                <td className="px-4 py-2.5">
                  <GradeTag grade={g.grade} />
                  {g.rarity && <span className="mt-1 block font-mono text-[10px] text-fg-subtle">baú ≈ {g.rarity}</span>}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-fg tabular-nums">
                  +{fmt(g.statPercents.primary)}% / +{fmt(g.statPercents.secondary)}%
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{g.requirements}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{fmt(g.fullBondCostPercent)}%</td>
                {[g.partial, g.none].map((p, i) => (
                  <td key={i} className="px-4 py-2.5 text-xs text-fg-muted">
                    <span className="text-danger-hover">{percentsText(p.statPercents)}</span>
                    {p.loseAction && <span className="mt-0.5 block text-[11px] text-fg-subtle">{loseActionText(p.loseAction)}</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{g.saleValue === null ? 'não se vende' : `${fmt(g.saleValue)} M`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-fg-subtle">
        As passivas acima são as do {gradeLabels.KING} com elo pleno; cada grau multiplica ({r.grades.map((g) => `${gradeLabels[g.grade]} ×${fmt(g.passiveFactor)}`).join(' · ')}). Bônus e
        passiva valem {pct(r.bondFactor.FULL)} no pleno, {pct(r.bondFactor.PARTIAL)} no parcial e {pct(r.bondFactor.NONE)} sem elo. Personagem sem
        variante recebe o bônus de atributos ×{fmt(r.noVariantBonus)}. Inventário: {r.inventory.initial} espaços, +{r.inventory.step} por compra, até{' '}
        {r.inventory.max}.
      </p>
    </div>
  )
}

/** Os 4 pilares do DOM (stats, feitos por papel, skill única) e a régua dos níveis, de `GET /dom-rules`. */
function DomGuide() {
  const rules = useDomRules()
  if (rules.isPending) return <div className="h-64 animate-pulse bg-raised" />
  if (!rules.data) return <p className="text-sm text-fg-subtle">Não foi possível carregar as regras do DOM.</p>
  const r = rules.data
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {r.pillars.map((p) => {
          const Icon = domPillarIcons[p.pillar]
          return (
            <HoverCard key={p.pillar} tone={domPillarColors[p.pillar]} watermark={p.title}>
              <div className="flex items-start gap-3">
                <span className="relative flex size-11 shrink-0 items-center justify-center">
                  <span className="absolute inset-1.5 rotate-45 border border-(--tone)/70 bg-(--tone)/15 transition-transform duration-300 group-hover:rotate-135" />
                  <Icon className="relative size-4.5 text-(--tone)" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl leading-none font-extrabold uppercase italic text-silver-bright">{domPillarLabels[p.pillar]}</p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {domPillarThemes[p.pillar]} · {statLabels[p.primaryStat]} e {statLabels[p.secondaryStat]}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {p.feats.map((feat) => (
                  <li key={feat.role} className="text-[13px] leading-snug text-fg-muted">
                    <span className="mr-2 font-mono text-[10px] font-bold uppercase tracking-widest text-(--tone)">{domRoleLabels[feat.role]}</span>
                    {feat.description}.
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-l-2 border-(--tone) bg-(--tone)/8 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">Avançado · título e skill única</p>
                <p className="font-display text-lg leading-tight font-extrabold uppercase italic text-(--tone)">{p.uniqueSkill.name}</p>
                <p className="text-xs leading-snug text-fg-muted">{p.uniqueSkill.description}.</p>
              </div>
            </HoverCard>
          )
        })}
      </div>

      {/* a régua: pontos e bônus de cada nível */}
      <div className="hud-corners overflow-x-auto border border-line/60 bg-surface/60 [--hud-color:var(--color-line-strong)]">
        <table className="w-full min-w-120 text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
              <th className="px-4 py-2.5 font-normal">Nível</th>
              <th className="px-4 py-2.5 font-normal">Pontos</th>
              <th className="px-4 py-2.5 font-normal">Sem variante</th>
              <th className="px-4 py-2.5 font-normal">Bônus</th>
            </tr>
          </thead>
          <tbody>
            {r.levels.map((l) => (
              <tr key={l.level} className="border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 font-display font-bold uppercase tracking-wide text-silver-bright">{domLevelLabels[l.level]}</td>
                <td className="px-4 py-2.5 font-mono text-fg tabular-nums">{l.threshold}</td>
                <td className="px-4 py-2.5 font-mono text-fg-muted tabular-nums">{l.thresholdWithoutVariant}</td>
                <td className="px-4 py-2.5 text-fg-muted">
                  +{l.primaryPercent}% principal · +{l.secondaryPercent}% secundário
                  {l.level === 'ADVANCED' && ` · ${r.advancedRolePoints} pts em ${r.advancedRoles} papéis`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-fg-subtle">
        Janela de {r.window} de peso. A cada {r.checkEvery} de peso jogado, o pilar abaixo de {Math.round(r.lossShare * 100)}% dos pontos do
        nível atual cai um nível. Peso contra a máquina:{' '}
        {Object.entries(r.pveWeights)
          .map(([d, w]) => `${difficultyLabels[d as AiDifficulty] ?? d} ${fmt(w)}`)
          .join(' · ')}
        .
      </p>
    </div>
  )
}
