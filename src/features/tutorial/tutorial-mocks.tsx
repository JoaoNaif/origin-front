import { ArrowLeftRight, Footprints, LayoutGrid, Mountain, Plus, Shield, Sparkles, Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, difficultyLabels, type AiDifficulty, type CharacterClass } from '@/features/game/game-api'
import { statOrder, statShort } from '@/features/game/game-labels'
import { MockBar, MockButton, MockCard, MockGrid, MockLabel } from '@/features/tutorial/tutorial-kit'
import { cn } from '@/lib/cn'

// Miniaturas das telas usadas nos tutoriais (tutorials.tsx): desenhos com os tokens da tela real, sem dado de verdade.

export const ClassIcon = ({ c, className }: { c: CharacterClass; className?: string }) => {
  const Icon = classIcons[c]
  return <Icon className={cn('size-3.5', className)} />
}

export function StatusTiles() {
  const tiles = [
    { icon: Swords, label: 'Contra a máquina', title: 'Escolher adversário', primary: false },
    { icon: Sparkles, label: 'Blocos de skill', title: '2 para escolher', primary: true },
    { icon: LayoutGrid, label: 'Esquadrões', title: '1 montado', primary: false },
  ]
  return (
    <div className="grid gap-2">
      {tiles.map(({ icon: Icon, label, title, primary }) => (
        <MockCard key={label} active={primary} className="flex items-center gap-3">
          <span className={cn('flex size-8 items-center justify-center border', primary ? 'border-primary/50 text-primary-soft' : 'border-line-strong text-fg-muted')}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <MockLabel className={primary ? 'text-primary-soft' : undefined}>{label}</MockLabel>
            <span className="block font-display text-sm font-bold uppercase tracking-wide text-fg">{title}</span>
          </span>
        </MockCard>
      ))}
    </div>
  )
}

export function CharacterCardMock({ name = 'Nome', characterClass = 'GUARDIAN' as CharacterClass, badges }: { name?: string; characterClass?: CharacterClass; badges?: boolean }) {
  const stats = [42, 38, 25, 30, 18, 22]
  return (
    <MockCard className="space-y-3 p-4 [--cut:14px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-subtle">01</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          <ClassIcon c={characterClass} className="size-3" />
          {classLabels[characterClass]}
        </span>
      </div>
      <div className="relative flex h-16 items-center justify-center">
        <ClassIcon c={characterClass} className="size-10 text-silver/25" />
        {badges && (
          <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
            <Badge tone="primary">
              <Sparkles className="size-3" />1 bloco
            </Badge>
            <Badge tone="primary">+10 pts</Badge>
            <Badge tone="warning">Build 3/4</Badge>
          </div>
        )}
      </div>
      <p className="font-display text-2xl leading-none font-extrabold uppercase italic text-silver-bright">{name}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-primary-soft">LV 12</span>
        <MockBar value={60} className="h-0.75 flex-1" />
        <span className="font-mono text-[10px] text-fg-subtle">HP 640</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 border-t border-line/70 pt-2">
        {statOrder
          .filter((s) => s !== 'HP')
          .map((stat, i) => (
            <span key={stat} className="space-y-0.5 text-center">
              <span className="block font-mono text-[9px] text-fg-subtle">{statShort[stat]}</span>
              <span className="block font-mono text-xs text-fg tabular-nums">{stats[i]}</span>
            </span>
          ))}
      </div>
    </MockCard>
  )
}

export function Chips({ items, active = 0 }: { items: string[]; active?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={item}
          className={cn(
            'chamfer flex h-7 items-center px-2.5 font-display text-xs font-semibold uppercase tracking-widest [--cut:6px]',
            i === active
              ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.14)] [--chamfer-border:rgb(139_92_246/0.5)]'
              : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
          )}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function SkillMock({ name, kind, active, empty }: { name?: string; kind?: string; active?: boolean; empty?: boolean }) {
  if (empty) {
    return (
      <div className="flex h-16 items-center justify-center gap-1.5 border border-dashed border-line-strong font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
        <Plus className="size-3" /> Vazio
      </div>
    )
  }
  return (
    <MockCard active={active} className="flex h-16 flex-col justify-between">
      <MockLabel className={active ? 'text-primary-soft' : undefined}>{kind}</MockLabel>
      <span className="truncate font-display text-sm font-bold uppercase tracking-wide text-silver-bright">{name}</span>
    </MockCard>
  )
}

