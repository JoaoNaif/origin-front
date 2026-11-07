import { useMemo } from 'react'
import { ArrowLeft, Infinity as InfinityIcon, UserX } from 'lucide-react'
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
  useSkillOffers,
  useTemplates,
  useTraits,
  type Character,
  type SkillInfo,
  type Template,
} from '@/features/game/game-api'
import { rarityTone } from '@/features/economy/economy-labels'
import { CharacterPortrait } from '@/features/game/character-art'
import { dangerLabels, lineageLabels, statOrder } from '@/features/game/game-labels'
import { TutorialButton } from '@/features/tutorial/tutorial-button'
import { httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

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
  const skillOffers = useSkillOffers()
  const offers = skillOffers.data?.filter((o) => o.characterId === character.id).length ?? 0
  const build = character.skills.filter((s) => s.buildSlot).length
  const unspent = character.freePoints.available - statOrder.reduce((t, s) => t + character.freePoints.allocated[s], 0)

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
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/personagens"
            className="focus-ring group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-primary-soft"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Elenco
          </Link>
          <TutorialButton id="personagem" />
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                <Icon className="size-3" />
                {classLabels[character.characterClass]}
              </Badge>
              {template && (
                <span className="flex items-center gap-1.5 border border-line-strong bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  Raridade
                  <span className="font-display text-sm leading-none font-extrabold" style={{ color: rarityTone[template.rarity].color }}>
                    {template.rarity}
                  </span>
                </span>
              )}
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

          {/* Nível, XP e o que falta resolver */}
          <div className="chamfer group relative w-full max-w-xs overflow-hidden p-5 backdrop-blur-sm [--chamfer-bg:rgb(18_18_22/0.85)] [--chamfer-border:rgb(167_139_250/0.35)] [--cut:18px] transition-all hover:[--chamfer-border:rgb(167_139_250/0.7)] sm:w-80">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_100%_0%,rgb(139_92_246/0.18),transparent)] opacity-70 transition-opacity group-hover:opacity-100" />
            <span className="pointer-events-none absolute -right-2 -bottom-8 font-display text-[9rem] leading-none font-extrabold italic text-outline select-none">
              {character.level}
            </span>
            <div className="relative flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Nível</p>
                <p className="font-display text-7xl leading-none font-extrabold italic text-silver-bright tabular-nums">{character.level}</p>
              </div>
              <p className="pb-1 text-right font-mono text-[10px] text-fg-subtle tabular-nums">
                {character.xpToNextLevel ? (
                  <>
                    faltam <span className="text-primary-soft">{character.xpToNextLevel - character.xp}</span> XP
                  </>
                ) : (
                  'nível máximo'
                )}
              </p>
            </div>
            <div className="relative mt-4 h-1.5 -skew-x-12 bg-overlay">
              <div className="h-full bg-gradient-primary shadow-[0_0_10px_rgb(139_92_246/0.6)] transition-[width] duration-700 ease-out-soft" style={{ width: `${progress}%` }} />
            </div>
            <p className="relative mt-2 flex justify-between font-mono text-[11px] text-fg-muted tabular-nums">
              <span>XP</span>
              <span>{character.xpToNextLevel ? `${character.xp} / ${character.xpToNextLevel}` : 'Nível máximo'}</span>
            </p>

            {/* pendências da ficha */}
            <ul className="relative mt-4 grid grid-cols-3 gap-1.5 border-t border-line/70 pt-4">
              <HeroStat label="Build" value={`${build}/4`} warn={build < 4} />
              <HeroStat label="Pontos" value={String(unspent)} lit={unspent > 0} />
              <HeroStat label="Blocos" value={String(offers)} lit={offers > 0} />
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Um número do cartão de nível: aceso quando pede ação, laranja quando falta algo. */
function HeroStat({ label, value, lit, warn }: { label: string; value: string; lit?: boolean; warn?: boolean }) {
  return (
    <li
      className={cn(
        'border px-2 py-1.5 text-center transition-colors',
        warn ? 'border-warning/40 bg-warning/10' : lit ? 'border-primary/50 bg-primary/10' : 'border-line bg-bg/40',
      )}
    >
      <p className={cn('font-display text-xl leading-none font-extrabold italic tabular-nums', warn ? 'text-warning' : lit ? 'text-primary-soft' : 'text-fg-muted')}>
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">{label}</p>
    </li>
  )
}

function PassiveAndTraits({ character, template }: { character: Character; template?: Template }) {
  const traits = useTraits()
  const owned = character.traitKeys.map((key) => traits.data?.find((t) => t.key === key) ?? { key, name: key, description: '' })

  return (
    <div className="space-y-3">
      {template?.passive && (
        <div className="chamfer group relative overflow-hidden p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:rgb(167_139_250/0.3)] [--cut:14px] transition-all duration-300 hover:-translate-y-0.5 hover:[--chamfer-border:rgb(167_139_250/0.7)]">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_0%_0%,rgb(139_92_246/0.14),transparent)] opacity-60 transition-opacity group-hover:opacity-100" />
          <InfinityIcon className="pointer-events-none absolute -right-4 -bottom-6 size-24 text-primary-soft opacity-[0.05] transition-all duration-500 group-hover:rotate-12 group-hover:opacity-[0.12]" />
          <div className="relative flex items-start gap-3">
            <span className="relative flex size-10 shrink-0 items-center justify-center">
              <span className="absolute inset-1.5 rotate-45 border border-primary-soft/60 bg-primary/15 shadow-[0_0_14px_-4px_var(--color-primary)] transition-transform duration-300 group-hover:rotate-135" />
              <InfinityIcon className="relative size-4 text-primary-soft" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Passiva · sempre ativa</p>
              <p className="font-display text-xl font-bold uppercase tracking-wide text-silver-bright">{template.passive.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{template.passive.description}</p>
            </div>
          </div>
        </div>
      )}

      {owned.length === 0 ? (
        <p className="px-1 text-sm text-fg-subtle">Nenhum traço ainda. Traços vêm da família e de conquistas.</p>
      ) : (
        <ul className="space-y-1.5">
          {owned.map((trait) => {
            const family = 'source' in trait && trait.source === 'TEMPLATE'
            return (
              <li
                key={trait.key}
                className="group relative border border-line/60 bg-surface/50 py-3 pr-4 pl-5 transition-all duration-200 hover:border-line-strong hover:bg-surface"
              >
                <span
                  className={cn(
                    'absolute inset-y-3 left-0 w-0.5 transition-all duration-200 group-hover:inset-y-0 group-hover:w-0.75',
                    family ? 'bg-silver/50 group-hover:bg-silver' : 'bg-primary/60 group-hover:bg-primary group-hover:shadow-[0_0_8px_var(--color-primary)]',
                  )}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-bold uppercase tracking-wide text-fg transition-colors group-hover:text-silver-bright">{trait.name}</p>
                  {'source' in trait && <Badge tone={family ? 'neutral' : 'primary'}>{family ? 'Família' : 'Conquistado'}</Badge>}
                </div>
                {trait.description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{trait.description}</p>}
              </li>
            )
          })}
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
}

