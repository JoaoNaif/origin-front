/** Um passo do assistente (wizard.tsx). O último é sempre a revisão. */
export type WizardStep<Id extends string> = { id: Id; title: string; optional?: boolean }

/** Passo inicial: item novo começa do início; um existente abre na revisão, para ver logo o que falta. */
export const firstStep = <Id extends string>(steps: WizardStep<Id>[], isNew: boolean | undefined) =>
  isNew ? steps[0].id : steps[steps.length - 1].id