export function StatsPanelMock() {
  const values = [640, 42, 38, 25, 30, 18, 22]
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span>
          <MockLabel>Pontos livres</MockLabel>
          <span className="font-mono text-xl text-primary-soft tabular-nums">
            4<span className="text-sm text-fg-subtle"> / 10</span>
          </span>
        </span>
        <MockButton>Salvar</MockButton>
      </div>
      <ul className="space-y-1.5">
        {statOrder.map((stat, i) => (
          <li key={stat} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-2">
            <span className="font-mono text-[10px] text-fg-muted">{statShort[stat]}</span>
            <MockBar value={30 + ((i * 17) % 60)} tone="silver" />
            <span className="flex items-center gap-1 font-mono text-[10px] text-fg tabular-nums">
              <span className="flex size-4 items-center justify-center border border-line text-fg-subtle">−</span>
              <span className="w-7 text-center">{values[i]}</span>
              <span className={cn('flex size-4 items-center justify-center border', i === 1 ? 'border-primary-soft text-primary-soft' : 'border-line text-fg-subtle')}>+</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DifficultyMock() {
  const rows: AiDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
  return (
    <div className="space-y-3">
      {rows.map((difficulty, i) => (
        <div key={difficulty} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
          <span className="space-y-0.5">
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, j) => (
                <span key={j} className={cn('h-2.5 w-1 -skew-x-12', j <= i ? 'bg-danger-hover' : 'bg-overlay')} />
              ))}
            </span>
            <span className="block font-display text-xs font-bold uppercase tracking-wide text-fg">{difficultyLabels[difficulty]}</span>
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {['Equilibrado', 'Agressivo'].map((profile, j) => (
              <MockCard key={profile} tone="danger" active={i === 1 && j === 0} className="space-y-1 p-2 [--cut:7px]">
                <span className="flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-fg-subtle">
                  {profile}
                  <span className="text-fg-muted">LV {5 + i * 10}</span>
                </span>
                <span className="block font-display text-xs leading-none font-bold uppercase text-fg">Adversário</span>
              </MockCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function FieldMock() {
  return (
    <div className="hud-corners flex flex-wrap items-center gap-4 border border-line/60 bg-surface/60 p-4 [--hud-color:var(--color-warning)]">
      <span className="flex size-10 items-center justify-center border border-warning/40 text-warning">
        <Mountain className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl leading-none font-extrabold uppercase italic text-silver-bright">Campo</span>
        <span className="mt-1 block font-mono text-[11px] text-fg-muted">+6% Ataque · +4% Velocidade</span>
      </span>
      <span className="w-full space-y-1">
        <MockLabel>Ganha o bônus quem tem um destes traços</MockLabel>
        <span className="flex flex-wrap gap-1">
          <Badge tone="warning">Traço A</Badge>
          <Badge tone="warning">Traço B</Badge>
          <Badge tone="warning">Traço C</Badge>
        </span>
      </span>
    </div>
  )
}

export function TimelineMock() {
  const queue: { c: CharacterClass; ally: boolean }[] = [
    { c: 'EXECUTOR', ally: true },
    { c: 'MARKSMAN', ally: false },
    { c: 'GUARDIAN', ally: true },
    { c: 'SUPPORT', ally: false },
    { c: 'EXECUTOR', ally: true },
    { c: 'VANGUARD', ally: false },
  ]
  return (
    <ol className="flex items-center gap-1.5">
      {queue.map(({ c, ally }, i) => (
        <li
          key={i}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center border',
            ally ? 'border-primary-soft/50 bg-primary/12 text-silver-bright' : 'border-danger-hover/50 bg-danger/12 text-silver-bright',
            i === 0 && 'size-11 border-primary-soft shadow-glow',
          )}
        >
          <ClassIcon c={c} className={i === 0 ? 'size-4.5' : 'size-3.5'} />
        </li>
      ))}
    </ol>
  )
}

export function ActionBarMock({ chosen }: { chosen?: boolean }) {
  const skills = ['Golpe', 'Investida', 'Grito', 'Final']
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {skills.map((skill, i) => (
          <MockCard key={skill} active={chosen && i === 1} className={cn('flex h-14 flex-col justify-between p-2 [--cut:7px]', i === 3 && 'opacity-40')}>
            <span className="font-mono text-[8px] text-fg-subtle">{i + 1}</span>
            <span className="truncate font-display text-[11px] leading-none font-bold uppercase text-silver-bright">{skill}</span>
            {i === 3 && <span className="font-mono text-[8px] uppercase text-warning">Recarga</span>}
          </MockCard>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {[
          { icon: Footprints, label: 'Mover' },
          { icon: ArrowLeftRight, label: 'Trocar' },
          { icon: Shield, label: 'Defender' },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1 border border-line px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            <Icon className="size-3" /> {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BoardMock({ targets }: { targets?: boolean }) {
  const allies = [
    { row: 0, column: 0, characterClass: 'GUARDIAN' as const },
    { row: 1, column: 1, characterClass: 'EXECUTOR' as const },
    { row: 2, column: 0, characterClass: 'VANGUARD' as const },
    { row: 1, column: 2, characterClass: 'SUPPORT' as const },
  ]
  const enemies = [
    { row: 0, column: 0, characterClass: 'VANGUARD' as const },
    { row: 1, column: 0, characterClass: 'MARKSMAN' as const },
    { row: 2, column: 1, characterClass: 'CONTROLLER' as const, tag: <span className="bg-danger px-0.5 font-mono text-[7px] font-bold text-white">MAR</span> },
    { row: 1, column: 2, characterClass: 'ARTILLERY' as const },
  ]
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="space-y-1 text-center">
        <MockGrid units={allies} size="sm" />
        <MockLabel className="text-primary-soft">Você</MockLabel>
      </div>
      <span className="font-display text-sm font-extrabold italic text-fg-subtle">VS</span>
      <div className="space-y-1 text-center">
        <MockGrid units={enemies} side="OPPONENT" size="sm" highlight={targets ? [{ row: 0, column: 0 }, { row: 1, column: 0 }] : []} />
        <MockLabel className="text-danger-hover">Inimigo</MockLabel>
      </div>
    </div>
  )
}

