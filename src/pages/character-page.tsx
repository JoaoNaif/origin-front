import { useMemo } from 'react'
import { ArrowLeft, UserX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { SectionTitle } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button-classes'
import { BuildEditor } from '@/features/characters/build-editor'
import { SkillOffers } from '@/features/characters/skill-offers'
import { StatsPanel } from '@/features/characters/stats-panel'
import { classIcons } from '@/features/game/class-icons'
import {
  classLabels,
  useCharacter,
  useTemplates,
  useTraits,
  type Character,
  type SkillInfo,
  type Template,
} from '@/features/game/game-api'
import { dangerLabels, lineageLabels } from '@/features/game/game-labels'
import { httpStatus } from '@/lib/api'

export function CharacterPage() {
  const { id = '' } = useParams()
  const character = useCharacter(id)
  const templates = useTemplates()

  const template = templates.data?.find((t) => t.key === character.data?.templateKey)
  const catalog = useMemo(() => new Map<string, SkillInfo>(template?.skills.map((s) => [s.key, s])), [template])

  if (character.isError) {
    const status = httpStatus(character.error)
    return <NotFound message={status === 404 || status === 403 || status === 400 ? 'Esse personagem não está no seu elenco.' : 'Não foi possível carregar o personagem.'} />
  }

  if (!character.data || templates.isPending) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10 lg:px-10">
        <div className="h-72 animate-pulse bg-raised" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse bg-raised" />
          <div className="h-96 animate-pulse bg-raised" />
        </div>
      </div>
    )
  }

  const data = character.data

  return (
    <div className="pb-12">
      <Hero character={data} template={template} />

      <div className="mx-auto max-w-7xl space-y-12 px-6 pt-10 lg:px-10">
        <SkillOffers characterId={data.id} templateKey={data.templateKey} characterClass={data.characterClass} />

        <div className="grid gap-12 xl:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="space-y-10">
            <section className="space-y-5">
              <SectionTitle index="01">Atributos</SectionTitle>
              {/* key: ao salvar, o rascunho recomeça do que voltou do servidor */}
              <StatsPanel key={JSON.stringify(data.freePoints.allocated)} character={data} />
            </section>
            <section className="space-y-5">
              <SectionTitle index="02">Passiva e traços</SectionTitle>
              <PassiveAndTraits character={data} template={template} />
            </section>
          </div>

          <section className="space-y-5">
            <SectionTitle
              index="03"
              actions={<span className="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle">{data.skills.length} aprendidas</span>}
            >
              Build
            </SectionTitle>
            <BuildEditor key={data.skills.map((s) => `${s.key}:${s.buildSlot}`).join()} character={data} catalog={catalog} />
          </section>
        </div>
      </div>
    </div>
  )
}

function Hero({ character, template }: { character: Character; template?: Template }) {
  const Icon = classIcons[character.characterClass]
  const progress = character.xpToNextLevel ? Math.min(100, (character.xp / character.xpToNextLevel) * 100) : 100
  const variants = template?.variants.filter((v) => v.isPrimary || v.key === character.awakenedVariantKey) ?? []
  const [first, ...rest] = character.name.split(' ')

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-bg">
        <div className="absolute inset-0 bg-grid mask-[linear-gradient(to_bottom,black,transparent_90%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_80%_at_80%_40%,rgb(139_92_246/0.16),transparent_70%)]" />
        {/* retrato grande entre o título e o cartão de nível, esmaecendo para a esquerda (o título continua legível) */}
        <div className="absolute inset-y-0 right-80 hidden w-[30%] xl:block">
          <CharacterPortrait
            templateKey={character.templateKey}
            characterClass={character.characterClass}
            zoom={1.3}
            className="size-full mask-[linear-gradient(to_right,transparent,black_40%)]"
            iconClassName="size-72 text-silver/6"
          />
        </div>
        <div className="absolute inset-0 scanlines" />
        <span className="absolute -bottom-12 -left-4 font-display text-[14rem] leading-none font-extrabold whitespace-nowrap uppercase italic text-outline select-none">
          {first}
        </span>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 pb-10 lg:px-10">
        <Link
          to="/personagens"
          className="focus-ring group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-primary-soft"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Elenco
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                <Icon className="size-3" />
                {classLabels[character.characterClass]}
              </Badge>
              {template && <Badge>Raridade {template.rarity}</Badge>}
              <Badge>Periculosidade {dangerLabels[character.danger]}</Badge>
            </div>

            <h1 className="font-display text-6xl leading-[0.85] font-extrabold uppercase italic text-silver-bright sm:text-7xl xl:text-8xl">
              {first}
              {rest.length > 0 && <span className="text-gradient-primary block pr-3">{rest.join(' ')}</span>}
            </h1>

            {variants.length > 0 && (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                {variants.map((v) => `${v.name} · ${lineageLabels[v.lineage]}`).join('  /  ')}
              </p>
            )}
            {template?.description && <p className="max-w-xl text-[15px] leading-relaxed text-fg-muted">{template.description}</p>}
          </div>

          {/* Nível e XP */}
          <div className="chamfer w-full max-w-xs p-5 [--chamfer-bg:rgb(18_18_22/0.85)] [--chamfer-border:var(--color-line-strong)] [--cut:16px] sm:w-72">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Nível</p>
            <p className="font-display text-6xl leading-none font-extrabold italic text-silver-bright tabular-nums">{character.level}</p>
            <div className="mt-4 h-1 bg-overlay">
              <div className="h-full bg-gradient-primary shadow-[0_0_10px_rgb(139_92_246/0.6)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 flex justify-between font-mono text-[11px] text-fg-muted tabular-nums">
              <span>XP</span>
              <span>{character.xpToNextLevel ? `${character.xp} / ${character.xpToNextLevel}` : 'Nível máximo'}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PassiveAndTraits({ character, template }: { character: Character; template?: Template }) {
  const traits = useTraits()
  const owned = character.traitKeys.map((key) => traits.data?.find((t) => t.key === key) ?? { key, name: key, description: '' })

  return (
    <div className="space-y-3">
      {template?.passive && (
        <div className="chamfer p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:12px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Passiva</p>
          <p className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-silver-bright">{template.passive.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{template.passive.description}</p>
        </div>
      )}

      {owned.length === 0 ? (
        <p className="px-1 text-sm text-fg-subtle">Nenhum traço ainda. Traços vêm da família e de conquistas.</p>
      ) : (
        <ul className="divide-y divide-line/70 border border-line/60 bg-surface/60">
          {owned.map((trait) => (
            <li key={trait.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-fg">{trait.name}</p>
                {'source' in trait && <Badge>{trait.source === 'TEMPLATE' ? 'Família' : 'Conquistado'}</Badge>}
              </div>
              {trait.description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{trait.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
      <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
        <UserX className="size-6 text-fg-subtle" />
        <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Personagem indisponível</p>
        <p className="text-sm text-fg-muted">{message}</p>
        <Link to="/personagens" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-2' })}>
          Voltar ao elenco
        </Link>
      </div>
    </div>
  )
}import { CharacterPortrait } from '@/features/game/character-art'

