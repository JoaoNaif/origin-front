import { useState } from 'react'
import { Gift, Loader2, Search } from 'lucide-react'
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
} from '@/features/admin/admin-api'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, difficultyLabels } from '@/features/game/game-api'
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

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionTitle index="01" actions={characters.data && <GrantCharacter username={username} owned={characters.data.map((c) => c.templateKey)} />}>
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
                <div key={c.id} className="flex items-center gap-3 rounded-card border border-line bg-surface px-3 py-2.5">
                  <Icon className="size-4 shrink-0 text-fg-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold uppercase tracking-wide text-fg">{c.name}</p>
                    <p className="truncate font-mono text-[10px] text-fg-subtle">
                      {classLabels[c.characterClass]} · {c.templateKey}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-primary-soft">Nv {c.level}</span>
                </div>
              )
            })}
          </div>
        )}
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
