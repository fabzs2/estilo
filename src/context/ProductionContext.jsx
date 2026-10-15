import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { INITIAL_DESIGNERS, INITIAL_ORDERS, STAGES, WORK_TYPES } from '../constants/initialData';
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
  ORDERS: 'designflow_orders_v3',
  ENTRIES: 'designflow_entries_v2', // Fallback e compatibilidade
  DESIGNERS: 'designflow_designers_v2'
};

// Função de migração segura: Agrupa lançamentos legados pelo número do pedido
function groupEntriesIntoOrders(flatEntries) {
  if (!Array.isArray(flatEntries) || flatEntries.length === 0) return [];

  const orderMap = new Map();

  flatEntries.forEach((entry, idx) => {
    const rawNumber = (entry.orderNumber || '').trim();
    const key = rawNumber ? rawNumber.toLowerCase() : `ord_leg_${entry.id || idx}`;

    if (!orderMap.has(key)) {
      orderMap.set(key, {
        id: `ord_${rawNumber ? rawNumber.replace(/[^a-zA-Z0-9_-]/g, '_') : Date.now() + '_' + idx}`,
        orderNumber: rawNumber || `PED-${1000 + idx}`,
        clientName: entry.clientName || 'Cliente',
        orderType: entry.orderType || 'sublimacao_total',
        totalPieces: Number(entry.piecesCount) || 0,
        date: entry.date || new Date().toISOString().split('T')[0],
        workType: entry.workType || 'arte_nova',
        notes: entry.notes || '',
        createdAt: entry.createdAt || new Date().toISOString(),
        entries: []
      });
    }

    const order = orderMap.get(key);

    // Ajusta totalPieces se a etapa de impressão trouxer a contagem real de peças
    if (entry.stage === 'impressao' && Number(entry.piecesCount) > 0) {
      order.totalPieces = Number(entry.piecesCount);
    } else if (Number(entry.piecesCount) > Number(order.totalPieces)) {
      order.totalPieces = Number(entry.piecesCount);
    }

    // Vincula o lançamento interno
    order.entries.push({
      id: entry.id || `ent_${Date.now()}_${idx}`,
      stage: entry.stage || 'criacao',
      designerId: entry.designerId || '',
      designerName: entry.designerName || 'Designer',
      date: entry.date || order.date,
      piecesCount: Number(entry.piecesCount) || (entry.stage === 'impressao' ? order.totalPieces : 1),
      meters: Number(entry.meters) || 0,
      workType: entry.workType || order.workType || 'arte_nova',
      notes: entry.notes || '',
      createdAt: entry.createdAt || new Date().toISOString()
    });
  });

  return Array.from(orderMap.values());
}

