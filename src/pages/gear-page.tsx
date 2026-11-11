import { useMemo, useState, type CSSProperties } from 'react'
import { Coins as CoinsIcon, Loader2, Package, PackagePlus, Store, Sword, Trash2, Unlink, UserRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Page, SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { toast } from '@/components/ui/toast'
import { useWallet } from '@/features/economy/economy-api'
import { Coins } from '@/features/economy/economy-ui'
import { CharacterPortrait } from '@/features/game/character-art'
import { classLabels, useCharacters, type Character } from '@/features/game/game-api'
import { lineageLabels } from '@/features/game/game-labels'
import {
  useEquipGear,
  useExpandInventory,
  useGear,
  useGearBonds,
  useSellGear,
  useUnequipGear,
  type Gear,
  type GearBond,
  type Inventory,
} from '@/features/gear/gear-api'
import { bondRank, gradeColors, gradeOrder, kindLabels, percentsText } from '@/features/gear/gear-labels'
import { BondBadge, BondDetails, GearEmblem, GradeTag, RequirementChips } from '@/features/gear/gear-ui'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const GEAR_ART = '/art/banner-arsenal.jpg'

type Filter = 'ALL' | 'EQUIPPED' | 'STORED'
const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'EQUIPPED', label: 'Em uso' },
  { value: 'STORED', label: 'Guardados' },
]

/**
 * Arsenal: o inventário de equipamentos vivos (D94, D153). Escolher um mostra o elo com cada personagem da conta
 * (`GET /gear/:id/bonds`) para decidir quem usa; também tira, vende ao sistema e compra espaços. Quem calcula é o servidor.
 */
