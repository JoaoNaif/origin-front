import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, Check, Coins as CoinsIcon, Handshake, Loader2, Lock, PawPrint, Trash2, Unlink } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Page, SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  useBeastRequirements,
  useBeastRules,
  useBeasts,
  useContractBeast,
  useMoveBeastSlot,
  useReleaseBeast,
  useSellBeast,
  type Beast,
  type BeastRules,
} from '@/features/beasts/beast-api'
import { beastGradeColors, beastGradeOrder, contractLabels, contractText } from '@/features/beasts/beast-labels'
import { BeastEmblem, BeastGradeTag, BeastSkillList, ContractTag } from '@/features/beasts/beast-ui'
import { formatCoins } from '@/features/economy/economy-labels'
import { CharacterPortrait } from '@/features/game/character-art'
import { classLabels, useCharacters, type Character } from '@/features/game/game-api'
import { lineageLabels } from '@/features/game/game-labels'
import { useGear } from '@/features/gear/gear-api'
import { fmt } from '@/features/gear/gear-labels'
import { RequirementList } from '@/features/gear/gear-ui'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const BEASTS_ART = '/art/banner-bestas.jpg'

const SLOTS = [1, 2, 3, 4]

/**
 * Bestas (D95, D154): as da conta, o contrato de cada uma com um personagem (a invocação toma um slot da build), trocar o
 * slot, vender e soltar. Vêm de eventos (no MVP, o admin dá). Quem decide tudo é o servidor.
 */
export function BeastsPage() {
  const beasts = useBeasts()
  const gear = useGear()
  const [params, setParams] = useSearchParams()

  const list = useMemo(
    () =>
      [...(beasts.data ?? [])].sort(
        (a, b) => Number(!!b.characterId) - Number(!!a.characterId) || beastGradeOrder.indexOf(b.grade) - beastGradeOrder.indexOf(a.grade) || a.name.localeCompare(b.name),
      ),
    [beasts.data],
  )
  const selected = list.find((b) => b.id === params.get('besta')) ?? list[0]
  const contracted = list.filter((b) => b.characterId).length

  return (
    <div className="pb-12">
      <PageBanner
        art={BEASTS_ART}
        tutorial="bestas"
        outlineWord="Bestas"
        meta={
          <>
            <Badge tone="primary">
              <PawPrint className="size-3" />
              Coleção
            </Badge>
            {beasts.data && (
              <BannerMeta>
                {beasts.data.length} {beasts.data.length === 1 ? 'besta' : 'bestas'} · {contracted} com contrato
                {gear.data && ` · ${gear.data.inventory.used}/${gear.data.inventory.slots} espaços`}
              </BannerMeta>
            )}
          </>
        }
        title={
          <>
            Bes
            <span className="text-gradient-primary pr-3">tas</span>
          </>
        }
        description="Criaturas ligadas por contrato a um personagem. A invocação toma um slot da build e, na batalha, a besta luta do seu lado ou protege o dono."
      />

      <Page className="space-y-10 pt-10 lg:pt-10">
        {beasts.isPending ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_32rem]">
            <div className="h-72 animate-pulse bg-raised" />
            <div className="h-96 animate-pulse bg-raised" />
          </div>
        ) : beasts.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar as bestas. Recarregue a página.</p>
        ) : !selected ? (
          <EmptyBeasts />
        ) : (
          <section className="space-y-5">
            <SectionTitle index="01">Suas bestas</SectionTitle>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_32rem]">
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((b) => (
                  <li key={b.id}>
                    <BeastCard beast={b} active={b.id === selected.id} onClick={() => setParams({ besta: b.id }, { replace: true })} />
                  </li>
                ))}
              </ul>
              {/* key: trocar de besta recomeça o formulário e as confirmações */}
              <BeastDetail key={selected.id} beast={selected} />
            </div>
          </section>
        )}
      </Page>
    </div>
  )
}

function EmptyBeasts() {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
      <PawPrint className="size-7 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhuma besta ainda</p>
      <p className="max-w-md text-sm text-fg-muted">
        Bestas vêm de eventos especiais, não de baús. Quando chegar uma, ela aparece aqui para você firmar o contrato com um personagem.
      </p>
    </div>
  )
}