export function ProductionProvider({ children }) {
  const [isSupabaseActive] = useState(() => isSupabaseConfigured());
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // 1. Designers
  const [designers, setDesigners] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DESIGNERS);
      return saved ? JSON.parse(saved) : INITIAL_DESIGNERS;
    } catch (e) {
      return INITIAL_DESIGNERS;
    }
  });

  // 2. Pedidos com seus Lançamentos Internos
  const [orders, setOrders] = useState(() => {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Se não havia v3, verifica se havia lançamentos no v2 e migra automaticamente
      const savedEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        if (Array.isArray(parsedEntries) && parsedEntries.length > 0) {
          const migrated = groupEntriesIntoOrders(parsedEntries);
          return migrated;
        }
      }
      return INITIAL_ORDERS;
    } catch (e) {
      return INITIAL_ORDERS;
    }
  });

  // Carregar dados remotos do Supabase se configurado
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
          setDesigners(dbDesigners.map(mapDesignerFromDB));
        }

        // Buscar lançamentos e agrupar em pedidos
        const { data: dbEntries, error: entError } = await supabase
          .from('production_entries')
          .select('*')
          .order('date', { ascending: false });

        if (!entError && dbEntries && dbEntries.length > 0) {
          const mappedEntries = dbEntries.map(mapEntryFromDB);
          const groupedOrders = groupEntriesIntoOrders(mappedEntries);
          setOrders(groupedOrders);
        }
      } catch (err) {
        console.error('Erro ao conectar ao Supabase:', err);
      } finally {
        setIsLoadingDB(false);
      }
    }

    loadFromSupabase();
  }, [isSupabaseActive]);

  // Lista plana de lançamentos (derivada de todos os pedidos)
  const entries = useMemo(() => {
    return orders.flatMap((order) =>
      (order.entries || []).map((entry) => ({
        ...entry,
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        orderType: order.orderType,
        totalPieces: order.totalPieces,
        orderDate: order.date
      }))
    );
  }, [orders]);

  // Sincronizar com localStorage como cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DESIGNERS, JSON.stringify(designers));
    } catch (e) {}
  }, [designers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch (e) {}
  }, [orders, entries]);

  // Filtro de período selecionado
  const [periodFilter, setPeriodFilter] = useState('this_week');
  const [customRange, setCustomRange] = useState({
    start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filtros secundários
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedDesignerFilter, setSelectedDesignerFilter] = useState('all');
  const [selectedWorkTypeFilter, setSelectedWorkTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de Pedido & Lançamento
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Modal de Lançamento Específico dentro do Pedido
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [targetOrderForStage, setTargetOrderForStage] = useState(null);
  const [editingStageEntry, setEditingStageEntry] = useState(null);
  const [initialStageForModal, setInitialStageForModal] = useState('criacao');

  // Outros Modais
  const [isBatchEntryOpen, setIsBatchEntryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSectorGoalsModalOpen, setIsSectorGoalsModalOpen] = useState(false);

  // Helpers para abrir modal de lançamento em pedido existente
  const openAddStageToOrder = (order, stage = 'criacao') => {
    setTargetOrderForStage(order);
    setEditingStageEntry(null);
    setInitialStageForModal(stage);
    setIsStageModalOpen(true);
  };

  const openEditStageInOrder = (order, entry) => {
    setTargetOrderForStage(order);
    setEditingStageEntry(entry);
    setInitialStageForModal(entry.stage || 'criacao');
    setIsStageModalOpen(true);
  };

  // Metas Globais do Setor
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

  // ==========================================
  // AÇÕES DE PEDIDOS E LANÇAMENTOS
  // ==========================================

  // Criar Novo Pedido com lançamentos opcionais/iniciais
  const addOrder = async (orderData, stageEntries = []) => {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const formattedEntries = stageEntries.map((stg, idx) => {
      const des = designers.find((d) => d.id === stg.designerId);
      return {
        ...stg,
        id: `ent_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        designerName: des ? des.name : (stg.designerName || 'Designer'),
        workType: stg.workType || orderData.workType || 'arte_nova',
        piecesCount: Number(stg.piecesCount) || 0,
        meters: Number(stg.meters) || 0,
        createdAt: new Date().toISOString()
      };
    });

    const newOrder = {
      ...orderData,
      id: orderId,
      orderNumber: (orderData.orderNumber || '').trim() || `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      totalPieces: Number(orderData.totalPieces) || 0,
      workType: orderData.workType || 'arte_nova',
      createdAt: new Date().toISOString(),
      entries: formattedEntries
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Sincronizar lançamentos com o Supabase
    if (isSupabaseActive && supabase && formattedEntries.length > 0) {
      try {
        const dbEntries = formattedEntries.map((ent) =>
          mapEntryToDB({
            ...ent,
            orderNumber: newOrder.orderNumber,
            clientName: newOrder.clientName,
            orderType: newOrder.orderType
          })
        );
        await supabase.from('production_entries').insert(dbEntries);
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    return newOrder;
  };

  // Atualizar Cabeçalho do Pedido
  const updateOrder = async (orderId, updatedFields) => {
    let updatedOrder = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          updatedOrder = {
            ...ord,
            ...updatedFields,
            totalPieces: Number(updatedFields.totalPieces ?? ord.totalPieces) || 0
          };
          return updatedOrder;
        }
        return ord;
      })
    );

    // Se mudou nome do cliente ou número do pedido, atualiza lançamentos no Supabase
    if (isSupabaseActive && supabase && updatedOrder) {
      try {
        await supabase
          .from('production_entries')
          .update({
            order_number: updatedOrder.orderNumber,
            client_name: updatedOrder.clientName,
            order_type: updatedOrder.orderType
          })
          .eq('order_number', updatedFields.previousOrderNumber || updatedOrder.orderNumber);
      } catch (err) {
        console.error('Erro ao atualizar pedido no Supabase:', err);
      }
    }
  };

  // Excluir Pedido Completo (e todos os seus lançamentos)
  const deleteOrder = async (orderId) => {
    const target = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (isSupabaseActive && supabase && target) {
      try {
        await supabase
          .from('production_entries')
          .delete()
          .eq('order_number', target.orderNumber);
      } catch (err) {
        console.error('Erro ao excluir pedido no Supabase:', err);
      }
    }
  };

  // Adicionar um Novo Lançamento de Etapa a um Pedido Existente
  const addEntryToOrder = async (orderId, newEntryData) => {
    const designer = designers.find((d) => d.id === newEntryData.designerId);
    const newEntry = {
      ...newEntryData,
      id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      designerName: designer ? designer.name : (newEntryData.designerName || 'Designer'),
      workType: newEntryData.workType || 'arte_nova',
      piecesCount: Number(newEntryData.piecesCount) || 0,
      meters: Number(newEntryData.meters) || 0,
      createdAt: new Date().toISOString()
    };

    let targetOrder = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          targetOrder = ord;
          return {
            ...ord,
            entries: [...(ord.entries || []), newEntry]
          };
        }
        return ord;
      })
    );

    if (isSupabaseActive && supabase && targetOrder) {
      try {
        await supabase.from('production_entries').insert(
          mapEntryToDB({
            ...newEntry,
            orderNumber: targetOrder.orderNumber,
            clientName: targetOrder.clientName,
            orderType: targetOrder.orderType
          })
        );
      } catch (err) {
        console.error('Erro ao salvar lançamento no Supabase:', err);
      }
    }

    return newEntry;
  };

  // Atualizar Lançamento de Etapa Existente dentro de um Pedido
  const updateEntryInOrder = async (orderId, entryId, updatedEntryFields) => {
    const designer = designers.find((d) => d.id === updatedEntryFields.designerId);
    let updatedEntry = null;
    let targetOrder = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          targetOrder = ord;
          const updatedEntries = (ord.entries || []).map((ent) => {
            if (ent.id === entryId) {
              updatedEntry = {
                ...ent,
                ...updatedEntryFields,
                designerName: designer ? designer.name : (ent.designerName || 'Designer'),
                piecesCount: Number(updatedEntryFields.piecesCount ?? ent.piecesCount) || 0,
                meters: Number(updatedEntryFields.meters ?? ent.meters) || 0
              };
              return updatedEntry;
            }
            return ent;
          });
          return { ...ord, entries: updatedEntries };
        }
        return ord;
      })
    );

    if (isSupabaseActive && supabase && updatedEntry && targetOrder) {
      try {
        await supabase.from('production_entries').update(
          mapEntryToDB({
            ...updatedEntry,
            orderNumber: targetOrder.orderNumber,
            clientName: targetOrder.clientName,
            orderType: targetOrder.orderType
          })
        ).eq('id', entryId);
      } catch (err) {
        console.error('Erro ao atualizar lançamento no Supabase:', err);
      }
    }
  };

  // Remover Lançamento de Etapa de um Pedido
  const deleteEntryFromOrder = async (orderId, entryId) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            entries: (ord.entries || []).filter((ent) => ent.id !== entryId)
          };
        }
        return ord;
      })
    );

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').delete().eq('id', entryId);
      } catch (err) {
        console.error('Erro ao excluir lançamento no Supabase:', err);
      }
    }
  };

  // Atalhos de Compatibilidade para chamadas antigas
  const addEntry = async (newEntry) => {
    // Cria um pedido com esse lançamento
    return addOrder(
      {
        orderNumber: newEntry.orderNumber,
        clientName: newEntry.clientName,
        orderType: newEntry.orderType || 'sublimacao_total',
        totalPieces: newEntry.piecesCount || 0,
        date: newEntry.date,
        workType: newEntry.workType || 'arte_nova',
        notes: newEntry.notes || ''
      },
      [newEntry]
    );
  };

  const updateEntry = async (entryId, fields) => {
    // Procura o pedido que contém esse entryId
    const targetOrder = orders.find((o) => (o.entries || []).some((e) => e.id === entryId));
    if (targetOrder) {
      return updateEntryInOrder(targetOrder.id, entryId, fields);
    }
  };

  const deleteEntry = async (entryId) => {
    const targetOrder = orders.find((o) => (o.entries || []).some((e) => e.id === entryId));
    if (targetOrder) {
      // Se era o único lançamento do pedido, exclui o pedido também
      if (targetOrder.entries.length <= 1) {
        return deleteOrder(targetOrder.id);
      }
      return deleteEntryFromOrder(targetOrder.id, entryId);
    }
  };

  const addBatchEntries = async (batchItems) => {
    // Agrupa por número de pedido e adiciona
    const grouped = groupEntriesIntoOrders(batchItems);
    for (const ord of grouped) {
      await addOrder(ord, ord.entries);
    }
  };

  // ==========================================
  // AÇÕES DE DESIGNERS
  // ==========================================

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
      // Atualiza nome nos lançamentos internos
      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          entries: (ord.entries || []).map((e) =>
            e.designerId === id ? { ...e, designerName: updatedFields.name } : e
          )
        }))
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
    setOrders([]);
    localStorage.removeItem(STORAGE_KEYS.DESIGNERS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
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
      alert(`✅ Sincronização concluída com sucesso!\n\n${designers.length} designer(s) e ${orders.length} pedido(s) foram sincronizados com o Supabase.`);
    } catch (err) {
      console.error('Erro ao sincronizar com Supabase:', err);
      alert(`Erro na sincronização: ${err.message}`);
    } finally {
      setIsLoadingDB(false);
    }
  };

  const refreshFromSupabase = async () => {
    if (!isSupabaseActive || !supabase) return;
    setIsLoadingDB(true);
    try {
      const { data: dbDes } = await supabase.from('designers').select('*').order('name');
      if (dbDes) setDesigners(dbDes.map(mapDesignerFromDB));

      const { data: dbEnt } = await supabase.from('production_entries').select('*').order('date', { ascending: false });
      if (dbEnt) {
        const mappedEntries = dbEnt.map(mapEntryFromDB);
        setOrders(groupEntriesIntoOrders(mappedEntries));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDB(false);
    }
  };

  // ==========================================
  // FILTRAGEM POR PERÍODO & VISUALIZAÇÕES
  // ==========================================

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

  // Pedidos que pertencem ao período (pela data do pedido ou por algum lançamento no período)
  const periodOrders = useMemo(() => {
    return orders.filter((ord) => {
      const orderDateMatch = ord.date && ord.date >= dateBounds.start && ord.date <= dateBounds.end;
      const entryDateMatch = (ord.entries || []).some(
        (e) => e.date && e.date >= dateBounds.start && e.date <= dateBounds.end
      );
      return orderDateMatch || entryDateMatch;
    });
  }, [orders, dateBounds]);

  // Lançamentos no período (para alimentar produtividade e médias)
  const periodEntries = useMemo(() => {
    return entries.filter((item) => {
      if (!item.date) return false;
      return item.date >= dateBounds.start && item.date <= dateBounds.end;
    });
  }, [entries, dateBounds]);

  // Pedidos Filtrados (para exibição na OrdersTable)
  const filteredOrders = useMemo(() => {
    return periodOrders.filter((ord) => {
      // 1. Filtro por Etapa
      if (selectedStageFilter !== 'all') {
        const hasStage = (ord.entries || []).some((e) => e.stage === selectedStageFilter);
        if (!hasStage) return false;
      }

      // 2. Filtro por Designer
      if (selectedDesignerFilter !== 'all') {
        const hasDesigner = (ord.entries || []).some((e) => e.designerId === selectedDesignerFilter);
        if (!hasDesigner) return false;
      }

      // 3. Filtro por Tipo de Lançamento (Arte Nova, Ajuste, Reposição)
      if (selectedWorkTypeFilter !== 'all') {
        const matchOrderWork = (ord.workType || 'arte_nova') === selectedWorkTypeFilter;
        const matchEntryWork = (ord.entries || []).some(
          (e) => (e.workType || 'arte_nova') === selectedWorkTypeFilter
        );
        if (!matchOrderWork && !matchEntryWork) return false;
      }

      // 4. Termo de Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = ord.orderNumber?.toLowerCase().includes(term);
        const matchClient = ord.clientName?.toLowerCase().includes(term);
        const matchNotes = ord.notes?.toLowerCase().includes(term);
        const matchDesigner = (ord.entries || []).some((e) =>
          e.designerName?.toLowerCase().includes(term)
        );
        if (!matchNum && !matchClient && !matchNotes && !matchDesigner) return false;
      }

      return true;
    });
  }, [periodOrders, selectedStageFilter, selectedDesignerFilter, selectedWorkTypeFilter, searchTerm]);

  // Lançamentos filtrados (compatibilidade com CSV)
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

  // ==========================================
  // CÁLCULOS DE MÉTRICAS & PRODUTIVIDADE
  // ==========================================

  const metrics = useMemo(() => {
    // TOTAL DE PEDIDOS: rigorosamente a quantidade de PEDIDOS ÚNICOS no período!
    const totalOrders = periodOrders.length;

    let totalPieces = 0;
    let totalMeters = 0;
    let impressaoTotalPieces = 0;

    const uniqueDates = new Set();

    // Contagem detalhada por categoria
    const criacaoEntriesAll = periodEntries.filter((e) => e.stage === 'criacao');
    const exportacaoEntriesAll = periodEntries.filter((e) => e.stage === 'exportacao');
    const impressaoEntriesAll = periodEntries.filter((e) => e.stage === 'impressao');

    // Criação: total de artes
    const criacaoTotalArtes = criacaoEntriesAll.reduce(
      (acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1),
      0
    );

    // Exportação: total de fechamentos
    const exportacaoTotalCount = exportacaoEntriesAll.reduce(
      (acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1),
      0
    );

    // Impressão: estritamente SOMENTE PEÇAS IMPRESSAS
    impressaoEntriesAll.forEach((e) => {
      impressaoTotalPieces += Number(e.piecesCount) || 0;
    });

    // Peças gerais somadas a partir dos pedidos do período
    totalPieces = periodOrders.reduce((acc, ord) => acc + (Number(ord.totalPieces) || 0), 0);

    periodEntries.forEach((item) => {
      totalMeters += Number(item.meters) || 0;
      if (item.date) uniqueDates.add(item.date);
    });

    // Se nenhum lançamento teve data específica, usa as datas dos pedidos
    if (uniqueDates.size === 0) {
      periodOrders.forEach((ord) => {
        if (ord.date) uniqueDates.add(ord.date);
      });
    }

    const workingDaysCount = Math.max(1, uniqueDates.size);
    const activeDesigners = designers.filter((d) => d.active);
    const activeDesignersCount = Math.max(1, activeDesigners.length);

    // Médias Diárias Globais do Setor
    const teamDailyAvgOrders = activeDesigners.length > 0 ? totalOrders / workingDaysCount : 0;
    const avgOrdersPerDesigner = activeDesigners.length > 0 ? totalOrders / activeDesignersCount : 0;

    // Médias Diárias Específicas por Categoria
    const teamDailyAvgCriacao = activeDesigners.length > 0 ? criacaoTotalArtes / workingDaysCount : 0;
    const teamDailyAvgExportacao = activeDesigners.length > 0 ? exportacaoTotalCount / workingDaysCount : 0;
    const teamDailyAvgImpressaoPieces = activeDesigners.length > 0 ? Math.round(impressaoTotalPieces / workingDaysCount) : 0;

    // Metas Globais do Setor
    const calculatedTeamGoalCriacao = activeDesigners.reduce((acc, d) => acc + (Number(d.goalCriacaoArtes) || 0), 0);
    const calculatedTeamGoalExportacao = activeDesigners.reduce((acc, d) => acc + (Number(d.goalExportacao) || 0), 0);
    const calculatedTeamGoalImpressaoPieces = activeDesigners.reduce((acc, d) => acc + (Number(d.goalImpressaoPecas) || 0), 0);

    const teamDailyGoalCriacao =
      sectorGoals?.criacao !== undefined && sectorGoals?.criacao !== null
        ? Number(sectorGoals.criacao)
        : (calculatedTeamGoalCriacao || 8);

    const teamDailyGoalExportacao =
      sectorGoals?.exportacao !== undefined && sectorGoals?.exportacao !== null
        ? Number(sectorGoals.exportacao)
        : (calculatedTeamGoalExportacao || 10);

    const teamDailyGoalImpressaoPieces =
      sectorGoals?.impressao !== undefined && sectorGoals?.impressao !== null
        ? Number(sectorGoals.impressao)
        : (calculatedTeamGoalImpressaoPieces || 120);

    // Estatísticas Individuais por Designer (somando todos os lançamentos em que atuou)
    const designerStats = designers.map((des) => {
      const desEntries = periodEntries.filter((e) => e.designerId === des.id);
      const desDates = new Set(desEntries.map((e) => e.date).filter(Boolean));
      const desWorkingDays = Math.max(1, desDates.size);

      // Quantos pedidos distintos ele tocou no período
      const distinctOrdersCount = new Set(desEntries.map((e) => e.orderNumber || e.orderId)).size;
      const ordersCount = distinctOrdersCount > 0 ? distinctOrdersCount : desEntries.length;

      const piecesCount = desEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const metersCount = desEntries.reduce((acc, e) => acc + (Number(e.meters) || 0), 0);

      // Quantidades por Categoria
      const desCriacaoEntries = desEntries.filter((e) => e.stage === 'criacao');
      const desExportacaoEntries = desEntries.filter((e) => e.stage === 'exportacao');
      const desImpressaoEntries = desEntries.filter((e) => e.stage === 'impressao');

      const criacaoCount = desCriacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      const exportacaoCount = desExportacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      const impressaoPieces = desImpressaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const impressaoCount = desImpressaoEntries.length;

      // Médias Diárias
      const dailyAvgCriacao = Number((criacaoCount / desWorkingDays).toFixed(1));
      const dailyAvgExportacao = Number((exportacaoCount / desWorkingDays).toFixed(1));
      const dailyAvgImpressaoPieces = Math.round(impressaoPieces / desWorkingDays);
      const dailyAvgOrders = Number((ordersCount / desWorkingDays).toFixed(1));

      // Metas
      const goalCriacao = des.goalCriacaoArtes !== undefined && des.goalCriacaoArtes !== null ? Number(des.goalCriacaoArtes) : 8;
      const goalExportacao = des.goalExportacao !== undefined && des.goalExportacao !== null ? Number(des.goalExportacao) : 10;
      const goalImpressaoPieces = des.goalImpressaoPecas !== undefined && des.goalImpressaoPecas !== null ? Number(des.goalImpressaoPecas) : 120;

      // Taxas
      const rateCriacao = goalCriacao > 0 ? Math.round((dailyAvgCriacao / goalCriacao) * 100) : null;
      const rateExportacao = goalExportacao > 0 ? Math.round((dailyAvgExportacao / goalExportacao) * 100) : null;
      const rateImpressao = goalImpressaoPieces > 0 ? Math.round((dailyAvgImpressaoPieces / goalImpressaoPieces) * 100) : null;

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

    const rankedDesigners = [...designerStats].sort((a, b) => {
      if (b.goalAchievementRate !== a.goalAchievementRate) {
        return (b.goalAchievementRate || 0) - (a.goalAchievementRate || 0);
      }
      return (b.ordersCount || 0) - (a.ordersCount || 0);
    });

    // Lead Time e Tempo de Ciclo calculado nos pedidos
    const leadTimeDiffs = [];
    const criacaoToExportDiffs = [];
    let completedCyclesCount = 0;

    orders.forEach((ord) => {
      const orderEntries = ord.entries || [];
      const criacaoEntry = orderEntries.find((e) => e.stage === 'criacao' && e.date);
      const exportacaoEntry = orderEntries.find((e) => e.stage === 'exportacao' && e.date);
      const impressaoEntry = orderEntries.find((e) => e.stage === 'impressao' && e.date);

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

    const avgLeadTimeDays =
      leadTimeDiffs.length > 0
        ? Number((leadTimeDiffs.reduce((a, b) => a + b, 0) / leadTimeDiffs.length).toFixed(1))
        : null;

    const avgDaysToExport =
      criacaoToExportDiffs.length > 0
        ? Number((criacaoToExportDiffs.reduce((a, b) => a + b, 0) / criacaoToExportDiffs.length).toFixed(1))
        : null;

    const leadTimeStats = {
      avgLeadTimeDays,
      avgDaysToExport,
      completedCyclesCount,
      totalTrackedOrders: orders.length
    };

    // Linha do Tempo Diária
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

    // Contagem de Tipos de Lançamento
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
  }, [periodOrders, periodEntries, orders, designers, dateBounds, sectorGoals]);

  // Exportar dados em CSV
  const exportToCSV = () => {
    if (!filteredOrders.length) {
      alert('Nenhum dado encontrado para exportar com os filtros atuais.');
      return;
    }

    const headers = ['ID Pedido', 'Data', 'Nº Pedido', 'Cliente', 'Qtd Peças', 'Tipo Uniforme', 'Lançamento', 'Etapa', 'Responsável', 'Qtd Produzida', 'Metros (m)', 'Obs'];
    const rows = [];

    filteredOrders.forEach((ord) => {
      if (!ord.entries || ord.entries.length === 0) {
        rows.push([
          ord.id,
          ord.date,
          `"${ord.orderNumber || ''}"`,
          `"${(ord.clientName || '').replace(/"/g, '""')}"`,
          ord.totalPieces || 0,
          ord.orderType || '',
          WORK_TYPES[ord.workType]?.name || 'Arte Nova',
          'Sem Lançamento',
          '—',
          0,
          0,
          `"${(ord.notes || '').replace(/"/g, '""')}"`
        ]);
      } else {
        ord.entries.forEach((ent) => {
          rows.push([
            ord.id,
            ent.date || ord.date,
            `"${ord.orderNumber || ''}"`,
            `"${(ord.clientName || '').replace(/"/g, '""')}"`,
            ord.totalPieces || 0,
            ord.orderType || '',
            WORK_TYPES[ent.workType || ord.workType]?.name || 'Arte Nova',
            STAGES[ent.stage]?.name || ent.stage,
            `"${ent.designerName || ''}"`,
            ent.piecesCount || 0,
            ent.meters || 0,
            `"${(ent.notes || ord.notes || '').replace(/"/g, '""')}"`
          ]);
        });
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedidos_producao_${periodFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup JSON
  const exportToJSON = () => {
    const data = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      designers,
      orders,
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
        if (Array.isArray(json.designers)) {
          setDesigners(json.designers);
        }
        if (Array.isArray(json.orders)) {
          setOrders(json.orders);
          alert('Backup com pedidos e lançamentos restaurado com sucesso!');
        } else if (Array.isArray(json.entries)) {
          // Migra entradas para pedidos
          setOrders(groupEntriesIntoOrders(json.entries));
          alert('Backup restaurado com sucesso (lançamentos agrupados em pedidos)!');
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
        orders,
        entries,
        periodOrders,
        periodEntries,
        filteredOrders,
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
        selectedWorkTypeFilter,
        setSelectedWorkTypeFilter,
        searchTerm,
        setSearchTerm,
        // Funções de Pedidos
        addOrder,
        updateOrder,
        deleteOrder,
        // Funções de Lançamentos dentro do Pedido
        addEntryToOrder,
        updateEntryInOrder,
        deleteEntryFromOrder,
        // Compatibilidade legada
        addEntry,
        updateEntry,
        deleteEntry,
        addBatchEntries,
        // Designers
        addDesigner,
        updateDesigner,
        deleteDesigner,
        clearAllData,
        exportToCSV,
        exportToJSON,
        importFromJSON,
        // Modais de Pedido
        isQuickEntryOpen,
        setIsQuickEntryOpen,
        editingOrder,
        setEditingOrder,
        // Modais de Lançamento no Pedido
        isStageModalOpen,
        setIsStageModalOpen,
        targetOrderForStage,
        setTargetOrderForStage,
        editingStageEntry,
        setEditingStageEntry,
        initialStageForModal,
        openAddStageToOrder,
        openEditStageInOrder,
        // Outros modais
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
        refreshFromSupabase
      }}
    >
      {children}
    </ProductionContext.Provider>
  );
}