export function GearPage() {
  const gear = useGear()
  const characters = useCharacters()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('ALL')

  const list = useMemo(
    () =>
      [...(gear.data?.gear ?? [])]
        .filter((g) => filter === 'ALL' || (filter === 'EQUIPPED') === !!g.characterId)
        .sort((a, b) => gradeOrder.indexOf(b.grade) - gradeOrder.indexOf(a.grade) || a.name.localeCompare(b.name)),
    [gear.data, filter],
  )
  const selected = gear.data?.gear.find((g) => g.id === params.get('item')) ?? list[0]
  const select = (id: string) => setParams({ item: id }, { replace: true })
  const byId = useMemo(() => new Map(characters.data?.map((c) => [c.id, c])), [characters.data])
  const equipped = gear.data?.gear.filter((g) => g.characterId).length ?? 0

  return (
    <div className="pb-12">
      <PageBanner
        art={GEAR_ART}
        tutorial="arsenal"
        outlineWord="Arsenal"
        meta={
          <>
            <Badge tone="primary">
              <Sword className="size-3" />
              Coleção
            </Badge>
            {gear.data && (
              <BannerMeta>
                {gear.data.inventory.used}/{gear.data.inventory.slots} espaços · {equipped} em uso
              </BannerMeta>
            )}
          </>
        }
        title={
          <>
            Arse
            <span className="text-gradient-primary pr-3">nal</span>
          </>
        }
        description="Armas e armaduras vivas: cada uma escolhe quem a usa. Com elo pleno, dá bônus e uma passiva; sem elo, cobra caro na batalha."
      />

      <Page className="space-y-10 pt-10 lg:pt-10">
        {gear.isPending ? (
          <div className="space-y-6">
            <div className="h-24 animate-pulse bg-raised" />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-96 animate-pulse bg-raised" />
              <div className="h-96 animate-pulse bg-raised" />
            </div>
          </div>
        ) : gear.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar o inventário. Recarregue a página.</p>
        ) : (
          <>
            <InventoryBar inventory={gear.data.inventory} />

            {gear.data.gear.length === 0 ? (
              <EmptyArsenal />
            ) : (
              <section className="space-y-5">
                <SectionTitle
                  index="01"
                  actions={
                    <div role="radiogroup" aria-label="Filtro" className="flex gap-1">
                      {filters.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          role="radio"
                          aria-checked={filter === f.value}
                          onClick={() => setFilter(f.value)}
                          className={cn(
                            'focus-ring h-7 border px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors',
                            filter === f.value ? 'border-primary/60 bg-primary-dim text-primary-soft' : 'border-line text-fg-subtle hover:text-fg',
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  Equipamentos
                </SectionTitle>
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
                  {list.length === 0 ? (
                    <p className="text-sm text-fg-subtle">Nada neste filtro.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {list.map((g) => (
                        <li key={g.id}>
                          <GearCard gear={g} holder={g.characterId ? byId.get(g.characterId) : undefined} selected={selected?.id === g.id} onClick={() => select(g.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {selected && <GearDetail key={selected.id} gear={selected} characters={characters.data ?? []} />}
                </div>
              </section>
            )}
          </>
        )}
      </Page>
    </div>
  )
}

/** Espaços usados e a compra de +5 (preço da vez vem do servidor). */
function InventoryBar({ inventory }: { inventory: Inventory }) {
  const wallet = useWallet()
  const expand = useExpandInventory()
  const price = inventory.nextExpansionPrice
  const short = price !== null && wallet.data !== undefined && wallet.data.coins < price
  const full = inventory.used >= inventory.slots

  return (
    <div className="hud-corners flex flex-wrap items-center gap-x-8 gap-y-4 border border-line/60 bg-surface/60 px-5 py-4 [--hud-color:var(--color-line-strong)]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Inventário</p>
        <p className="font-display text-4xl leading-none font-extrabold italic text-silver-bright tabular-nums">
          {inventory.used}
          <span className="text-xl text-fg-subtle not-italic">/{inventory.slots}</span>
        </p>
      </div>
      <div className="min-w-48 flex-1 space-y-1.5">
        <div className="h-2 -skew-x-12 bg-overlay">
          <div
            className={cn('h-full transition-[width] duration-500', full ? 'bg-warning' : 'bg-gradient-primary')}
            style={{ width: `${Math.min(100, (inventory.used / inventory.slots) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-fg-muted">
          {full
            ? 'Cheio: equipamento novo do baú vira moeda até liberar espaço.'
            : `${inventory.slots - inventory.used} livres. Equipamento em uso também ocupa espaço.`}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {price === null ? (
          <Badge>Inventário no máximo</Badge>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={expand.isPending || short}
            title={short ? 'Moeda insuficiente' : undefined}
            onClick={() =>
              expand.mutate(undefined, {
                onSuccess: ({ inventory: next }) => toast.success('Espaços comprados', `Agora são ${next.slots}.`),
              })
            }
          >
            {expand.isPending ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
            +5 espaços · <Coins value={price} />
          </Button>
        )}
        {expand.isError && <p className="text-xs text-danger">{apiErrorMessage(expand.error)}</p>}
      </div>
    </div>
  )
}

function GearCard({ gear, holder, selected, onClick }: { gear: Gear; holder?: Character; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ '--tone': gradeColors[gear.grade] } as CSSProperties}
      className={cn(
        'focus-ring chamfer group flex w-full items-start gap-3 p-4 text-left [--cut:14px] transition-all duration-200',
        selected
          ? '[--chamfer-bg:var(--color-raised)] [--chamfer-border:color-mix(in_srgb,var(--tone)_70%,transparent)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_45%,transparent)]',
      )}
    >
      <GearEmblem kind={gear.kind} grade={gear.grade} size="lg" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-center justify-between gap-2">
          <GradeTag grade={gear.grade} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">{kindLabels[gear.kind]}</span>
        </span>
        <span className="block truncate font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{gear.name}</span>
        <span className="block font-mono text-[11px] text-fg-muted">
          {lineageLabels[gear.lineage]} · {percentsText({ [gear.primaryStat]: gear.primaryPercent, [gear.secondaryStat]: gear.secondaryPercent })}
        </span>
        {holder ? (
          <span className="flex items-center gap-2 pt-1">
            <CharacterPortrait templateKey={holder.templateKey} characterClass={holder.characterClass} zoom={4} className="size-6 shrink-0 rounded-pill bg-bg" iconClassName="size-3 text-silver/60" />
            <span className="min-w-0 truncate text-xs text-fg">{holder.name}</span>
            {gear.bond && <BondBadge bond={gear.bond.bond} className="ml-auto" />}
          </span>
        ) : (
          <span className="block pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Guardado</span>
        )}
      </span>
    </button>
  )
}

/** O equipamento escolhido: o que ele é, o elo com cada personagem (para escolher quem usa), tirar e vender. */
function GearDetail({ gear, characters }: { gear: Gear; characters: Character[] }) {
  const bonds = useGearBonds(gear.id)
  const equip = useEquipGear()
  const unequip = useUnequipGear()
  const holder = characters.find((c) => c.id === gear.characterId)
  const [preview, setPreview] = useState<string | null>(gear.characterId)
  const [confirmSell, setConfirmSell] = useState(false)

  const byId = new Map(characters.map((c) => [c.id, c]))
  const sorted = [...(bonds.data ?? [])].sort(
    (a, b) => bondRank[b.bond] - bondRank[a.bond] || (byId.get(b.characterId)?.level ?? 0) - (byId.get(a.characterId)?.level ?? 0),
  )
  const shown: GearBond | undefined = sorted.find((b) => b.characterId === preview) ?? sorted[0]
  const target = shown && byId.get(shown.characterId)
  // o que sai do slot dele se equipar
  const replaced = target?.gear && target.gear.id !== gear.id ? target.gear : null

  return (
    <aside
      style={{ '--tone': gradeColors[gear.grade] } as CSSProperties}
      className="hud-corners space-y-5 border border-line bg-surface p-5 [--hud-color:var(--tone)] xl:sticky xl:top-6"
    >
      <header className="flex items-start gap-4">
        <GearEmblem kind={gear.kind} grade={gear.grade} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <GradeTag grade={gear.grade} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              {kindLabels[gear.kind]} · {lineageLabels[gear.lineage]}
            </span>
          </p>
          <h2 className="mt-1 font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">{gear.name}</h2>
          {gear.description && <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{gear.description}</p>}
        </div>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-y border-line/70 py-4 text-sm">
        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Elo pleno</dt>
        <dd className="text-fg">{percentsText({ [gear.primaryStat]: gear.primaryPercent, [gear.secondaryStat]: gear.secondaryPercent })}</dd>
        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Pede</dt>
        <dd>
          <RequirementChips requirements={gear.requirements} />
        </dd>
        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Títulos</dt>
        <dd className="text-xs text-fg-muted">{gear.titles.join(', ')} (um deles vale 1 requisito)</dd>
      </dl>

      {/* quem usa: o elo com cada personagem */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Elo com cada personagem</p>
        {bonds.isPending ? (
          <div className="h-40 animate-pulse bg-raised" />
        ) : bonds.isError ? (
          <p className="text-sm text-danger">{apiErrorMessage(bonds.error)}</p>
        ) : (
          <>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {sorted.map((bond) => {
                const c = byId.get(bond.characterId)
                if (!c) return null
                const active = shown?.characterId === bond.characterId
                return (
                  <li key={bond.characterId}>
                    <button
                      type="button"
                      onClick={() => setPreview(bond.characterId)}
                      aria-pressed={active}
                      className={cn(
                        'focus-ring flex w-full items-center gap-2.5 border px-2.5 py-1.5 text-left transition-colors',
                        active ? 'border-(--tone)/60 bg-raised' : 'border-transparent hover:border-line hover:bg-raised/50',
                      )}
                    >
                      <CharacterPortrait templateKey={c.templateKey} characterClass={c.characterClass} zoom={4} className="size-7 shrink-0 rounded-pill bg-bg" iconClassName="size-3.5 text-silver/60" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{c.name}</span>
                        <span className="block font-mono text-[10px] text-fg-subtle">
                          {classLabels[c.characterClass]} · LV {c.level}
                          {c.id === gear.characterId && <span className="text-primary-soft"> · usando</span>}
                        </span>
                      </span>
                      <BondBadge bond={bond.bond} />
                    </button>
                  </li>
                )
              })}
            </ul>

            {shown && target && (
              <div className="space-y-3 border border-line/70 bg-bg/40 p-3">
                <p className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">Com {target.name}</p>
                <BondDetails bond={shown} lineage={gear.lineage} />
                {gear.characterId === target.id ? (
                  <Button size="sm" variant="ghost" className="w-full" disabled={unequip.isPending} onClick={() => unequip.mutate(gear.id, { onSuccess: () => toast.success('Guardado', gear.name) })}>
                    <Unlink className="size-4" /> Tirar de {target.name.split(' ')[0]}
                  </Button>
                ) : (
                  <>
                    {(replaced || holder) && (
                      <p className="text-[11px] leading-snug text-fg-subtle">
                        {replaced && `${target.name.split(' ')[0]} usa ${replaced.name}: ele volta para o inventário. `}
                        {holder && `${holder.name.split(' ')[0]} fica sem equipamento.`}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={equip.isPending}
                      onClick={() =>
                        equip.mutate({ gearId: gear.id, characterId: target.id }, { onSuccess: () => toast.success('Equipado', `${gear.name} com ${target.name}`) })
                      }
                    >
                      {equip.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
                      Equipar em {target.name.split(' ')[0]}
                    </Button>
                  </>
                )}
                {(equip.isError || unequip.isError) && <p className="text-xs text-danger">{apiErrorMessage(equip.error ?? unequip.error)}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <SellBox gear={gear} confirming={confirmSell} onConfirming={setConfirmSell} />
    </aside>
  )
}

/** Venda ao sistema pelo valor do grau; o equipado precisa sair antes e o Divino não se vende. */
function SellBox({ gear, confirming, onConfirming }: { gear: Gear; confirming: boolean; onConfirming: (v: boolean) => void }) {
  const sell = useSellGear()
  const [, setParams] = useSearchParams()
  const blocked = gear.saleValue === null ? 'O Divino não se vende.' : gear.characterId ? 'Tire do personagem antes de vender.' : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4">
      <span className="flex items-center gap-2 text-xs text-fg-muted">
        <CoinsIcon className="size-3.5 text-coin" />
        {gear.saleValue === null ? 'Não se vende' : <>Vale <Coins value={gear.saleValue} className="text-fg" /></>}
      </span>
      {blocked ? (
        <span className="text-[11px] text-fg-subtle">{blocked}</span>
      ) : confirming ? (
        <span className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => onConfirming(false)} disabled={sell.isPending}>
            Voltar
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={sell.isPending}
            onClick={() =>
              sell.mutate(gear.id, {
                onSuccess: ({ coins }) => {
                  toast.success('Vendido', `${gear.name} por ${coins} M`)
                  setParams({}, { replace: true })
                },
                onSettled: () => onConfirming(false),
              })
            }
          >
            {sell.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Vender de vez
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="ghost" className="text-danger hover:text-danger-hover" onClick={() => onConfirming(true)}>
          <Trash2 className="size-4" /> Vender
        </Button>
      )}
      {sell.isError && <p className="w-full text-xs text-danger">{apiErrorMessage(sell.error)}</p>}
    </div>
  )
}

function EmptyArsenal() {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
      <Sword className="size-6 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhum equipamento</p>
      <p className="max-w-md text-sm text-fg-muted">
        Armas e armaduras vivas saem dos baús, no lugar de um personagem da mesma raridade. Cada uma tem uma passiva da linhagem e pede um
        perfil de atributos para o elo.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link to="/mercado" className={buttonClasses({ size: 'sm' })}>
          <Store className="size-4" /> Ir ao Mercado
        </Link>
        <Link to="/baus" className={buttonClasses({ size: 'sm', variant: 'secondary' })}>
          <Package className="size-4" /> Meus baús
        </Link>
      </div>
    </div>
  )
}
