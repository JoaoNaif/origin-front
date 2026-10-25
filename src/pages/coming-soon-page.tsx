import { Hammer } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/page'

/** Página temporária para as seções do menu que ainda não foram feitas. */
export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <Page>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center">
        <Hammer className="size-6 text-fg-subtle" />
        <p className="text-sm text-fg-muted">Esta tela está em construção.</p>
      </div>
    </Page>
  )
}
