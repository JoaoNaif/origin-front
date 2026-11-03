import { useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Page, PageHeader, SectionTitle } from '@/components/layout/page'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, type CharacterClass, type StatusType } from '@/features/game/game-api'
import { classAuras, statLabels, statOrder, statShort, statusLabels } from '@/features/game/game-labels'
import { battleTerms, statInfo, statusDetails, statusShort, statusTone } from '@/features/game/glossary'
import { statusEffects } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

const sections = [
  { id: 'atributos', label: 'Atributos' },
  { id: 'status', label: 'Status' },
  { id: 'classes', label: 'Classes' },
  { id: 'batalha', label: 'Batalha' },
]

const statusOrder = Object.keys(statusLabels) as StatusType[]
const classOrder = Object.keys(classAuras) as CharacterClass[]

/** Guia do jogador: o que cada atributo, status, classe e termo da batalha quer dizer (texto de `glossary.ts`). */
export function GuidePage() {
  // âncora vinda de outro lugar (ex.: "O que cada atributo faz" no personagem)
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <Page>
      <PageHeader
        eyebrow="Manual de campo"
        title="Guia"
        description="Para que serve cada atributo, o que os status fazem e os termos que aparecem na batalha."
      />

      {/* atalhos para as seções */}
      <nav aria-label="Seções do guia" className="flex flex-wrap gap-2">
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="focus-ring chamfer flex items-center gap-2 px-3 py-1.5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line-strong)] [--cut:7px] hover:[--chamfer-border:rgb(167_139_250/0.6)]"
          >
            <span className="font-mono text-[10px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-display text-sm font-bold uppercase tracking-widest text-fg">{s.label}</span>
          </a>
        ))}
      </nav>

      <section id="atributos" className="scroll-mt-6 space-y-5">
        <SectionTitle index="01">Atributos</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {statOrder.map((stat) => (
            <div key={stat} className="hud-corners flex gap-4 border border-line/60 bg-surface/60 p-4">
              <span className="w-10 shrink-0 font-mono text-lg font-bold text-primary-soft">{statShort[stat]}</span>
              <div className="space-y-1">
                <p className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{statLabels[stat]}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{statInfo[stat]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="status" className="scroll-mt-6 space-y-5">
        <SectionTitle index="02">Status</SectionTitle>
        <p className="max-w-2xl text-sm text-fg-muted">
          Efeitos que as skills deixam no alvo. A chance de pegar é a base abaixo, disputada entre a Precisão de quem usa e a
          Vontade de quem recebe. A duração conta nos turnos de quem recebe.
        </p>
        <ul className="divide-y divide-line/60 border-y border-line/60">
          {statusOrder.map((status) => {
            const detail = statusDetails[status]
            return (
              <li key={status} className="grid gap-2 py-4 sm:grid-cols-[11rem_minmax(0,1fr)_9rem] sm:items-start sm:gap-6">
                <span className="flex items-center gap-2">
                  <span className={cn('px-1 font-mono text-[10px] font-bold', statusTone[status])}>{statusShort[status]}</span>
                  <span className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{statusLabels[status]}</span>
                </span>
                <span className="space-y-1">
                  <span className="block text-sm text-fg first-letter:uppercase">{statusEffects[status]}.</span>
                  {detail.note && <span className="block text-sm text-fg-muted">{detail.note}</span>}
                </span>
                <span className="flex gap-4 font-mono text-[11px] text-fg-subtle sm:flex-col sm:gap-0.5 sm:text-right">
                  <span>{detail.turns ? `${detail.turns} ${detail.turns === 1 ? 'turno' : 'turnos'}` : 'até a recarga'}</span>
                  <span>base {Math.round(detail.chance * 100)}%</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section id="classes" className="scroll-mt-6 space-y-5">
        <SectionTitle index="03">Classes e auras</SectionTitle>
        <p className="max-w-2xl text-sm text-fg-muted">
          Cada classe dá uma aura aos aliados vizinhos na grade (frente, trás e lados). Auras iguais não somam: a formação conta.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {classOrder.map((cls) => {
            const Icon = classIcons[cls]
            return (
              <div key={cls} className="chamfer space-y-2 p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:12px]">
                <p className="flex items-center gap-2">
                  <Icon className="size-4 text-primary-soft" />
                  <span className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{classLabels[cls]}</span>
                </p>
                <p className="text-sm leading-relaxed text-fg-muted">{classAuras[cls]}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="batalha" className="scroll-mt-6 space-y-5">
        <SectionTitle index="04">Termos da batalha</SectionTitle>
        <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {battleTerms.map((t) => (
            <div key={t.term} className="border-l-2 border-primary/50 pl-4">
              <dt className="font-display text-base font-bold uppercase tracking-wide text-silver-bright">{t.term}</dt>
              <dd className="text-sm leading-relaxed text-fg-muted">{t.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
        <BookOpen className="size-3.5" /> Os números exatos de cada jogada aparecem na prévia da batalha.
      </p>
    </Page>
  )
}
