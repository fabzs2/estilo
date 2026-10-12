// Estruturas de suporte para o setor de Design de Uniformes

export const STAGES = {
  criacao: {
    id: 'criacao',
    name: 'Criação de Arte',
    shortName: 'Criação',
    color: '#60a5fa', // Soft slate blue
    bgLight: 'rgba(96, 165, 250, 0.08)',
    description: 'Desenvolvimento de layout, mockups, aprovação com cliente'
  },
  exportacao: {
    id: 'exportacao',
    name: 'Exportação / Fechamento',
    shortName: 'Exportação',
    color: '#a78bfa', // Soft violet
    bgLight: 'rgba(167, 139, 250, 0.08)',
    description: 'Encaixe em molde/gabarito, separação de matriz, fechamento'
  },
  impressao: {
    id: 'impressao',
    name: 'Impressão / Plotter',
    shortName: 'Impressão',
    color: '#34d399', // Soft emerald
    bgLight: 'rgba(52, 211, 153, 0.08)',
    description: 'Ripagem, envio para plotter sublimação/DTF, metragem linear'
  }
};

export const ORDER_TYPES = [
  { id: 'sublimacao_total', name: 'Sublimação Total', icon: 'Sparkles' },
  { id: 'sublimacao_localizada', name: 'Sublimação Localizada', icon: 'Layers' },
  { id: 'dtf', name: 'Impressão DTF', icon: 'Printer' },
  { id: 'serigrafia', name: 'Silk-Screen / Serigrafia', icon: 'Grid' },
  { id: 'bordado', name: 'Programação de Bordado', icon: 'Needle' },
  { id: 'misto', name: 'Misto / Composto', icon: 'Boxes' }
];

// Base zerada para inserção dos designers e histórico reais pelo usuário
export const INITIAL_DESIGNERS = [];
export const INITIAL_ENTRIES = [];
