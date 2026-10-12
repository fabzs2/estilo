import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { INITIAL_DESIGNERS, INITIAL_ENTRIES, STAGES } from '../constants/initialData';
import { 
  supabase, 
  isSupabaseConfigured, 
  mapDesignerFromDB, 
  mapDesignerToDB, 
  mapEntryFromDB, 
  mapEntryToDB 
} from '../lib/supabase';

export const ProductionContext = createContext(null);

export function useProduction() {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProduction must be used within a ProductionProvider');
  }
  return context;
}

const STORAGE_KEYS = {
  ENTRIES: 'designflow_entries_v2', // v2 para limpar dados mockados anteriores
  DESIGNERS: 'designflow_designers_v2'
};

export function ProductionProvider({ children }) {
  const [isSupabaseActive] = useState(() => isSupabaseConfigured());
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Inicialização de Designers
  const [designers, setDesigners] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DESIGNERS);
      return saved ? JSON.parse(saved) : INITIAL_DESIGNERS;
    } catch (e) {
      return INITIAL_DESIGNERS;
    }
  });

  // Inicialização de Lançamentos de Produção
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      return saved ? JSON.parse(saved) : INITIAL_ENTRIES;
    } catch (e) {
      return INITIAL_ENTRIES;
    }
  });

  // Carregar dados remotos do Supabase na inicialização se configurado
  useEffect(() => {
    if (!isSupabaseActive || !supabase) return;

    async function loadFromSupabase() {
      setIsLoadingDB(true);
      try {
        // Buscar designers
        const { data: dbDesigners, error: desError } = await supabase
          .from('designers')
          .select('*')
          .order('name', { ascending: true });

        if (!desError && dbDesigners) {
          const mappedDes = dbDesigners.map(mapDesignerFromDB);
          setDesigners(mappedDes);
        }

        // Buscar pedidos
        const { data: dbEntries, error: entError } = await supabase
          .from('production_entries')
          .select('*')
          .order('date', { ascending: false });

        if (!entError && dbEntries) {
          const mappedEnt = dbEntries.map(mapEntryFromDB);
          setEntries(mappedEnt);
        }
      } catch (err) {
        console.error('Erro ao conectar ao Supabase:', err);
      } finally {
        setIsLoadingDB(false);
      }
    }

    loadFromSupabase();
  }, [isSupabaseActive]);

  // Sincronizar com localStorage como cache/fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DESIGNERS, JSON.stringify(designers));
    } catch (e) {}
  }, [designers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch (e) {}
  }, [entries]);

  // Filtro de período selecionado
  const [periodFilter, setPeriodFilter] = useState('this_week');
  const [customRange, setCustomRange] = useState({
    start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filtro secundário na tabela/visualizações
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isBatchEntryOpen, setIsBatchEntryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Ações de Entradas
  const addEntry = async (newEntry) => {
    const designer = designers.find((d) => d.id === newEntry.designerId);
    const item = {
      ...newEntry,
      id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      designerName: designer ? designer.name : 'Designer',
      piecesCount: Number(newEntry.piecesCount) || 0,
      meters: Number(newEntry.meters) || 0,
      createdAt: new Date().toISOString()
    };

    setEntries((prev) => [item, ...prev]);

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').insert(mapEntryToDB(item));
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    return item;
  };

  const updateEntry = async (id, updatedFields) => {
    const designer = designers.find((d) => d.id === (updatedFields.designerId));
    let updatedItem = null;

    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = {
            ...item,
            ...updatedFields,
            designerName: designer ? designer.name : (item.designerName || 'Designer'),
            piecesCount: Number(updatedFields.piecesCount ?? item.piecesCount) || 0,
            meters: Number(updatedFields.meters ?? item.meters) || 0
          };
          return updatedItem;
        }
        return item;
      })
    );

    if (isSupabaseActive && supabase && updatedItem) {
      try {
        await supabase.from('production_entries').update(mapEntryToDB(updatedItem)).eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar no Supabase:', err);
      }
    }
  };

  const deleteEntry = async (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar do Supabase:', err);
      }
    }
  };

  const addBatchEntries = async (batchItems) => {
    const formatted = batchItems.map((item, idx) => {
      const designer = designers.find((d) => d.id === item.designerId);
      return {
        ...item,
        id: `ent_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        designerName: designer ? designer.name : 'Designer',
        piecesCount: Number(item.piecesCount) || 0,
        meters: Number(item.meters) || 0,
        createdAt: new Date().toISOString()
      };
    });

    setEntries((prev) => [...formatted, ...prev]);

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').insert(formatted.map(mapEntryToDB));
      } catch (err) {
        console.error('Erro ao salvar lote no Supabase:', err);
      }
    }
  };

  // Ações de Designers
  const addDesigner = async (newDes) => {
    const designer = {
      ...newDes,
      id: `des_${Date.now()}`,
      active: true,
      dailyGoalOrders: Number(newDes.dailyGoalOrders) || 8,
      dailyGoalMeters: Number(newDes.dailyGoalMeters) || 0,
      dailyGoalPieces: Number(newDes.dailyGoalPieces) || 50
    };

    setDesigners((prev) => [...prev, designer]);

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('designers').insert(mapDesignerToDB(designer));
      } catch (err) {
        console.error('Erro ao salvar designer no Supabase:', err);
      }
    }
  };

  const updateDesigner = async (id, updatedFields) => {
    let updatedDes = null;
    setDesigners((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          updatedDes = { ...d, ...updatedFields };
          return updatedDes;
        }
        return d;
      })
    );

    if (updatedFields.name) {
      setEntries((prev) =>
        prev.map((e) =>
          e.designerId === id ? { ...e, designerName: updatedFields.name } : e
        )
      );
    }

    if (isSupabaseActive && supabase && updatedDes) {
      try {
        await supabase.from('designers').update(mapDesignerToDB(updatedDes)).eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar designer no Supabase:', err);
      }
    }
  };

  const deleteDesigner = async (id) => {
    setDesigners((prev) => prev.filter((d) => d.id !== id));

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('designers').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao remover designer no Supabase:', err);
      }
    }
  };

  const clearAllData = async () => {
    setDesigners([]);
    setEntries([]);
    localStorage.removeItem(STORAGE_KEYS.DESIGNERS);
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').delete().neq('id', 'placeholder');
        await supabase.from('designers').delete().neq('id', 'placeholder');
      } catch (err) {
        console.error('Erro ao limpar Supabase:', err);
      }
    }
  };

  // Determinar limites de data para o período atual
  const dateBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    const weekStartStr = sevenDaysAgo.toISOString().split('T')[0];

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    switch (periodFilter) {
      case 'today':
        return { start: todayStr, end: todayStr, label: 'Hoje', daysCount: 1 };
      case 'yesterday':
        return { start: yesterdayStr, end: yesterdayStr, label: 'Ontem', daysCount: 1 };
      case 'this_week':
        return { start: weekStartStr, end: todayStr, label: 'Últimos 7 Dias', daysCount: 7 };
      case 'this_month':
        return { start: monthStartStr, end: todayStr, label: 'Este Mês', daysCount: Math.max(1, now.getDate()) };
      case 'custom': {
        const startD = new Date(customRange.start);
        const endD = new Date(customRange.end);
        const diffTime = Math.abs(endD - startD);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return { start: customRange.start, end: customRange.end, label: 'Personalizado', daysCount: Math.max(1, days) };
      }
      case 'all':
      default:
        return { start: '1970-01-01', end: '2099-12-31', label: 'Todo o Histórico', daysCount: 30 };
    }
  }, [periodFilter, customRange]);

  // Entradas filtradas pelo período
  const periodEntries = useMemo(() => {
    return entries.filter((item) => {
      if (!item.date) return false;
      return item.date >= dateBounds.start && item.date <= dateBounds.end;
    });
  }, [entries, dateBounds]);

  // Entradas filtradas completas
  const filteredEntries = useMemo(() => {
    return periodEntries.filter((item) => {
      if (selectedStageFilter !== 'all' && item.stage !== selectedStageFilter) return false;
      if (selectedDesignerFilter !== 'all' && item.designerId !== selectedDesignerFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = item.orderNumber?.toLowerCase().includes(term);
        const matchClient = item.clientName?.toLowerCase().includes(term);
        const matchDesigner = item.designerName?.toLowerCase().includes(term);
        const matchNotes = item.notes?.toLowerCase().includes(term);
        if (!matchNumber && !matchClient && !matchDesigner && !matchNotes) return false;
      }
      return true;
    });
  }, [periodEntries, selectedStageFilter, selectedDesignerFilter, searchTerm]);

  // Cálculos de Métricas & Médias do Setor
  const metrics = useMemo(() => {
    const totalOrders = periodEntries.length;
    let totalPieces = 0;
    let totalMeters = 0;

    const stageCounts = { criacao: 0, exportacao: 0, impressao: 0 };
    const uniqueDates = new Set();

    periodEntries.forEach((item) => {
      totalPieces += Number(item.piecesCount) || 0;
      totalMeters += Number(item.meters) || 0;
      if (item.stage && stageCounts[item.stage] !== undefined) {
        stageCounts[item.stage]++;
      }
      if (item.date) uniqueDates.add(item.date);
    });

    const workingDaysCount = Math.max(1, uniqueDates.size);
    const activeDesigners = designers.filter((d) => d.active);
    const activeDesignersCount = Math.max(1, activeDesigners.length);

    const teamDailyAvgOrders = activeDesigners.length > 0 ? (totalOrders / workingDaysCount) : 0;
    const avgOrdersPerDesigner = activeDesigners.length > 0 ? (totalOrders / activeDesignersCount) : 0;
    const teamDailyAvgMeters = activeDesigners.length > 0 ? (totalMeters / workingDaysCount) : 0;
    const teamDailyAvgPieces = activeDesigners.length > 0 ? (totalPieces / workingDaysCount) : 0;

    const teamDailyGoalOrders = activeDesigners.reduce((acc, d) => acc + (d.dailyGoalOrders || 0), 0);
    const teamPeriodGoalOrders = teamDailyGoalOrders * (dateBounds.daysCount || 1);
    const teamGoalAchievement = teamPeriodGoalOrders > 0
      ? Math.round((totalOrders / teamPeriodGoalOrders) * 100)
      : 100;

    const designerStats = designers.map((des) => {
      const desEntries = periodEntries.filter((e) => e.designerId === des.id);
      const desDates = new Set(desEntries.map((e) => e.date).filter(Boolean));
      const desWorkingDays = Math.max(1, desDates.size);

      const ordersCount = desEntries.length;
      const piecesCount = desEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const metersCount = desEntries.reduce((acc, e) => acc + (Number(e.meters) || 0), 0);

      const criacaoCount = desEntries.filter((e) => e.stage === 'criacao').length;
      const exportacaoCount = desEntries.filter((e) => e.stage === 'exportacao').length;
      const impressaoCount = desEntries.filter((e) => e.stage === 'impressao').length;

      const dailyAvgOrders = Number((ordersCount / desWorkingDays).toFixed(1));
      const dailyAvgPieces = Math.round(piecesCount / desWorkingDays);
      const dailyAvgMeters = Number((metersCount / desWorkingDays).toFixed(1));

      const goalOrders = des.dailyGoalOrders || 8;
      const goalAchievementRate = goalOrders > 0
        ? Math.round((dailyAvgOrders / goalOrders) * 100)
        : 100;

      let performanceStatus = 'Na Meta';
      if (goalAchievementRate >= 115) performanceStatus = 'Superando';
      else if (goalAchievementRate < 85) performanceStatus = 'Abaixo da Meta';

      return {
        ...des,
        ordersCount,
        piecesCount,
        metersCount,
        criacaoCount,
        exportacaoCount,
        impressaoCount,
        workingDays: desDates.size,
        dailyAvgOrders,
        dailyAvgPieces,
        dailyAvgMeters,
        goalAchievementRate,
        performanceStatus
      };
    });

    const rankedDesigners = [...designerStats].sort((a, b) => b.ordersCount - a.ordersCount);

    return {
      totalOrders,
      totalPieces,
      totalMeters: Number(totalMeters.toFixed(1)),
      workingDaysCount: uniqueDates.size || 0,
      activeDesignersCount: activeDesigners.length,
      teamDailyAvgOrders: Number(teamDailyAvgOrders.toFixed(1)),
      avgOrdersPerDesigner: Number(avgOrdersPerDesigner.toFixed(1)),
      teamDailyAvgMeters: Number(teamDailyAvgMeters.toFixed(1)),
      teamDailyAvgPieces: Math.round(teamDailyAvgPieces),
      teamDailyGoalOrders,
      teamPeriodGoalOrders,
      teamGoalAchievement,
      stageCounts,
      designerStats,
      rankedDesigners
    };
  }, [periodEntries, designers, dateBounds]);

  const exportToCSV = () => {
    if (!filteredEntries.length) {
      alert('Nenhum dado encontrado para exportar com os filtros atuais.');
      return;
    }

    const headers = ['ID', 'Data', 'Pedido', 'Cliente', 'Designer', 'Etapa', 'Peças', 'Metros (m)', 'Tipo de Pedido', 'Complexidade', 'Observações'];
    const rows = filteredEntries.map((e) => [
      e.id,
      e.date,
      `"${e.orderNumber || ''}"`,
      `"${(e.clientName || '').replace(/"/g, '""')}"`,
      `"${e.designerName || ''}"`,
      STAGES[e.stage]?.name || e.stage,
      e.piecesCount || 0,
      e.meters || 0,
      e.orderType || '',
      e.complexity || '',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `producao_design_uniformes_${periodFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      designers,
      entries
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_designflow_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (Array.isArray(json.designers) && Array.isArray(json.entries)) {
          setDesigners(json.designers);
          setEntries(json.entries);
          alert('Backup restaurado com sucesso!');
        } else {
          alert('Arquivo JSON com formato inválido.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <ProductionContext.Provider
      value={{
        designers,
        entries,
        periodEntries,
        filteredEntries,
        metrics,
        periodFilter,
        setPeriodFilter,
        customRange,
        setCustomRange,
        dateBounds,
        selectedStageFilter,
        setSelectedStageFilter,
        selectedDesignerFilter,
        setSelectedDesignerFilter,
        searchTerm,
        setSearchTerm,
        addEntry,
        updateEntry,
        deleteEntry,
        addBatchEntries,
        addDesigner,
        updateDesigner,
        deleteDesigner,
        clearAllData,
        exportToCSV,
        exportToJSON,
        importFromJSON,
        isQuickEntryOpen,
        setIsQuickEntryOpen,
        isBatchEntryOpen,
        setIsBatchEntryOpen,
        isReportOpen,
        setIsReportOpen,
        isTeamModalOpen,
        setIsTeamModalOpen,
        isSupabaseModalOpen,
        setIsSupabaseModalOpen,
        isSupabaseActive,
        isLoadingDB,
        editingEntry,
        setEditingEntry
      }}
    >
      {children}
    </ProductionContext.Provider>
  );
}