function BeastCard({ beast, active, onClick }: { beast: Beast; active: boolean; onClick: () => void }) {
  const characters = useCharacters()
  const owner = characters.data?.find((c) => c.id === beast.characterId)
  const blocked = beast.requirementsWithHolder && !beast.requirementsWithHolder.meets
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ '--tone': beastGradeColors[beast.grade] } as CSSProperties}
      className={cn(
        'focus-ring chamfer flex h-full w-full items-start gap-3 p-4 text-left [--cut:14px] transition-all duration-150 ease-out-soft',
        active
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_8%,var(--color-raised))] [--chamfer-border:var(--tone)] drop-shadow-[0_0_12px_color-mix(in_srgb,var(--tone)_30%,transparent)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]',
      )}
    >
      <BeastEmblem grade={beast.grade} contract={beast.contract} size="md" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{beast.name}</span>
        <span className="flex flex-wrap items-center gap-2">
          <BeastGradeTag grade={beast.grade} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">{contractLabels[beast.contract]}</span>
        </span>
        <span className={cn('block truncate font-mono text-[10px]', owner ? (blocked ? 'text-danger-hover' : 'text-primary-soft') : 'text-fg-subtle')}>
          {owner ? `${owner.name.split(' ')[0]} · slot ${beast.slot}${blocked ? ' · bloqueada' : ''}` : 'Sem contrato'}
        </span>
      </span>
    </button>
  )
}

/** A besta escolhida: o que ela é, o contrato em números, as skills em campo e o dono (ou firmar o contrato). */
function BeastDetail({ beast }: { beast: Beast }) {
  const rules = useBeastRules()
  const characters = useCharacters()
  const owner = characters.data?.find((c) => c.id === beast.characterId) ?? null

  return (
    <div
      style={{ '--tone': beastGradeColors[beast.grade] } as CSSProperties}
      className="chamfer space-y-6 p-5 [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_35%,transparent)] [--cut:18px] xl:sticky xl:top-6"
    >
      <span className="pointer-events-none absolute inset-px bg-[radial-gradient(70%_50%_at_100%_0%,color-mix(in_srgb,var(--tone)_10%,transparent),transparent)] [clip-path:var(--chamfer-shape)]" />

      <div className="relative flex items-start gap-4">
        <BeastEmblem grade={beast.grade} contract={beast.contract} size="lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <BeastGradeTag grade={beast.grade} />
          <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">{beast.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Linhagem {lineageLabels[beast.lineage]}</p>
        </div>
      </div>
      {beast.description && <p className="relative text-sm leading-relaxed text-fg-muted">{beast.description}</p>}

      <Block label="O contrato">
        <ContractTag contract={beast.contract} hint />
        <p className="text-sm leading-relaxed text-fg-muted">{contractText[beast.contract]}</p>
        {rules.data && <ContractNumbers beast={beast} rules={rules.data.beastRules} />}
      </Block>

      {beast.skills.length > 0 && (
        <Block label="Em campo">
          <BeastSkillList skills={beast.skills} />
        </Block>
      )}

      {owner ? <OwnerBlock beast={beast} owner={owner} /> : <ContractForm beast={beast} characters={characters.data ?? []} />}
    </div>
  )
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative space-y-3 border-t border-line/70 pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">{label}</p>
      {children}
    </div>
  )
}

