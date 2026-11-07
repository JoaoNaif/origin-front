import { useState } from 'react'
import { Package, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page, SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button-classes'
import { ChestShop } from '@/features/economy/chest-shop'
import { useChests, useEconomy, useWallet } from '@/features/economy/economy-api'
import { formatCoins } from '@/features/economy/economy-labels'
import { EarningsPanel } from '@/features/economy/earnings-panel'
import { FragmentExchange } from '@/features/economy/fragment-exchange'
import { MissingRoster } from '@/features/economy/missing-roster'
import { WalletBar } from '@/features/economy/wallet-bar'
import type { Lineage } from '@/features/game/game-api'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const MARKET_ART = '/art/banner-mercado.jpg'

/**
 * Mercado: compra de baús com moeda e troca de fragmentos com o sistema (D100, D104, D150). Preços e chances vêm de
 * `GET /economy`; quem cobra e sorteia é o servidor. O mercado entre jogadores entra depois.
 */
export function MarketPage() {
  const wallet = useWallet()
  const economy = useEconomy()
  const chests = useChests()
  // tipo escolhido para a troca: a carteira do topo e a lista da seção 02 escolhem o mesmo
  const [fragment, setFragment] = useState<Lineage>('FUNDAMENTAL')

  function selectFragment(type: Lineage) {
    setFragment(type)
    document.getElementById('fragmentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="pb-12">
      <PageBanner
        art={MARKET_ART}
        tutorial="mercado"
        outlineWord="Mercado"
        meta={
          <>
            <Badge tone="primary">
              <Store className="size-3" />
              Economia
            </Badge>
            {wallet.data && <BannerMeta>{formatCoins(wallet.data.coins)} M na carteira</BannerMeta>}
          </>
        }
        title={
          <>
            Mer
            <span className="text-gradient-primary pr-3">cado</span>
          </>
        }
        description="Gaste a moeda das batalhas em baús, que trazem personagens novos, e troque fragmentos para aprimorar skills."
      />

      <Page className="space-y-12 pt-10 lg:pt-10">
        <WalletBar selected={fragment} onSelect={selectFragment} />

        {economy.isPending ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-96 animate-pulse bg-raised" />
            ))}
          </div>
        ) : economy.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os preços. Recarregue a página.</p>
        ) : (
          <>
            <section className="space-y-5">
              <SectionTitle
                index="01"
                actions={
                  <Link to="/baus" className={buttonClasses({ size: 'sm', variant: 'ghost' })}>
                    <Package className="size-4" />
                    Meus baús{chests.data && chests.data.length > 0 && ` (${chests.data.length})`}
                  </Link>
                }
              >
                Baús
              </SectionTitle>
              <ChestShop economy={economy.data} wallet={wallet.data} />
              <div className="pt-6">
                <MissingRoster economy={economy.data} />
              </div>
            </section>

            <section id="fragmentos" className="scroll-mt-6 space-y-5">
              <SectionTitle index="02">Fragmentos</SectionTitle>
              {wallet.data && (
                <FragmentExchange economy={economy.data} wallet={wallet.data} type={fragment} onTypeChange={setFragment} />
              )}
            </section>

            <section className="space-y-5">
              <SectionTitle index="03">Como ganhar</SectionTitle>
              <EarningsPanel economy={economy.data} />
            </section>
          </>
        )}
      </Page>
    </div>
  )
}
