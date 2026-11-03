import type { Stat, StatusType } from '@/features/game/game-api'

// Glossário para o jogador: o que cada atributo, status e termo da batalha quer dizer. Texto curto e sem fórmula
// (regras em ../origin-game/docs/game_design.md D68, D73, D91, D102, D123 a D125 e skills_brief.md 12.4).
// Só explica: quem calcula é o servidor. Usado nas dicas dos rótulos (`Term`) e na página Guia.

/** Para que serve cada atributo, em uma frase. */
export const statInfo: Record<Stat, string> = {
  HP: 'A vida do personagem. Chegou a 0, ele cai e sai da batalha.',
  ATTACK: 'Quanto dano as skills causam. Quanto maior o Ataque em relação à Defesa do alvo, mais o golpe rende.',
  DEFENSE: 'Reduz o dano recebido. Funciona contra o Ataque de quem bate.',
  SPEED: 'Enche a barra da vez mais rápido: age antes e, se for bem mais rápido, pode agir duas vezes na mesma rodada.',
  PRECISION: 'Chance de acertar o golpe (contra a Esquiva do alvo) e de fazer um status pegar (contra a Vontade).',
  EVASION: 'Chance de desviar dos golpes. Funciona contra a Precisão de quem ataca.',
  WILL: 'Resiste a status (Atordoado, Preso...) e a ser empurrado, puxado ou trocado de lugar. Não reduz dano.',
}

/** Duração (em turnos de quem recebe) e chance base de cada status, além do efeito (`statusEffects`). */
export const statusDetails: Record<StatusType, { turns: number | null; chance: number; note?: string }> = {
  STUN: { turns: 1, chance: 0.7, note: 'Indefeso: golpes contra ele sempre acertam e ninguém pode protegê-lo. Depois fica 1 turno imune.' },
  LOCK: { turns: null, chance: 0.8, note: 'Atinge o kit, não o turno: ele ainda joga com as outras skills.' },
  ROOT: { turns: 2, chance: 0.8, note: 'Isolado: não pode ser protegido nem trocado de lugar. Sem cobertura e com 30% menos Esquiva.' },
  EXPOSE: { turns: 2, chance: 0.85, note: 'Perde a cobertura de quem está na frente.' },
  MARK: { turns: 3, chance: 0.8, note: 'Vale para o dano de todas as fontes.' },
  DOT: { turns: 3, chance: 0.8, note: 'Ignora a Defesa. Ferida: a cura recebida rende metade.' },
  TAUNT: { turns: 1, chance: 0.8, note: 'Skills de área, de apoio e mover continuam livres.' },
  SILENCE: { turns: 1, chance: 0.8, note: 'Vale só na próxima ação. Sem skill básica equipada, ele só pode se mover ou Defender.' },
  SLEEP: { turns: 2, chance: 0.6, note: 'Qualquer dano acorda, inclusive o Dano contínuo. Depois de acordar, fica 1 turno imune.' },
  LINK: { turns: 2, chance: 0.8, note: 'Vale para golpes, não para Dano contínuo, e não volta. Sem aliado vizinho, não pega. Acaba para os dois se um morrer.' },
  STEALTH: { turns: 1, chance: 1, note: 'Área e perfurante ainda atingem. Quem está atrás dele na linha fica exposto. Não intercepta.' },
  CONTAGION: { turns: 3, chance: 0.8, note: 'Precisa de Dano contínuo no alvo. Quem pega fica com ele por 2 turnos e não passa adiante.' },
}

/** Sigla da etiqueta de status (sobre o boneco, no painel da unidade e no guia). */
export const statusShort: Record<StatusType, string> = {
  STUN: 'ATR',
  LOCK: 'TRV',
  ROOT: 'PRE',
  EXPOSE: 'EXP',
  MARK: 'MAR',
  DOT: 'DOT',
  TAUNT: 'PRV',
  SILENCE: 'SIL',
  SLEEP: 'SNO',
  LINK: 'LIG',
  STEALTH: 'FUR',
  CONTAGION: 'CTG',
}

/** Cor da etiqueta: controle em laranja, o que aumenta o dano recebido em vermelho, Provocado em roxo. */
export const statusTone: Record<StatusType, string> = {
  STUN: 'bg-warning text-bg',
  LOCK: 'bg-warning text-bg',
  ROOT: 'bg-warning text-bg',
  EXPOSE: 'bg-danger text-white',
  MARK: 'bg-danger text-white',
  DOT: 'bg-danger text-white',
  TAUNT: 'bg-primary text-on-primary',
  SILENCE: 'bg-warning text-bg',
  SLEEP: 'bg-warning text-bg',
  LINK: 'bg-danger text-white',
  STEALTH: 'bg-success text-bg',
  CONTAGION: 'bg-danger text-white',
}

/** Termos da tela de batalha. */
export const battleTerms: { term: string; text: string }[] = [
  {
    term: 'Fila e rodada',
    text: 'A ordem das vezes sai da Velocidade. A rodada termina quando todos os vivos agiram ao menos uma vez. Na rodada 30, vence quem causou mais dano.',
  },
  { term: 'Desgaste', text: 'Usar skills cansa: cada uma gasta um pouco de um atributo, que depende da linhagem. Desgaste demais e as skills perdem força.' },
  { term: 'Recarga', text: 'Depois de usar uma skill, ela fica alguns turnos sem poder ser usada de novo.' },
  { term: 'Cobertura', text: 'Quem está atrás de alguém na linha leva 70% do dano de golpes à distância de alvo único. Não vale para quem está Exposto.' },
  { term: 'Engajado', text: 'Na frente, encarando um Vanguarda, Guardião ou Executor: mover ou trocar custa o turno inteiro.' },
  { term: 'Protegido', text: 'Um aliado se colocou na frente: golpes de alvo único caem nele até o próximo turno do protetor.' },
  { term: 'Interceptar', text: 'O Guardião entra na frente de um aliado vizinho uma vez por rodada, sozinho, sem gastar a vez.' },
  { term: 'Campo', text: 'Sorteado antes da batalha: quem tem um dos traços pedidos ganha bônus em dois atributos. Algumas skills trocam o campo.' },
  { term: 'Aura de classe', text: 'Cada classe dá um bônus aos aliados vizinhos na grade (frente, trás e lados). Auras iguais não somam.' },
  { term: 'Ancorado', text: 'Com um Vanguarda ao lado: não pode ser empurrado, puxado nem trocado à força.' },
]