/** Os números do contrato neste grau (de `GET /beast-rules`). */
function ContractNumbers({ beast, rules }: { beast: Beast; rules: BeastRules }) {
  const grade = rules.grades.find((g) => g.grade === beast.grade)
  if (!grade) return null
  const turns = beast.grade === 'SACRED' ? rules.duration.sacred : rules.duration.normal
  const facts: { label: string; value: string }[] =
    beast.contract === 'EQUALITY'
      ? [
          { label: 'Escudo', value: `${fmt(grade.equality.bufferPercent)}% do HP máx.` },
          { label: 'Segura', value: `${fmt(rules.equalityAbsorbShare * 100)}% de cada golpe` },
          { label: 'Bônus', value: `+${fmt(grade.equality.bonusPercent)}% Precisão e Esquiva` },
          { label: 'Dura', value: `${turns} turnos do dono` },
          { label: 'Se esvaziar', value: `−${fmt(rules.equalityBreakPercent)}% do HP máx.` },
        ]
      : [
          { label: 'Atributos', value: `${fmt(grade.statPercent[beast.contract])}% dos do dono` },
          { label: 'Velocidade', value: `${fmt(rules.speedShare * 100)}% da do dono` },
          { label: 'Fica', value: `${turns} turnos dela` },
          ...(beast.contract === 'DOMINANCE'
            ? [{ label: 'Custo', value: `−${fmt(grade.dominanceWillCost)}% de Vontade do dono` }]
            : [{ label: 'Requisitos', value: `${grade.masterRequirements}, todos` }]),
        ]
  return (
    <dl className="grid grid-cols-2 gap-px border border-line/60 bg-line/60">
      {facts.map((f) => (
        <div key={f.label} className="bg-bg px-3 py-2">
          <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">{f.label}</dt>
          <dd className="font-mono text-xs text-fg tabular-nums">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Com contrato: o dono, os requisitos com ele (Mestre), o slot da invocação e desfazer. */
function OwnerBlock({ beast, owner }: { beast: Beast; owner: Character }) {
  const move = useMoveBeastSlot()
  const release = useReleaseBeast()
  const req = beast.requirementsWithHolder
  const first = owner.name.split(' ')[0]

  return (
    <>
      <Block label="Contrato com">
        <Link
          to={`/personagens/${owner.id}`}
          className="focus-ring group flex items-center gap-3 border border-line/60 bg-surface/60 p-2.5 transition-colors hover:border-primary-soft/60"
        >
          <CharacterPortrait templateKey={owner.templateKey} characterClass={owner.characterClass} zoom={3.2} className="size-11 shrink-0 border border-line-strong bg-bg" iconClassName="size-5 text-fg-subtle" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{owner.name}</span>
            <span className="font-mono text-[10px] text-fg-subtle">
              {classLabels[owner.characterClass]} · LV {owner.level}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle transition-colors group-hover:text-primary-soft">Ficha</span>
        </Link>
        {req && (
          <div className="space-y-2">
            <p className={cn('flex items-center gap-1.5 text-xs', req.meets ? 'text-success' : 'text-danger-hover')}>
              {req.meets ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
              {req.meets ? `${first} cumpre todos os requisitos.` : `${first} não cumpre todos os requisitos: a batalha não começa com esta build.`}
            </p>
            <RequirementList bond={req} holder={first} />
          </div>
        )}
      </Block>

      <Block label="Invocação na build">
        <p className="text-xs text-fg-muted">Na batalha, a invocação toma o lugar da skill deste slot. Troque quando quiser.</p>
        <SlotPicker
          character={owner}
          value={beast.slot}
          busy={move.isPending}
          ignoreBeast={beast.id}
          onChange={(slot) =>
            move.mutate({ beastId: beast.id, slot }, { onSuccess: () => toast.success('Slot trocado', `${beast.name} no slot ${slot}`) })
          }
        />
        {move.isError && <p className="text-xs text-danger">{apiErrorMessage(move.error)}</p>}
      </Block>

      <DangerBlock>
        <ConfirmAction
          icon={Unlink}
          label="Desfazer contrato"
          warning={`${beast.name} vai embora para sempre: não volta e não rende moeda.`}
          confirmLabel="Desfazer e perder"
          pending={release.isPending}
          error={release.isError ? apiErrorMessage(release.error) : null}
          onConfirm={() => release.mutate(beast.id, { onSuccess: () => toast.success('Contrato desfeito', `${beast.name} foi embora`) })}
        />
      </DangerBlock>
    </>
  )
}

/** Sem contrato: escolher o personagem e o slot e firmar; ou vender, ou soltar. */
function ContractForm({ beast, characters }: { beast: Beast; characters: Character[] }) {
  const requirements = useBeastRequirements(beast.contract === 'MASTER' ? beast.id : null)
  const contract = useContractBeast()
  const sell = useSellBeast()
  const release = useReleaseBeast()
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  const master = beast.contract === 'MASTER'
  const reqOf = (id: string) => requirements.data?.find((r) => r.characterId === id)
  const roster = [...characters].sort(
    (a, b) => Number(!!(master && reqOf(b.id)?.meets)) - Number(!!(master && reqOf(a.id)?.meets)) || b.level - a.level || a.name.localeCompare(b.name),
  )
  const chosen = characters.find((c) => c.id === characterId) ?? null
  const chosenReq = chosen && master ? reqOf(chosen.id) : undefined
  const canSubmit = !!chosen && slot !== null && (!master || !!chosenReq?.meets)

  return (
    <>
      <Block label="Firmar contrato">
        <p className="text-xs text-fg-muted">
          Escolha quem vai ter {beast.name}. O contrato é <b className="text-fg">uma vez só</b>: desfazer depois perde a besta.
        </p>
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {roster.map((c) => {
            const req = master ? reqOf(c.id) : undefined
            const busy = (c.beasts?.length ?? 0) > 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCharacterId(c.id)
                    setSlot(null)
                    setConfirming(false)
                  }}
                  aria-pressed={c.id === characterId}
                  className={cn(
                    'focus-ring flex w-full items-center gap-2.5 border px-2 py-1.5 text-left transition-colors',
                    c.id === characterId ? 'border-primary-soft/70 bg-primary/12' : 'border-line/60 hover:border-line-strong hover:bg-raised/50',
                  )}
                >
                  <CharacterPortrait templateKey={c.templateKey} characterClass={c.characterClass} zoom={3.2} className="size-8 shrink-0 border border-line bg-bg" iconClassName="size-4 text-fg-subtle" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{c.name}</span>
                    <span className="block font-mono text-[10px] text-fg-subtle">
                      {classLabels[c.characterClass]} · LV {c.level}
                      {busy && <span className="text-warning"> · já tem {c.beasts!.length === 1 ? '1 besta' : `${c.beasts!.length} bestas`}</span>}
                    </span>
                  </span>
                  {master &&
                    (requirements.isPending ? (
                      <Loader2 className="size-3.5 animate-spin text-fg-subtle" />
                    ) : req ? (
                      <span
                        title={`${req.met + req.waived} de ${req.requirements.length} requisitos`}
                        className={cn('shrink-0 font-mono text-[10px] tabular-nums', req.meets ? 'text-success' : 'text-fg-subtle')}
                      >
                        {req.meets ? <Check className="inline size-3" /> : <Lock className="inline size-3" />} {req.met + req.waived}/{req.requirements.length}
                      </span>
                    ) : null)}
                </button>
              </li>
            )
          })}
        </ul>

        {chosen && chosenReq && (
          <div className="space-y-2">
            <p className={cn('flex items-center gap-1.5 text-xs', chosenReq.meets ? 'text-success' : 'text-danger-hover')}>
              {chosenReq.meets ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
              {chosenReq.meets
                ? `${chosen.name.split(' ')[0]} cumpre todos os requisitos do Mestre.`
                : `O Mestre pede todos os requisitos: ${chosen.name.split(' ')[0]} ainda não cumpre.`}
            </p>
            <RequirementList bond={chosenReq} holder={chosen.name.split(' ')[0]} />
          </div>
        )}

        {chosen && (!master || chosenReq?.meets) && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">Slot da invocação</p>
            <SlotPicker character={chosen} value={slot} onChange={setSlot} />
          </div>
        )}

        {canSubmit &&
          (confirming ? (
            <div className="space-y-2 border border-warning/40 bg-warning/5 p-3">
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                {beast.name} fica com {chosen.name.split(' ')[0]} para sempre (o slot dá para trocar depois). Desfazer o contrato perde a besta.
              </p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={contract.isPending}>
                  Voltar
                </Button>
                <Button
                  size="sm"
                  disabled={contract.isPending}
                  onClick={() =>
                    contract.mutate(
                      { beastId: beast.id, characterId: chosen.id, slot },
                      { onSuccess: () => toast.success('Contrato firmado', `${beast.name} com ${chosen.name}, slot ${slot}`) },
                    )
                  }
                >
                  {contract.isPending ? <Loader2 className="size-4 animate-spin" /> : <Handshake className="size-4" />}
                  Firmar
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setConfirming(true)}>
              <Handshake className="size-4" /> Firmar com {chosen.name.split(' ')[0]} · slot {slot}
            </Button>
          ))}
        {contract.isError && <p className="text-xs text-danger">{apiErrorMessage(contract.error)}</p>}
      </Block>

      <DangerBlock>
        {beast.saleValue !== null && (
          <ConfirmAction
            icon={CoinsIcon}
            label={`Vender por ${formatCoins(beast.saleValue)} M`}
            warning={`${beast.name} vai para o sistema por ${formatCoins(beast.saleValue)} M.`}
            confirmLabel="Vender"
            tone="secondary"
            pending={sell.isPending}
            error={sell.isError ? apiErrorMessage(sell.error) : null}
            onConfirm={() => sell.mutate(beast.id, { onSuccess: ({ coins }) => toast.success('Vendida', `+${formatCoins(coins)} M`) })}
          />
        )}
        <ConfirmAction
          icon={Trash2}
          label="Soltar"
          warning={`${beast.name} vai embora sem render nada${beast.saleValue !== null ? '; vender rende moeda' : ''}.`}
          confirmLabel="Soltar e perder"
          pending={release.isPending}
          error={release.isError ? apiErrorMessage(release.error) : null}
          onConfirm={() => release.mutate(beast.id, { onSuccess: () => toast.success('Solta', `${beast.name} foi embora`) })}
        />
      </DangerBlock>
    </>
  )
}

/**
 * Os 4 slots da build do personagem, com a skill de cada um: a invocação toma o lugar dela na batalha. Um slot já usado
 * por outra besta dele fica bloqueado.
 */
function SlotPicker({ character, value, onChange, busy, ignoreBeast }: {
  character: Character
  value: number | null
  onChange: (slot: number) => void
  busy?: boolean
  /** A besta que está trocando de slot (o slot dela não conta como ocupado). */
  ignoreBeast?: string
}) {
  return (
    <div role="radiogroup" aria-label="Slot da invocação" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {SLOTS.map((slot) => {
        const skill = character.skills.find((s) => s.buildSlot === slot)
        const other = character.beasts?.find((b) => b.slot === slot && b.id !== ignoreBeast)
        const active = value === slot
        return (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={busy || !!other}
            onClick={() => !active && onChange(slot)}
            className={cn(
              'focus-ring chamfer flex min-h-14 flex-col items-start justify-between gap-1 p-2 text-left [--cut:8px] transition-all',
              active
                ? '[--chamfer-bg:color-mix(in_srgb,var(--color-beast)_14%,var(--color-bg))] [--chamfer-border:var(--color-beast)]'
                : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:var(--color-line-strong)]',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <span className={cn('font-mono text-[10px] font-bold', active ? 'text-beast' : 'text-fg-subtle')}>
              {active ? <PawPrint className="inline size-3" /> : null} {slot}
            </span>
            <span className={cn('w-full truncate text-[11px] leading-tight', active ? 'text-fg-muted line-through' : 'text-fg-muted')}>
              {other ? other.name : (skill?.name ?? 'Vazio')}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DangerBlock({ children }: { children: ReactNode }) {
  return <div className="relative flex flex-wrap items-start justify-end gap-2 border-t border-line/70 pt-4">{children}</div>
}

/** Botão de duas etapas: o primeiro clique mostra o aviso, o segundo confirma. */
function ConfirmAction({ icon: Icon, label, warning, confirmLabel, tone = 'danger', pending, error, onConfirm }: {
  icon: typeof Trash2
  label: string
  warning: string
  confirmLabel: string
  tone?: 'danger' | 'secondary'
  pending: boolean
  error: string | null
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Icon className="size-4" /> {label}
      </Button>
    )
  return (
    <div className="w-full space-y-2 border border-danger/40 bg-danger-dim/40 p-3">
      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger-hover" />
        {warning}
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Voltar
        </Button>
        <Button size="sm" variant={tone} onClick={onConfirm} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

