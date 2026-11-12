import { useState, type CSSProperties } from 'react'
import { Gift, Loader2, PawPrint, Search, Sword } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionTitle } from '@/components/layout/page'
import {
  adminErrorMessage,
  useAccountBattles,
  useAccountCharacters,
  useAdminAccounts,
  useAdminCatalog,
  useGrantCharacter,
  useGrantBeast,
  useGrantGear,
  useSetCharacterDom,
} from '@/features/admin/admin-api'
import type { BeastContract, BeastGrade } from '@/features/beasts/beast-api'
import { beastGradeLabels, beastGradeOrder, contractLabels } from '@/features/beasts/beast-labels'
import type { GearGrade } from '@/features/gear/gear-api'
import { gradeLabels, gradeOrder } from '@/features/gear/gear-labels'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, difficultyLabels, type Character, type DomLevel, type DomPillar } from '@/features/game/game-api'
import { domLevelLabels, domLevelRank, domPillarColors, domPillarIcons, domPillarLabels, domPillarOrder } from '@/features/game/dom-labels'
import { battleOutcome, outcomeLabels } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const outcomeText = { WIN: 'text-success', LOSS: 'text-danger', ABANDON: 'text-fg-muted' } as const

export function AccountsPanel() {
  const accounts = useAdminAccounts()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  if (accounts.isPending) return <div className="h-96 animate-pulse bg-raised" />
  if (accounts.isError) return <p className="text-sm text-danger">{adminErrorMessage(accounts.error)}</p>

  const q = query.trim().toLowerCase()
  const shown = accounts.data.filter((a) => `${a.username} ${a.displayName}`.toLowerCase().includes(q))

  return (
    <div className="space-y-8">
      <div className="hud-corners border border-line bg-surface [--hud-color:var(--color-line-strong)]">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3">
          <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-control border border-line bg-bg px-2.5 focus-within:border-primary">
            <Search className="size-3.5 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar username ou nome"
              className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </label>
          <span className="font-mono text-[11px] text-fg-subtle">{accounts.data.length} contas</span>
        </div>
        <div className="max-h-[24rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              <tr className="border-b border-line text-left">
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 text-right font-medium">Personagens</th>
                <th className="px-4 py-2 text-right font-medium">Batalhas</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((account) => (
                <tr
                  key={account.id}
                  onClick={() => setSelected(account.username)}
                  className={cn(
                    'cursor-pointer border-b border-line/60 transition-colors last:border-0',
                    selected === account.username ? 'bg-primary-dim' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-fg">
                    <button type="button" className="focus-ring" onClick={() => setSelected(account.username)}>
                      @{account.username}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-fg-muted">{account.displayName}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={account.role === 'ADMIN' ? 'primary' : 'neutral'}>{account.role}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-fg-muted">{account.characters}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-fg-muted">{account.battles}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-subtle">Nenhuma conta.</p>}
        </div>
      </div>

      {selected && <AccountDetail key={selected} username={selected} />}
    </div>
  )
}

function AccountDetail({ username }: { username: string }) {
  const characters = useAccountCharacters(username)
  const battles = useAccountBattles(username)
  const [editing, setEditing] = useState<string | null>(null)
  const editingCharacter = characters.data?.find((c) => c.id === editing)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionTitle
          index="01"
          actions={
            <div className="flex flex-col items-end gap-2">
              {characters.data && <GrantCharacter username={username} owned={characters.data.map((c) => c.templateKey)} />}
              <GrantGear username={username} />
              <GrantBeast username={username} />
            </div>
          }
        >
          Personagens de @{username}
        </SectionTitle>
        {characters.isPending ? (
          <div className="h-32 animate-pulse bg-raised" />
        ) : characters.isError ? (
          <p className="text-sm text-danger">{adminErrorMessage(characters.error)}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {characters.data.map((c) => {
              const Icon = classIcons[c.characterClass]
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditing(editing === c.id ? null : c.id)}
                  aria-pressed={editing === c.id}
                  title="Definir o DOM"
                  className={cn(
                    'focus-ring flex items-center gap-3 rounded-card border px-3 py-2.5 text-left transition-colors',
                    editing === c.id ? 'border-primary bg-primary-dim' : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-fg-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold uppercase tracking-wide text-fg">{c.name}</p>
                    <p className="truncate font-mono text-[10px] text-fg-subtle">
                      {classLabels[c.characterClass]} · {c.templateKey}
                    </p>
                  </div>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-xs text-primary-soft">Nv {c.level}</span>
                    <DomPips character={c} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {editingCharacter && <DomEditor key={editingCharacter.id + JSON.stringify(editingCharacter.dom.pillars.map((p) => p.level))} username={username} character={editingCharacter} />}
      </div>

      <div className="space-y-4">
        <SectionTitle index="02">Batalhas</SectionTitle>
        {battles.isPending ? (
          <div className="h-32 animate-pulse bg-raised" />
        ) : battles.isError ? (
          <p className="text-sm text-danger">{adminErrorMessage(battles.error)}</p>
        ) : battles.data.length === 0 ? (
          <p className="text-sm text-fg-subtle">Nenhuma batalha.</p>
        ) : (
          <ul className="divide-y divide-line/60 border border-line bg-surface">
            {battles.data.map((b) => {
              const outcome = b.status === 'FINISHED' ? battleOutcome(b) : null
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                  <span className={cn('w-24 font-display font-semibold uppercase', outcome ? outcomeText[outcome] : 'text-primary-soft')}>
                    {outcome ? outcomeLabels[outcome] : 'Em andamento'}
                  </span>
                  <span className="flex-1 text-fg">{b.opponent.name}</span>
                  <Badge>{difficultyLabels[b.opponent.difficulty]}</Badge>
                  <span className="w-16 text-right font-mono text-xs text-fg-subtle">{b.rounds ? `${b.rounds} rod.` : '—'}</span>
                  <span className="font-mono text-xs text-fg-subtle">{dateFormat.format(new Date(b.startedAt))}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Dá um modelo que a conta ainda não tem (ex.: criado depois do cadastro). */
function GrantCharacter({ username, owned }: { username: string; owned: string[] }) {
  const catalog = useAdminCatalog()
  const grant = useGrantCharacter(username)
  const missing = catalog.data?.templates.filter((t) => !owned.includes(t.key)) ?? []
  const [templateKey, setTemplateKey] = useState('')

  if (missing.length === 0) return <span className="font-mono text-[11px] text-fg-subtle">Tem todos os modelos</span>

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {grant.isError && <span className="text-xs text-danger">{adminErrorMessage(grant.error)}</span>}
      <select
        value={templateKey}
        onChange={(e) => setTemplateKey(e.target.value)}
        className="focus-ring h-8 rounded-control border border-line bg-bg px-2 text-sm text-fg"
      >
        <option value="">Escolha o modelo</option>
        {missing.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name} ({t.key})
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!templateKey || grant.isPending}
        onClick={() => grant.mutate(templateKey, { onSuccess: () => setTemplateKey('') })}
      >
        {grant.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Gift className="size-3.5" />}
        Dar personagem
      </Button>
    </div>
  )
}

/** Dá um equipamento vivo do catálogo (entra guardado; 400 com o inventário cheio). Serve também para o Divino. */
function GrantGear({ username }: { username: string }) {
  const catalog = useAdminCatalog()
  const grant = useGrantGear(username)
  const [gearKey, setGearKey] = useState('')
  const items = [...(catalog.data?.gear ?? [])].sort(
    (a, b) => gradeOrder.indexOf(a.grade as GearGrade) - gradeOrder.indexOf(b.grade as GearGrade) || a.name.localeCompare(b.name),
  )

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {grant.isError && <span className="text-xs text-danger">{adminErrorMessage(grant.error)}</span>}
      {grant.isSuccess && <span className="text-xs text-success">{grant.data.name} entrou no inventário.</span>}
      <select
        value={gearKey}
        onChange={(e) => {
          grant.reset()
          setGearKey(e.target.value)
        }}
        className="focus-ring h-8 rounded-control border border-line bg-bg px-2 text-sm text-fg"
      >
        <option value="">Escolha o equipamento</option>
        {items.map((g) => (
          <option key={g.key} value={g.key}>
            {g.name} ({gradeLabels[g.grade as GearGrade] ?? String(g.grade)})
          </option>
        ))}
      </select>
      <Button size="sm" variant="secondary" disabled={!gearKey || grant.isPending} onClick={() => grant.mutate(gearKey, { onSuccess: () => setGearKey('') })}>
        {grant.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sword className="size-3.5" />}
        Dar equipamento
      </Button>
    </div>
  )
}

/** Dá uma besta, sem contrato (no MVP, é o "evento" que dá bestas). */
function GrantBeast({ username }: { username: string }) {
  const catalog = useAdminCatalog()
  const grant = useGrantBeast(username)
  const [beastKey, setBeastKey] = useState('')
  const items = [...(catalog.data?.beasts ?? [])].sort(
    (a, b) => beastGradeOrder.indexOf(a.grade as BeastGrade) - beastGradeOrder.indexOf(b.grade as BeastGrade) || a.name.localeCompare(b.name),
  )

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {grant.isError && <span className="text-xs text-danger">{adminErrorMessage(grant.error)}</span>}
      {grant.isSuccess && <span className="text-xs text-success">{grant.data.name} entrou nas bestas da conta.</span>}
      <select
        value={beastKey}
        onChange={(e) => {
          grant.reset()
          setBeastKey(e.target.value)
        }}
        className="focus-ring h-8 rounded-control border border-line bg-bg px-2 text-sm text-fg"
      >
        <option value="">Escolha a besta</option>
        {items.map((b) => (
          <option key={b.key} value={b.key}>
            {b.name} ({contractLabels[b.contract as BeastContract] ?? String(b.contract)}, {beastGradeLabels[b.grade as BeastGrade] ?? String(b.grade)})
          </option>
        ))}
      </select>
      <Button size="sm" variant="secondary" disabled={!beastKey || grant.isPending} onClick={() => grant.mutate(beastKey, { onSuccess: () => setBeastKey('') })}>
        {grant.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PawPrint className="size-3.5" />}
        Dar besta
      </Button>
    </div>
  )
}

/** Nível de cada pilar em 4 marcas (0 a 3), na cor do pilar. */
function DomPips({ character }: { character: Character }) {
  return (
    <span className="flex gap-1" title="DOM: Mente, Coração, Corpo, Aura">
      {character.dom.pillars.map((p) => (
        <span key={p.pillar} className="flex gap-px" style={{ '--tone': domPillarColors[p.pillar] } as CSSProperties}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={cn('h-2 w-1', i <= domLevelRank(p.level) ? 'bg-(--tone)' : 'bg-overlay')} />
          ))}
        </span>
      ))}
    </span>
  )
}

const levelOptions: (DomLevel | null)[] = [null, 'BASIC', 'INTERMEDIATE', 'ADVANCED']

/** Define o DOM do personagem (PUT /admin/characters/:id/dom), para testar a ficha e as skills únicas sem farmar feitos. */
function DomEditor({ username, character }: { username: string; character: Character }) {
  const initial = Object.fromEntries(character.dom.pillars.map((p) => [p.pillar, p.level])) as Record<DomPillar, DomLevel | null>
  const [draft, setDraft] = useState(initial)
  const save = useSetCharacterDom(username)
  const dirty = domPillarOrder.some((p) => draft[p] !== initial[p])

  return (
    <div className="hud-corners space-y-4 border border-line bg-surface p-4 [--hud-color:var(--color-primary-soft)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold uppercase tracking-wide text-silver-bright">DOM de {character.name}</p>
        <p className="text-xs text-fg-muted">
          Só para teste. A janela de feitos não muda e a perda volta a contar do zero: sem feitos, o pilar cai com o tempo.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {domPillarOrder.map((pillar) => {
          const Icon = domPillarIcons[pillar]
          return (
            <div key={pillar} style={{ '--tone': domPillarColors[pillar] } as CSSProperties} className="space-y-2 rounded-control border border-line bg-bg/40 p-3">
              <p className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-(--tone)">
                <Icon className="size-4" /> {domPillarLabels[pillar]}
              </p>
              <div role="radiogroup" aria-label={domPillarLabels[pillar]} className="flex flex-wrap gap-1.5">
                {levelOptions.map((level) => {
                  const on = draft[pillar] === level
                  return (
                    <button
                      key={level ?? 'none'}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        save.reset()
                        setDraft((d) => ({ ...d, [pillar]: level }))
                      }}
                      className={cn(
                        'focus-ring h-8 rounded-control border px-2.5 text-xs transition-colors',
                        on ? 'border-(--tone) bg-(--tone)/15 text-silver-bright' : 'border-line bg-bg text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {level ? domLevelLabels[level] : 'Sem'}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {save.isError && <p className="mr-auto text-xs text-danger">{adminErrorMessage(save.error)}</p>}
        {save.isSuccess && !dirty && <p className="mr-auto text-xs text-success">DOM salvo.</p>}
        <Button variant="ghost" size="sm" disabled={!dirty || save.isPending} onClick={() => setDraft(initial)}>
          Desfazer
        </Button>
        <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate({ characterId: character.id, pillars: draft })}>
          {save.isPending ? 'Salvando...' : 'Salvar DOM'}
        </Button>
      </div>
    </div>
  )
}
