import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useEconomy, useEnhanceSkill, useWallet } from '@/features/economy/economy-api'
import { fragmentLabels } from '@/features/economy/economy-labels'
import { Coins, FragmentIcon } from '@/features/economy/economy-ui'
import type { SkillInfo } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Aprimorar a skill (D80, D100, D150): tentativa paga, com chance fixa. O custo (moeda + fragmentos da linhagem da
 * skill, pelo tipo dela) sai dê certo ou não; deu certo, a skill rende +15%, uma vez só. Valores de `GET /economy`.
 */
export function EnhancePanel({ characterId, skill, enhanced }: { characterId: string; skill: SkillInfo; enhanced: boolean }) {
  const economy = useEconomy()
  const wallet = useWallet()
  const enhance = useEnhanceSkill(characterId)
  // o último resultado desta skill (some ao trocar de skill: o pai muda a key)
  const [outcome, setOutcome] = useState<'success' | 'fail' | null>(null)

  if (enhanced) {
    return (
      <p className={cn('flex items-center gap-2 border-t border-line/70 pt-3 text-sm', outcome === 'success' ? 'text-success' : 'text-fg-muted')}>
        <Sparkles className="size-4 text-success" />
        {outcome === 'success' ? 'Deu certo! A skill está aprimorada: +15% no efeito.' : 'Aprimorada: +15% no efeito.'}
      </p>
    )
  }

  if (!economy.data || !wallet.data) return null

  const cost = economy.data.enhancement.cost[skill.tier]
  const chance = Math.round(economy.data.enhancement.chance * 100)
  const type = skill.lineage
  const haveFragments = wallet.data.fragments[type]
  const missingCoins = Math.max(0, cost.coins - wallet.data.coins)
  const missingFragments = Math.max(0, cost.fragments - haveFragments)
  const canPay = missingCoins === 0 && missingFragments === 0

  return (
    <div className="space-y-3 border-t border-line/70 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Aprimorar</p>
        <p className="font-mono text-[11px] text-fg-muted">{chance}% de chance · +15% no efeito</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={cn(missingCoins ? 'text-danger' : 'text-fg')}>
          <Coins value={cost.coins} />
        </span>
        <span className={cn('inline-flex items-center gap-1.5 font-mono tabular-nums', missingFragments ? 'text-danger' : 'text-fg')}>
          <FragmentIcon type={type} />
          {cost.fragments}
          <span className="text-fg-subtle">
            {fragmentLabels[type]} (tem {haveFragments})
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!canPay || enhance.isPending}
          onClick={() => {
            setOutcome(null)
            enhance.mutate(skill.key, { onSuccess: (data) => setOutcome(data.success ? 'success' : 'fail') })
          }}
        >
          <Sparkles className="size-3.5" />
          {enhance.isPending ? 'Tentando...' : 'Tentar aprimorar'}
        </Button>
        {!canPay && (
          <Link to="/mercado" className="text-xs text-primary-soft hover:underline">
            Falta {missingCoins ? `${missingCoins} M` : ''}
            {missingCoins && missingFragments ? ' e ' : ''}
            {missingFragments ? `${missingFragments} fragmento${missingFragments > 1 ? 's' : ''}` : ''}: ir ao Mercado
          </Link>
        )}
      </div>

      {outcome === 'fail' && <p className="text-xs text-warning">Não deu certo desta vez. O custo foi gasto; dá para tentar de novo.</p>}
      {enhance.isError && <p className="text-xs text-danger">{apiErrorMessage(enhance.error)}</p>}
      <p className="text-[11px] text-fg-subtle">O custo sai mesmo se não der certo.</p>
    </div>
  )
}
