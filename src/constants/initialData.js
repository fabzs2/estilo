// Estruturas de suporte para o setor de Design de Uniformes

// Helper para obter a data local (YYYY-MM-DD) sem o bug de fuso horário UTC após as 21h (BRT)
export function getLocalDateStr(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Retorna os feriados nacionais fixos (e móveis principais) do Brasil para um determinado ano
export function getBrazilianHolidays(year = new Date().getFullYear()) {
  const fixed = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Sra. Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia da Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' }
  ];

  // Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher) para Carnaval, Sexta-Feira Santa e Corpus Christi
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const addDays = (y, mo, da, offset) => {
    const dt = new Date(y, mo - 1, da, 12, 0, 0);
    dt.setDate(dt.getDate() + offset);
    return getLocalDateStr(dt);
  };

  const movable = [
    { date: addDays(year, easterMonth, easterDay, -48), name: 'Segunda de Carnaval' },
    { date: addDays(year, easterMonth, easterDay, -47), name: 'Terça de Carnaval' },
    { date: addDays(year, easterMonth, easterDay, -2), name: 'Sexta-Feira Santa' },
    { date: addDays(year, easterMonth, easterDay, 60), name: 'Corpus Christi' }
  ];

  return [...fixed, ...movable].sort((x, y) => x.date.localeCompare(y.date));
}

// Calcula os dias úteis reais entre startStr e endStr (inclusive), descontando domingos, sábados (se !includeSaturday) e feriados
export function calculateBusinessDays(startStr, endStr, { includeSaturday = false, holidays = [] } = {}) {
  if (!startStr || !endStr || startStr > endStr) return { count: 0, dates: [], discountedHolidays: [] };

  const holidaySet = new Set(Array.isArray(holidays) ? holidays : []);
  const start = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');

  // Segurança contra intervalos gigantes (ex: '1970-01-01' a '2099-12-31')
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (diffDays > 730) {
    return { count: 22, dates: [], discountedHolidays: [] };
  }

  const dates = [];
  const discountedHolidays = [];
  const cur = new Date(start);

  while (cur <= end) {
    const dStr = getLocalDateStr(cur);
    const dayOfWeek = cur.getDay(); // 0 = Dom, 6 = Sáb
    const isWorkDayOfWeek = dayOfWeek !== 0 && (includeSaturday || dayOfWeek !== 6);

    if (isWorkDayOfWeek) {
      if (holidaySet.has(dStr)) {
        discountedHolidays.push(dStr);
      } else {
        dates.push(dStr);
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return {
    count: dates.length,
    dates,
    discountedHolidays
  };
}

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

// Tipos de Lançamento / Motivo da Produção
export const WORK_TYPES = {
  arte_nova: {
    id: 'arte_nova',
    name: 'Arte Nova',
    shortName: 'Nova',
    color: '#38bdf8', // sky
    bgLight: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    description: 'Criação do zero / layout novo para o cliente'
  },
  ajuste_refacao: {
    id: 'ajuste_refacao',
    name: 'Ajuste / Refação',
    shortName: 'Ajuste',
    color: '#fbbf24', // amber
    bgLight: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.35)',
    description: 'Alteração solicitada pelo cliente (cor, patrocinador, layout reprovado)'
  },
  reposicao: {
    id: 'reposicao',
    name: 'Reposição',
    shortName: 'Reposição',
    color: '#f87171', // red/coral
    bgLight: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.35)',
    description: 'Reposição de peças com defeito, corte ou perda na produção'
  }
};

// Base zerada para inserção dos designers e histórico reais pelo usuário
export const INITIAL_DESIGNERS = [];
export const INITIAL_ENTRIES = [];
export const INITIAL_ORDERS = [];

// Dados de exemplo opcionais caso o usuário clique em "Restaurar Dados de Exemplo" no modal de Backup
export function getSampleData() {
  const today = getLocalDateStr();
  const sampleDesigners = [
    {
      id: 'des_sample_1',
      name: 'Lucas Mendes',
      nickname: 'Lucas Criação',
      role: 'Designer Criação',
      avatarColor: '#3b82f6',
      goalCriacaoArtes: 8,
      goalExportacao: 0,
      goalImpressaoPecas: 0,
      dailyGoalOrders: 8,
      dailyGoalMeters: 0,
      dailyGoalPieces: 0,
      active: true
    },
    {
      id: 'des_sample_2',
      name: 'Mariana Costa',
      nickname: 'Mari Fechamento',
      role: 'Arte-Finalista & Exportação',
      avatarColor: '#6366f1',
      goalCriacaoArtes: 0,
      goalExportacao: 10,
      goalImpressaoPecas: 0,
      dailyGoalOrders: 10,
      dailyGoalMeters: 0,
      dailyGoalPieces: 0,
      active: true
    },
    {
      id: 'des_sample_3',
      name: 'Rafael Oliveira',
      nickname: 'Rafa Plotter',
      role: 'Operador de Impressão / RIP',
      avatarColor: '#10b981',
      goalCriacaoArtes: 0,
      goalExportacao: 0,
      goalImpressaoPecas: 150,
      dailyGoalOrders: 8,
      dailyGoalMeters: 50,
      dailyGoalPieces: 150,
      active: true
    }
  ];

  const sampleOrders = [
    {
      id: 'ord_sample_1001',
      orderNumber: 'PED-1001',
      clientName: 'Colégio Dom Bosco - Jogos Internos',
      orderType: 'sublimacao_total',
      totalPieces: 65,
      date: today,
      workType: 'arte_nova',
      notes: 'Camisas Dry Fit gola V',
      createdAt: new Date().toISOString(),
      entries: [
        {
          id: 'ent_sample_1',
          stage: 'criacao',
          designerId: 'des_sample_1',
          designerName: 'Lucas Mendes',
          date: today,
          piecesCount: 1,
          meters: 0,
          workType: 'arte_nova',
          notes: 'Layout aprovado de primeira',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ent_sample_2',
          stage: 'exportacao',
          designerId: 'des_sample_2',
          designerName: 'Mariana Costa',
          date: today,
          piecesCount: 1,
          meters: 0,
          workType: 'arte_nova',
          notes: 'Gabarito P ao GG fechado',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ent_sample_3',
          stage: 'impressao',
          designerId: 'des_sample_3',
          designerName: 'Rafael Oliveira',
          date: today,
          piecesCount: 65,
          meters: 42.5,
          workType: 'arte_nova',
          notes: 'Plotter 01 - Papel 75g',
          createdAt: new Date().toISOString()
        }
      ]
    }
  ];

  return { designers: sampleDesigners, orders: sampleOrders };
}
