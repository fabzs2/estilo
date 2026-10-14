import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { INITIAL_DESIGNERS, INITIAL_ENTRIES, STAGES, WORK_TYPES } from '../constants/initialData';
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
  const [selectedWorkTypeFilter, setSelectedWorkTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isBatchEntryOpen, setIsBatchEntryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSectorGoalsModalOpen, setIsSectorGoalsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [advanceStageData, setAdvanceStageData] = useState(null);

  const openAdvanceStage = (entry, targetStage) => {
    setAdvanceStageData({
      orderNumber: entry.orderNumber,
      clientName: entry.clientName,
      orderType: entry.orderType || 'sublimacao_total',
      totalPieces: entry.piecesCount || '',
      notes: entry.notes || '',
      targetStage: targetStage // 'exportacao' | 'impressao'
    });
    setEditingEntry(null);
    setIsQuickEntryOpen(true);
  };

  // Metas Globais do Setor (Personalizadas por Categoria ou calculadas pela equipe)
  const [sectorGoals, setSectorGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('designflow_sector_goals');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const updateSectorGoals = (newGoals) => {
    setSectorGoals(newGoals);
    try {
      localStorage.setItem('designflow_sector_goals', JSON.stringify(newGoals));
    } catch (e) {}
  };

  const resetSectorGoals = () => {
    setSectorGoals(null);
    try {
      localStorage.removeItem('designflow_sector_goals');
    } catch (e) {}
  };

  // Ações de Entradas
  const addEntry = async (newEntry) => {
    const designer = designers.find((d) => d.id === newEntry.designerId);
    const item = {
      ...newEntry,
      id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      designerName: designer ? designer.name : 'Designer',
      workType: newEntry.workType || 'arte_nova',
      piecesCount: Number(newEntry.piecesCount) || 0,
      meters: Number(newEntry.meters) || 0,
      createdAt: new Date().toISOString()
    };

    setEntries((prev) => [item, ...prev]);

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('production_entries').insert(mapEntryToDB(item));
        if (error) {
          console.error('Erro ao salvar pedido no Supabase:', error);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            alert('Aviso do Supabase:\n\nA tabela "production_entries" ainda não existe no seu banco de dados Supabase!\n\nExecute o script do arquivo supabase_schema.sql no SQL Editor do Supabase para criar as tabelas.');
          } else {
            console.warn('Supabase erro:', error.message);
          }
        }
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
        const { error } = await supabase.from('production_entries').update(mapEntryToDB(updatedItem)).eq('id', id);
        if (error) console.error('Erro ao atualizar no Supabase:', error);
      } catch (err) {
        console.error('Erro ao atualizar no Supabase:', err);
      }
    }
  };

  const deleteEntry = async (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('production_entries').delete().eq('id', id);
        if (error) console.error('Erro ao deletar do Supabase:', error);
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
        workType: item.workType || 'arte_nova',
        piecesCount: Number(item.piecesCount) || 0,
        meters: Number(item.meters) || 0,
        createdAt: new Date().toISOString()
      };
    });

    setEntries((prev) => [...formatted, ...prev]);

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('production_entries').insert(formatted.map(mapEntryToDB));
        if (error) console.error('Erro ao salvar lote no Supabase:', error);
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
      goalCriacaoArtes: Number(newDes.goalCriacaoArtes) || 8,
      goalExportacao: Number(newDes.goalExportacao) || 10,
      goalImpressaoPecas: Number(newDes.goalImpressaoPecas) || 120,
      dailyGoalOrders: Number(newDes.dailyGoalOrders) || 8,
      dailyGoalMeters: Number(newDes.dailyGoalMeters) || 0,
      dailyGoalPieces: Number(newDes.dailyGoalPieces) || 50
    };

    setDesigners((prev) => [...prev, designer]);

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('designers').insert(mapDesignerToDB(designer));
        if (error) {
          console.error('Erro ao salvar designer no Supabase:', error);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            alert('Aviso do Supabase:\n\nA tabela "designers" ainda NÃO EXISTE no seu projeto do Supabase!\n\nNo Supabase, as tabelas não são criadas automaticamente pela tela. Você precisa abrir o painel do Supabase, ir no menu "SQL Editor" e rodar o script SQL para criar as tabelas.');
          } else {
            alert(`Aviso ao salvar designer no Supabase: ${error.message}`);
          }
        }
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

  // Enviar dados locais para o Supabase (para migrar dados criados no PC local)
  const syncLocalToSupabase = async () => {
    if (!isSupabaseActive || !supabase) {
      alert('Conecte o Supabase primeiro nas configurações.');
      return;
    }
    try {
      setIsLoadingDB(true);
      if (designers.length > 0) {
        const { error: desErr } = await supabase.from('designers').upsert(designers.map(mapDesignerToDB));
        if (desErr) throw desErr;
      }
      if (entries.length > 0) {
        const { error: entErr } = await supabase.from('production_entries').upsert(entries.map(mapEntryToDB));
        if (entErr) throw entErr;
      }
      alert(`✅ Sincronização concluída com sucesso!\n\n${designers.length} designer(s) e ${entries.length} pedido(s) foram enviados para o Supabase na nuvem e agora estarão visíveis de qualquer PC ou celular.`);
    } catch (err) {
      console.error('Erro ao sincronizar com Supabase:', err);
      if (err.code === '42P01' || err.message?.includes('does not exist')) {
        alert('Atenção: A tabela no Supabase ainda não foi criada. Execute o script SQL no SQL Editor do Supabase primeiro.');
      } else {
        alert(`Erro na sincronização: ${err.message}`);
      }
    } finally {
      setIsLoadingDB(false);
    }
  };

  // Recarregar dados mais recentes do Supabase
  const refreshFromSupabase = async () => {
    if (!isSupabaseActive || !supabase) return;
    setIsLoadingDB(true);
    try {
      const { data: dbDes, error: desErr } = await supabase.from('designers').select('*').order('name');
      if (!desErr && dbDes) {
        setDesigners(dbDes.map(mapDesignerFromDB));
      }
      const { data: dbEnt, error: entErr } = await supabase.from('production_entries').select('*').order('date', { ascending: false });
      if (!entErr && dbEnt) {
        setEntries(dbEnt.map(mapEntryFromDB));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDB(false);
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
      if (selectedWorkTypeFilter !== 'all' && (item.workType || 'arte_nova') !== selectedWorkTypeFilter) return false;
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
  }, [periodEntries, selectedStageFilter, selectedDesignerFilter, selectedWorkTypeFilter, searchTerm]);

  // Cálculos de Métricas & Médias do Setor por Categoria
  const metrics = useMemo(() => {
    const totalOrders = periodEntries.length;
    let totalPieces = 0;
    let totalMeters = 0;
    let impressaoTotalPieces = 0;

    const uniqueDates = new Set();

    // Contagem detalhada por categoria
    const criacaoEntriesAll = periodEntries.filter((e) => e.stage === 'criacao');
    const exportacaoEntriesAll = periodEntries.filter((e) => e.stage === 'exportacao');
    const impressaoEntriesAll = periodEntries.filter((e) => e.stage === 'impressao');

    // Criação: total de artes (se o pedido tiver piecesCount > 0 conta o número de artes, senão 1 arte por registro)
    const criacaoTotalArtes = criacaoEntriesAll.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
    // Exportação: total de fechamentos/exportações (se o pedido tiver piecesCount > 0 conta a qtd, senão 1 exp por registro)
    const exportacaoTotalCount = exportacaoEntriesAll.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
    // Impressão: estritamente SOMENTE PEÇAS IMPRESSAS
    impressaoEntriesAll.forEach((e) => {
      impressaoTotalPieces += Number(e.piecesCount) || 0;
    });

    periodEntries.forEach((item) => {
      totalPieces += Number(item.piecesCount) || 0;
      totalMeters += Number(item.meters) || 0;
      if (item.date) uniqueDates.add(item.date);
    });

    const workingDaysCount = Math.max(1, uniqueDates.size);
    const activeDesigners = designers.filter((d) => d.active);
    const activeDesignersCount = Math.max(1, activeDesigners.length);

    // Médias Diárias Globais do Setor
    const teamDailyAvgOrders = activeDesigners.length > 0 ? (totalOrders / workingDaysCount) : 0;
    const avgOrdersPerDesigner = activeDesigners.length > 0 ? (totalOrders / activeDesignersCount) : 0;
    
    // Médias Diárias Específicas por Categoria
    // Criação: artes diárias
    const teamDailyAvgCriacao = activeDesigners.length > 0 ? (criacaoTotalArtes / workingDaysCount) : 0;
    // Exportação: exportações diárias
    const teamDailyAvgExportacao = activeDesigners.length > 0 ? (exportacaoTotalCount / workingDaysCount) : 0;
    // Impressão: somente peças impressas diárias
    const teamDailyAvgImpressaoPieces = activeDesigners.length > 0 ? Math.round(impressaoTotalPieces / workingDaysCount) : 0;

    // Metas Globais do Setor (personalizadas ou calculadas a partir da soma dos designers com meta > 0)
    const calculatedTeamGoalCriacao = activeDesigners.reduce((acc, d) => acc + (Number(d.goalCriacaoArtes) || 0), 0);
    const calculatedTeamGoalExportacao = activeDesigners.reduce((acc, d) => acc + (Number(d.goalExportacao) || 0), 0);
    const calculatedTeamGoalImpressaoPieces = activeDesigners.reduce((acc, d) => acc + (Number(d.goalImpressaoPecas) || 0), 0);

    const teamDailyGoalCriacao = sectorGoals?.criacao !== undefined && sectorGoals?.criacao !== null
      ? Number(sectorGoals.criacao)
      : (calculatedTeamGoalCriacao || 8);

    const teamDailyGoalExportacao = sectorGoals?.exportacao !== undefined && sectorGoals?.exportacao !== null
      ? Number(sectorGoals.exportacao)
      : (calculatedTeamGoalExportacao || 10);

    const teamDailyGoalImpressaoPieces = sectorGoals?.impressao !== undefined && sectorGoals?.impressao !== null
      ? Number(sectorGoals.impressao)
      : (calculatedTeamGoalImpressaoPieces || 120);

    // Estatísticas Individuais por Designer
    const designerStats = designers.map((des) => {
      const desEntries = periodEntries.filter((e) => e.designerId === des.id);
      const desDates = new Set(desEntries.map((e) => e.date).filter(Boolean));
      const desWorkingDays = Math.max(1, desDates.size);

      const ordersCount = desEntries.length;
      const piecesCount = desEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const metersCount = desEntries.reduce((acc, e) => acc + (Number(e.meters) || 0), 0);

      // Quantidades por Categoria do Designer
      const desCriacaoEntries = desEntries.filter((e) => e.stage === 'criacao');
      const desExportacaoEntries = desEntries.filter((e) => e.stage === 'exportacao');
      const desImpressaoEntries = desEntries.filter((e) => e.stage === 'impressao');

      // Criação: artes diárias
      const criacaoCount = desCriacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      // Exportação: exportações diárias
      const exportacaoCount = desExportacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      // Impressão: somente peças impressas
      const impressaoPieces = desImpressaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const impressaoCount = desImpressaoEntries.length;

      // Médias Diárias Específicas
      const dailyAvgCriacao = Number((criacaoCount / desWorkingDays).toFixed(1)); // artes/dia
      const dailyAvgExportacao = Number((exportacaoCount / desWorkingDays).toFixed(1)); // exportações/dia
      const dailyAvgImpressaoPieces = Math.round(impressaoPieces / desWorkingDays); // peças impressas/dia
      const dailyAvgOrders = Number((ordersCount / desWorkingDays).toFixed(1));

      // Metas do Designer (0 se não atuar na categoria)
      const goalCriacao = des.goalCriacaoArtes !== undefined && des.goalCriacaoArtes !== null ? Number(des.goalCriacaoArtes) : 8;
      const goalExportacao = des.goalExportacao !== undefined && des.goalExportacao !== null ? Number(des.goalExportacao) : 10;
      const goalImpressaoPieces = des.goalImpressaoPecas !== undefined && des.goalImpressaoPecas !== null ? Number(des.goalImpressaoPecas) : 120;

      // Taxas de Atingimento por Categoria (null se meta for 0 / desativada para este designer)
      const rateCriacao = goalCriacao > 0 ? Math.round((dailyAvgCriacao / goalCriacao) * 100) : null;
      const rateExportacao = goalExportacao > 0 ? Math.round((dailyAvgExportacao / goalExportacao) * 100) : null;
      const rateImpressao = goalImpressaoPieces > 0 ? Math.round((dailyAvgImpressaoPieces / goalImpressaoPieces) * 100) : null;

      // Determinar Etapa Principal e Avaliação Geral estritamente com base nas metas ativas (> 0)
      const activeRates = [];
      if (goalCriacao > 0 && rateCriacao !== null) activeRates.push(rateCriacao);
      if (goalExportacao > 0 && rateExportacao !== null) activeRates.push(rateExportacao);
      if (goalImpressaoPieces > 0 && rateImpressao !== null) activeRates.push(rateImpressao);

      let goalAchievementRate = 100;
      let performanceStatus = 'Na Meta';

      if (activeRates.length === 0) {
        goalAchievementRate = 100;
        performanceStatus = 'Sem Meta';
      } else {
        goalAchievementRate = Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length);
        if (goalAchievementRate >= 115) performanceStatus = 'Superando';
        else if (goalAchievementRate < 85) performanceStatus = 'Abaixo da Meta';
        else performanceStatus = 'Na Meta';
      }

      // Identificar especialidade dominante para visualização
      const roleLower = (des.role || '').toLowerCase();
      let primaryStage = 'geral';
      if (goalImpressaoPieces > 0 && goalCriacao === 0 && goalExportacao === 0) primaryStage = 'impressao';
      else if (goalExportacao > 0 && goalCriacao === 0 && goalImpressaoPieces === 0) primaryStage = 'exportacao';
      else if (goalCriacao > 0 && goalExportacao === 0 && goalImpressaoPieces === 0) primaryStage = 'criacao';
      else if (roleLower.includes('impress') || roleLower.includes('rip')) primaryStage = 'impressao';
      else if (roleLower.includes('export') || roleLower.includes('fechamento')) primaryStage = 'exportacao';
      else if (roleLower.includes('cria') || roleLower.includes('arte')) primaryStage = 'criacao';

      return {
        ...des,
        ordersCount,
        piecesCount,
        metersCount,
        criacaoCount,
        exportacaoCount,
        impressaoCount,
        impressaoPieces,
        workingDays: desDates.size,
        dailyAvgOrders,
        dailyAvgCriacao,
        dailyAvgExportacao,
        dailyAvgImpressaoPieces,
        goalCriacaoArtes: goalCriacao,
        goalExportacao: goalExportacao,
        goalImpressaoPecas: goalImpressaoPieces,
        rateCriacao,
        rateExportacao,
        rateImpressao,
        primaryStage,
        goalAchievementRate,
        performanceStatus
      };
    });

    // 1. Cálculo de Lead Time / Tempo de Ciclo entre etapas (da Criação à Impressão)
    const orderGroups = new Map();
    entries.forEach((e) => {
      if (!e.orderNumber) return;
      const key = e.orderNumber.trim().toLowerCase();
      if (!orderGroups.has(key)) {
        orderGroups.set(key, []);
      }
      orderGroups.get(key).push(e);
    });

    const leadTimeDiffs = [];
    const criacaoToExportDiffs = [];
    let completedCyclesCount = 0;

    orderGroups.forEach((groupEntries) => {
      const criacaoEntry = groupEntries.find((e) => e.stage === 'criacao' && e.date);
      const exportacaoEntry = groupEntries.find((e) => e.stage === 'exportacao' && e.date);
      const impressaoEntry = groupEntries.find((e) => e.stage === 'impressao' && e.date);

      if (criacaoEntry && impressaoEntry) {
        const dCriacao = new Date(criacaoEntry.date + 'T12:00:00');
        const dImpressao = new Date(impressaoEntry.date + 'T12:00:00');
        const diffDays = Math.max(0, Math.round((dImpressao - dCriacao) / (1000 * 60 * 60 * 24)));
        leadTimeDiffs.push(diffDays);
        completedCyclesCount++;
      }

      if (criacaoEntry && exportacaoEntry) {
        const dCriacao = new Date(criacaoEntry.date + 'T12:00:00');
        const dExportacao = new Date(exportacaoEntry.date + 'T12:00:00');
        const diffDays = Math.max(0, Math.round((dExportacao - dCriacao) / (1000 * 60 * 60 * 24)));
        criacaoToExportDiffs.push(diffDays);
      }
    });

    const avgLeadTimeDays = leadTimeDiffs.length > 0
      ? Number((leadTimeDiffs.reduce((a, b) => a + b, 0) / leadTimeDiffs.length).toFixed(1))
      : null;

    const avgDaysToExport = criacaoToExportDiffs.length > 0
      ? Number((criacaoToExportDiffs.reduce((a, b) => a + b, 0) / criacaoToExportDiffs.length).toFixed(1))
      : null;

    const leadTimeStats = {
      avgLeadTimeDays,
      avgDaysToExport,
      completedCyclesCount,
      totalTrackedOrders: orderGroups.size
    };

    // 2. Linha do Tempo Diária (Evolução por dia de cada etapa no período)
    const timelineMap = new Map();
    const startDate = new Date(dateBounds.start + 'T12:00:00');
    const endDate = new Date(dateBounds.end + 'T12:00:00');
    const diffTime = endDate - startDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 45 && dateBounds.start !== '1970-01-01') {
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const dStr = cur.toISOString().split('T')[0];
        timelineMap.set(dStr, { criacao: 0, exportacao: 0, impressao: 0 });
        cur.setDate(cur.getDate() + 1);
      }
    }

    periodEntries.forEach((entry) => {
      if (!entry.date) return;
      if (!timelineMap.has(entry.date)) {
        timelineMap.set(entry.date, { criacao: 0, exportacao: 0, impressao: 0 });
      }
      const dayData = timelineMap.get(entry.date);
      if (entry.stage === 'criacao') {
        dayData.criacao += Number(entry.piecesCount) > 0 ? Number(entry.piecesCount) : 1;
      } else if (entry.stage === 'exportacao') {
        dayData.exportacao += Number(entry.piecesCount) > 0 ? Number(entry.piecesCount) : 1;
      } else if (entry.stage === 'impressao') {
        dayData.impressao += Number(entry.piecesCount) || 0;
      }
    });

    const sortedDates = Array.from(timelineMap.keys()).sort();
    const displayDates = sortedDates.length > 31 ? sortedDates.slice(-20) : sortedDates;

    const dailyTimeline = {
      labels: displayDates.map((dStr) => {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const dObj = new Date(dStr + 'T12:00:00');
          const dayName = dObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          return `${parts[2]}/${parts[1]} (${dayName})`;
        }
        return dStr;
      }),
      criacao: displayDates.map((d) => timelineMap.get(d)?.criacao || 0),
      exportacao: displayDates.map((d) => timelineMap.get(d)?.exportacao || 0),
      impressao: displayDates.map((d) => timelineMap.get(d)?.impressao || 0),
      dates: displayDates
    };

    // 3. Contagem de Tipos de Lançamento (Arte Nova vs Ajuste/Refação vs Reposição)
    const countArteNova = periodEntries.filter((e) => (e.workType || 'arte_nova') === 'arte_nova').length;
    const countAjuste = periodEntries.filter((e) => e.workType === 'ajuste_refacao').length;
    const countReposicao = periodEntries.filter((e) => e.workType === 'reposicao').length;
    const reworkCount = countAjuste + countReposicao;
    const reworkRate = totalOrders > 0 ? Math.round((reworkCount / totalOrders) * 100) : 0;

    const reworkStats = {
      arteNova: countArteNova,
      ajusteRefacao: countAjuste,
      reposicao: countReposicao,
      reworkCount,
      reworkRate
    };

    return {
      totalOrders,
      totalPieces,
      impressaoTotalPieces,
      totalMeters: Number(totalMeters.toFixed(1)),
      workingDaysCount: uniqueDates.size || 0,
      activeDesignersCount: activeDesigners.length,
      teamDailyAvgOrders: Number(teamDailyAvgOrders.toFixed(1)),
      avgOrdersPerDesigner: Number(avgOrdersPerDesigner.toFixed(1)),
      teamDailyAvgCriacao: Number(teamDailyAvgCriacao.toFixed(1)),
      teamDailyAvgExportacao: Number(teamDailyAvgExportacao.toFixed(1)),
      teamDailyAvgImpressaoPieces: Math.round(teamDailyAvgImpressaoPieces),
      teamDailyGoalCriacao,
      teamDailyGoalExportacao,
      teamDailyGoalImpressaoPieces,
      stageCounts: {
        criacao: criacaoTotalArtes,
        exportacao: exportacaoTotalCount,
        impressao: periodEntries.filter((e) => e.stage === 'impressao').length
      },
      designerStats,
      rankedDesigners,
      leadTimeStats,
      dailyTimeline,
      reworkStats
    };
  }, [periodEntries, entries, designers, dateBounds, sectorGoals]);

  const exportToCSV = () => {
    if (!filteredEntries.length) {
      alert('Nenhum dado encontrado para exportar com os filtros atuais.');
      return;
    }

    const headers = ['ID', 'Data', 'Pedido', 'Cliente', 'Designer', 'Etapa', 'Tipo de Lançamento', 'Peças', 'Metros (m)', 'Tipo de Pedido', 'Complexidade', 'Observações'];
    const rows = filteredEntries.map((e) => [
      e.id,
      e.date,
      `"${e.orderNumber || ''}"`,
      `"${(e.clientName || '').replace(/"/g, '""')}"`,
      `"${e.designerName || ''}"`,
      STAGES[e.stage]?.name || e.stage,
      WORK_TYPES[e.workType]?.name || 'Arte Nova',
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
        isSectorGoalsModalOpen,
        setIsSectorGoalsModalOpen,
        sectorGoals,
        updateSectorGoals,
        resetSectorGoals,
        isSupabaseActive,
        isLoadingDB,
        syncLocalToSupabase,
        refreshFromSupabase,
        editingEntry,
        setEditingEntry,
        advanceStageData,
        setAdvanceStageData,
        openAdvanceStage,
        selectedWorkTypeFilter,
        setSelectedWorkTypeFilter
      }}
    >
      {children}
    </ProductionContext.Provider>
  );
}
