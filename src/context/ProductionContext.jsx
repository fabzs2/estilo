import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  INITIAL_DESIGNERS,
  INITIAL_ORDERS,
  STAGES,
  WORK_TYPES,
  getLocalDateStr,
  getBrazilianHolidays,
  calculateBusinessDays,
  getSampleData
} from '../constants/initialData';
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
  DESIGNERS: 'designflow_designers_v2',
  WORKING_DAYS: 'designflow_working_days_config'
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
        date: entry.date || getLocalDateStr(),
        workType: entry.workType || 'arte_nova',
        notes: entry.notes || '',
        createdAt: entry.createdAt || new Date().toISOString(),
        entries: []
      });
    }

    const order = orderMap.get(key);

    // Ajusta totalPieces se a etapa de impressão ou registro pendente trouxer a contagem real de peças
    if (entry.stage === 'impressao' && Number(entry.piecesCount) > 0) {
      order.totalPieces = Number(entry.piecesCount);
    } else if (Number(entry.piecesCount) > Number(order.totalPieces)) {
      order.totalPieces = Number(entry.piecesCount);
    }

    // Se for apenas um registro de cabeçalho ("pendente" / "aguardando"), não adiciona como etapa concluída
    if (entry.stage === 'pendente' || entry.stage === 'aguardando') {
      return;
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
    } catch {
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
          return groupEntriesIntoOrders(parsedEntries);
        }
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // 3. Configuração de Dias Úteis Reais & Feriados
  const [workingDaysConfig, setWorkingDaysConfig] = useState(() => {
    const defaultHolidays = getBrazilianHolidays(new Date().getFullYear()).map((h) => h.date);
    const defaultConfig = {
      mode: 'calendar', // 'calendar' (Dias Úteis Reais Seg-Sex - Feriados) | 'registered' (Dias com Lançamento) | 'manual' (Fixo)
      includeSaturday: false,
      holidays: defaultHolidays,
      manualDays: 22,
      designerAbsences: {} // { [designerId]: number } -> faltas abonadas / folgas no período
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKING_DAYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultConfig,
          ...parsed,
          holidays: Array.isArray(parsed.holidays) ? parsed.holidays : defaultHolidays,
          designerAbsences: parsed.designerAbsences || {}
        };
      }
      return defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const updateWorkingDaysConfig = (partial) => {
    setWorkingDaysConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEYS.WORKING_DAYS, JSON.stringify(next));
      } catch {
        // Ignora erro de quota
      }
      return next;
    });
  };

  const addHolidayDate = (dateStr) => {
    if (!dateStr) return;
    setWorkingDaysConfig((prev) => {
      if (prev.holidays.includes(dateStr)) return prev;
      const nextHolidays = [...prev.holidays, dateStr].sort();
      const next = { ...prev, holidays: nextHolidays };
      try {
        localStorage.setItem(STORAGE_KEYS.WORKING_DAYS, JSON.stringify(next));
      } catch {
        // Ignora
      }
      return next;
    });
  };

  const removeHolidayDate = (dateStr) => {
    setWorkingDaysConfig((prev) => {
      const nextHolidays = prev.holidays.filter((d) => d !== dateStr);
      const next = { ...prev, holidays: nextHolidays };
      try {
        localStorage.setItem(STORAGE_KEYS.WORKING_DAYS, JSON.stringify(next));
      } catch {
        // Ignora
      }
      return next;
    });
  };

  const resetNationalHolidays = (year = new Date().getFullYear()) => {
    const nat = getBrazilianHolidays(year).map((h) => h.date);
    updateWorkingDaysConfig({ holidays: nat });
  };

  const setDesignerAbsenceDays = (designerId, days) => {
    const cleanDays = Math.max(0, Number(days) || 0);
    setWorkingDaysConfig((prev) => {
      const nextAbsences = { ...(prev.designerAbsences || {}), [designerId]: cleanDays };
      const next = { ...prev, designerAbsences: nextAbsences };
      try {
        localStorage.setItem(STORAGE_KEYS.WORKING_DAYS, JSON.stringify(next));
      } catch {
        // Ignora
      }
      return next;
    });
  };

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
    } catch {
      // Ignora erro de quota
    }
  }, [designers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch {
      // Ignora erro de quota
    }
  }, [orders, entries]);

  // Filtro de período selecionado
  const [periodFilter, setPeriodFilter] = useState('this_week');
  const [customRange, setCustomRange] = useState(() => {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return {
      start: getLocalDateStr(weekAgo),
      end: getLocalDateStr(now)
    };
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
    } catch {
      return null;
    }
  });

  const updateSectorGoals = (newGoals) => {
    setSectorGoals(newGoals);
    try {
      localStorage.setItem('designflow_sector_goals', JSON.stringify(newGoals));
    } catch {
      // Ignora
    }
  };

  const resetSectorGoals = () => {
    setSectorGoals(null);
    try {
      localStorage.removeItem('designflow_sector_goals');
    } catch {
      // Ignora
    }
  };

  // ==========================================
  // AÇÕES DE PEDIDOS E LANÇAMENTOS
  // ==========================================

  // Criar Novo Pedido com lançamentos opcionais/iniciais
  const addOrder = async (orderData, stageEntries = []) => {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const formattedEntries = stageEntries.map((stg, idx) => {
      const des = designers.find((d) => d.id === stg.designerId);
      return {
        ...stg,
        id: `ent_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
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
      date: orderData.date || getLocalDateStr(),
      createdAt: new Date().toISOString(),
      entries: formattedEntries
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Sincronizar com o Supabase
    if (isSupabaseActive && supabase) {
      try {
        if (formattedEntries.length > 0) {
          const dbEntries = formattedEntries.map((ent) =>
            mapEntryToDB({
              ...ent,
              orderNumber: newOrder.orderNumber,
              clientName: newOrder.clientName,
              orderType: newOrder.orderType
            })
          );
          await supabase.from('production_entries').insert(dbEntries);
        } else {
          // Persiste cabeçalho do pedido mesmo quando criado em "Aguardando Início" (sem etapas)
          await supabase.from('production_entries').insert(
            mapEntryToDB({
              id: `pend_${newOrder.id}`,
              orderNumber: newOrder.orderNumber,
              clientName: newOrder.clientName,
              designerId: null,
              designerName: null,
              stage: 'pendente',
              date: newOrder.date,
              piecesCount: newOrder.totalPieces,
              meters: 0,
              orderType: newOrder.orderType,
              workType: newOrder.workType,
              notes: newOrder.notes
            })
          );
        }
      } catch (err) {
        console.error('Erro ao salvar no Supabase:', err);
      }
    }

    return newOrder;
  };

  // Atualizar Cabeçalho do Pedido
  const updateOrder = async (orderId, updatedFields) => {
    const existingOrder = orders.find((o) => o.id === orderId);
    const previousOrderNumber = updatedFields.previousOrderNumber || existingOrder?.orderNumber;
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

    // Sincroniza alterações do cabeçalho no Supabase
    if (isSupabaseActive && supabase && (updatedOrder || existingOrder)) {
      const targetOrd = updatedOrder || { ...existingOrder, ...updatedFields };
      try {
        await supabase
          .from('production_entries')
          .update({
            order_number: targetOrd.orderNumber,
            client_name: targetOrd.clientName,
            order_type: targetOrd.orderType,
            work_type: targetOrd.workType || 'arte_nova'
          })
          .eq('order_number', previousOrderNumber || targetOrd.orderNumber);
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
      id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      designerName: designer ? designer.name : (newEntryData.designerName || 'Designer'),
      workType: newEntryData.workType || 'arte_nova',
      piecesCount: Number(newEntryData.piecesCount) || 0,
      meters: Number(newEntryData.meters) || 0,
      createdAt: new Date().toISOString()
    };

    const targetOrder = orders.find((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedTotalPieces =
            newEntry.stage === 'impressao' && newEntry.piecesCount > 0
              ? newEntry.piecesCount
              : ord.totalPieces;
          return {
            ...ord,
            totalPieces: updatedTotalPieces,
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
        // Remove eventual registro placeholder "pendente" deste pedido
        await supabase
          .from('production_entries')
          .delete()
          .eq('order_number', targetOrder.orderNumber)
          .eq('stage', 'pendente');
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
    const targetOrder = orders.find((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
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
        await supabase
          .from('production_entries')
          .update(
            mapEntryToDB({
              ...updatedEntry,
              orderNumber: targetOrder.orderNumber,
              clientName: targetOrder.clientName,
              orderType: targetOrder.orderType
            })
          )
          .eq('id', entryId);
      } catch (err) {
        console.error('Erro ao atualizar lançamento no Supabase:', err);
      }
    }
  };

  // Remover Lançamento de Etapa de um Pedido
  const deleteEntryFromOrder = async (orderId, entryId) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const remainingEntries = (targetOrder?.entries || []).filter((ent) => ent.id !== entryId);

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            entries: remainingEntries
          };
        }
        return ord;
      })
    );

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('production_entries').delete().eq('id', entryId);
        // Se o pedido ficou sem lançamentos, mantém registro pendente para não perder o pedido ao recarregar
        if (targetOrder && remainingEntries.length === 0) {
          await supabase.from('production_entries').insert(
            mapEntryToDB({
              id: `pend_${targetOrder.id}`,
              orderNumber: targetOrder.orderNumber,
              clientName: targetOrder.clientName,
              designerId: null,
              designerName: null,
              stage: 'pendente',
              date: targetOrder.date,
              piecesCount: targetOrder.totalPieces,
              meters: 0,
              orderType: targetOrder.orderType,
              workType: targetOrder.workType,
              notes: targetOrder.notes
            })
          );
        }
      } catch (err) {
        console.error('Erro ao excluir lançamento no Supabase:', err);
      }
    }
  };

  // Atalhos de Compatibilidade para chamadas antigas
  const addEntry = async (newEntry) => {
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
    const targetOrder = orders.find((o) => (o.entries || []).some((e) => e.id === entryId));
    if (targetOrder) {
      return updateEntryInOrder(targetOrder.id, entryId, fields);
    }
  };

  const deleteEntry = async (entryId) => {
    const targetOrder = orders.find((o) => (o.entries || []).some((e) => e.id === entryId));
    if (targetOrder) {
      if (targetOrder.entries.length <= 1) {
        return deleteOrder(targetOrder.id);
      }
      return deleteEntryFromOrder(targetOrder.id, entryId);
    }
  };

  const addBatchEntries = async (batchItems) => {
    // Agrupa por número de pedido; se o pedido já existir, adiciona etapa nele
    const grouped = groupEntriesIntoOrders(batchItems);
    for (const ord of grouped) {
      const existing = orders.find(
        (o) => (o.orderNumber || '').trim().toLowerCase() === (ord.orderNumber || '').trim().toLowerCase()
      );
      if (existing) {
        for (const ent of ord.entries) {
          await addEntryToOrder(existing.id, ent);
        }
      } else {
        await addOrder(ord, ord.entries);
      }
    }
  };

  // ==========================================
  // AÇÕES DE DESIGNERS
  // ==========================================

  const addDesigner = async (newDes) => {
    const designer = {
      ...newDes,
      id: `des_${Date.now()}`,
      active: newDes.active ?? true,
      goalCriacaoArtes: Number(newDes.goalCriacaoArtes) || 0,
      goalExportacao: Number(newDes.goalExportacao) || 0,
      goalImpressaoPecas: Number(newDes.goalImpressaoPecas) || 0,
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

  const resetToSampleData = async () => {
    const sample = getSampleData();
    setDesigners(sample.designers);
    setOrders(sample.orders);
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

      // Inclui tanto lançamentos reais quanto pedidos sem lançamentos ("pendente")
      const allPayloadEntries = [
        ...entries.map(mapEntryToDB),
        ...orders
          .filter((o) => !o.entries || o.entries.length === 0)
          .map((o) =>
            mapEntryToDB({
              id: `pend_${o.id}`,
              orderNumber: o.orderNumber,
              clientName: o.clientName,
              designerId: null,
              designerName: null,
              stage: 'pendente',
              date: o.date,
              piecesCount: o.totalPieces,
              meters: 0,
              orderType: o.orderType,
              workType: o.workType,
              notes: o.notes
            })
          )
      ];

      if (allPayloadEntries.length > 0) {
        const { error: entErr } = await supabase.from('production_entries').upsert(allPayloadEntries);
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
    const todayStr = getLocalDateStr(now);

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const weekStartStr = getLocalDateStr(sevenDaysAgo);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = getLocalDateStr(monthStart);

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEndStr = getLocalDateStr(monthEnd);

    switch (periodFilter) {
      case 'today':
        return { start: todayStr, end: todayStr, fullEnd: todayStr, label: 'Hoje', daysCount: 1 };
      case 'yesterday':
        return { start: yesterdayStr, end: yesterdayStr, fullEnd: yesterdayStr, label: 'Ontem', daysCount: 1 };
      case 'this_week':
        return { start: weekStartStr, end: todayStr, fullEnd: todayStr, label: 'Últimos 7 Dias', daysCount: 7 };
      case 'this_month':
        return {
          start: monthStartStr,
          end: monthEndStr,
          fullEnd: monthEndStr,
          label: 'Este Mês',
          daysCount: Math.max(1, now.getDate())
        };
      case 'custom': {
        const startD = new Date(customRange.start + 'T12:00:00');
        const endD = new Date(customRange.end + 'T12:00:00');
        const diffTime = Math.abs(endD - startD);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return {
          start: customRange.start,
          end: customRange.end,
          fullEnd: customRange.end,
          label: 'Personalizado',
          daysCount: Math.max(1, days)
        };
      }
      case 'all':
      default:
        return { start: '1970-01-01', end: '2099-12-31', fullEnd: '2099-12-31', label: 'Todo o Histórico', daysCount: 30 };
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
    const totalOrders = periodOrders.length;

    let totalPieces = 0;
    let totalMeters = 0;
    let impressaoTotalPieces = 0;

    const uniqueDates = new Set();

    // Contagem detalhada por categoria
    const criacaoEntriesAll = periodEntries.filter((e) => e.stage === 'criacao');
    const exportacaoEntriesAll = periodEntries.filter((e) => e.stage === 'exportacao');
    const impressaoEntriesAll = periodEntries.filter((e) => e.stage === 'impressao');

    const criacaoTotalArtes = criacaoEntriesAll.reduce(
      (acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1),
      0
    );

    const exportacaoTotalCount = exportacaoEntriesAll.reduce(
      (acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1),
      0
    );

    impressaoEntriesAll.forEach((e) => {
      impressaoTotalPieces += Number(e.piecesCount) || 0;
    });

    totalPieces = periodOrders.reduce((acc, ord) => acc + (Number(ord.totalPieces) || 0), 0);

    periodEntries.forEach((item) => {
      totalMeters += Number(item.meters) || 0;
      if (item.date) uniqueDates.add(item.date);
    });

    if (uniqueDates.size === 0) {
      periodOrders.forEach((ord) => {
        if (ord.date) uniqueDates.add(ord.date);
      });
    }

    const registeredDaysCount = Math.max(1, uniqueDates.size);

    // ====================================================
    // CÁLCULO DE DIAS ÚTEIS REAIS DO PERÍODO E DO MÊS
    // ====================================================
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const monthStartStr = getLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEndStr = getLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    // Dias úteis totais do mês corrente (do dia 1 ao último dia do mês, descontando feriados)
    const fullMonthCalc = calculateBusinessDays(monthStartStr, monthEndStr, {
      includeSaturday: workingDaysConfig.includeSaturday,
      holidays: workingDaysConfig.holidays
    });
    const totalMonthWorkingDays = Math.max(1, fullMonthCalc.count);

    // Dias úteis decorridos no período selecionado (para cálculo justo da média diária até hoje)
    let calendarElapsedDays = registeredDaysCount;
    let calendarTotalPeriodDays = registeredDaysCount;
    let discountedHolidaysInPeriod = [];

    if (periodFilter === 'all') {
      const sortedUnique = Array.from(uniqueDates).sort();
      if (sortedUnique.length > 0) {
        const calcAll = calculateBusinessDays(sortedUnique[0], sortedUnique[sortedUnique.length - 1], {
          includeSaturday: workingDaysConfig.includeSaturday,
          holidays: workingDaysConfig.holidays
        });
        calendarElapsedDays = Math.max(1, calcAll.count);
        calendarTotalPeriodDays = calendarElapsedDays;
        discountedHolidaysInPeriod = calcAll.discountedHolidays;
      }
    } else {
      // Data limite para média diária é no máximo hoje (não divide por dias futuros que ainda não aconteceram!)
      const effectiveEndForAvg = dateBounds.end > todayStr ? todayStr : dateBounds.end;
      const calcElapsed = calculateBusinessDays(dateBounds.start, effectiveEndForAvg, {
        includeSaturday: workingDaysConfig.includeSaturday,
        holidays: workingDaysConfig.holidays
      });
      const calcFullPeriod = calculateBusinessDays(dateBounds.start, dateBounds.fullEnd || dateBounds.end, {
        includeSaturday: workingDaysConfig.includeSaturday,
        holidays: workingDaysConfig.holidays
      });

      calendarElapsedDays = Math.max(1, calcElapsed.count);
      calendarTotalPeriodDays = Math.max(1, calcFullPeriod.count);
      discountedHolidaysInPeriod = calcFullPeriod.discountedHolidays;
    }

    // Define a base oficial de dias úteis conforme o modo escolhido pelo usuário
    let workingDaysCount = registeredDaysCount;
    let targetPeriodDaysCount = calendarTotalPeriodDays;

    if (workingDaysConfig.mode === 'calendar') {
      workingDaysCount = calendarElapsedDays;
      targetPeriodDaysCount = calendarTotalPeriodDays;
    } else if (workingDaysConfig.mode === 'manual') {
      workingDaysCount = Math.max(1, Number(workingDaysConfig.manualDays) || 22);
      targetPeriodDaysCount = workingDaysCount;
    } else {
      // 'registered'
      workingDaysCount = registeredDaysCount;
      targetPeriodDaysCount = periodFilter === 'this_month' ? totalMonthWorkingDays : registeredDaysCount;
    }

    const activeDesigners = designers.filter((d) => d.active !== false);
    const activeDesignersCount = Math.max(1, activeDesigners.length);

    // Médias Diárias Globais do Setor
    const teamDailyAvgOrders = activeDesigners.length > 0 ? totalOrders / workingDaysCount : 0;
    const avgOrdersPerDesigner = activeDesigners.length > 0 ? totalOrders / activeDesignersCount : 0;

    // Médias Diárias Específicas por Categoria
    const teamDailyAvgCriacao = activeDesigners.length > 0 ? criacaoTotalArtes / workingDaysCount : 0;
    const teamDailyAvgExportacao = activeDesigners.length > 0 ? exportacaoTotalCount / workingDaysCount : 0;
    const teamDailyAvgImpressaoPieces = activeDesigners.length > 0 ? Math.round(impressaoTotalPieces / workingDaysCount) : 0;

    // Metas Diárias Globais do Setor (soma apenas designers ativos)
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

    // Metas Acumuladas (Até Hoje no Período) & Meta Mensal Total (Dias Úteis Reais do Mês)
    const effectiveMonthDays = workingDaysConfig.mode === 'manual' ? workingDaysCount : totalMonthWorkingDays;
    const monthGoalCriacao = teamDailyGoalCriacao * effectiveMonthDays;
    const monthGoalExportacao = teamDailyGoalExportacao * effectiveMonthDays;
    const monthGoalImpressaoPieces = teamDailyGoalImpressaoPieces * effectiveMonthDays;

    const elapsedGoalCriacao = teamDailyGoalCriacao * workingDaysCount;
    const elapsedGoalExportacao = teamDailyGoalExportacao * workingDaysCount;
    const elapsedGoalImpressaoPieces = teamDailyGoalImpressaoPieces * workingDaysCount;

    // Estatísticas Individuais por Designer
    const designerStats = designers.map((des) => {
      const desEntries = periodEntries.filter((e) => e.designerId === des.id);
      const desDates = new Set(desEntries.map((e) => e.date).filter(Boolean));
      const absenceDays = Math.max(0, Number(workingDaysConfig.designerAbsences?.[des.id] || 0));

      // Se modo = 'calendar' ou 'manual', usa os dias úteis reais menos as folgas/atestados abonados do designer
      let desWorkingDays = Math.max(1, desDates.size);
      if (workingDaysConfig.mode === 'calendar' || workingDaysConfig.mode === 'manual') {
        desWorkingDays = Math.max(1, workingDaysCount - absenceDays);
      } else {
        desWorkingDays = Math.max(1, desDates.size);
      }

      const distinctOrdersCount = new Set(desEntries.map((e) => e.orderNumber || e.orderId)).size;
      const ordersCount = distinctOrdersCount > 0 ? distinctOrdersCount : desEntries.length;

      const piecesCount = desEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const metersCount = desEntries.reduce((acc, e) => acc + (Number(e.meters) || 0), 0);

      const desCriacaoEntries = desEntries.filter((e) => e.stage === 'criacao');
      const desExportacaoEntries = desEntries.filter((e) => e.stage === 'exportacao');
      const desImpressaoEntries = desEntries.filter((e) => e.stage === 'impressao');

      const criacaoCount = desCriacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      const exportacaoCount = desExportacaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) > 0 ? Number(e.piecesCount) : 1), 0);
      const impressaoPieces = desImpressaoEntries.reduce((acc, e) => acc + (Number(e.piecesCount) || 0), 0);
      const impressaoCount = desImpressaoEntries.length;

      // Médias Diárias Individuais
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

      if (des.active === false) {
        goalAchievementRate = 0;
        performanceStatus = 'Pausado / Férias';
      } else if (activeRates.length === 0) {
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
        workingDays: desWorkingDays,
        registeredDays: desDates.size,
        absenceDays,
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
      if ((a.active !== false) !== (b.active !== false)) {
        return a.active !== false ? -1 : 1;
      }
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
    const effectiveTimelineEnd = dateBounds.end > todayStr && periodFilter === 'this_month' ? todayStr : dateBounds.end;
    const startDate = new Date(dateBounds.start + 'T12:00:00');
    const endDate = new Date(effectiveTimelineEnd + 'T12:00:00');
    const diffTime = endDate - startDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 45 && dateBounds.start !== '1970-01-01') {
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const dStr = getLocalDateStr(cur);
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

    // Contagem de Tipos de Lançamento (Baseada em Pedidos Únicos para que a barra e taxa nunca ultrapassem 100%)
    let countArteNova = 0;
    let countAjuste = 0;
    let countReposicao = 0;

    periodOrders.forEach((ord) => {
      const hasReposicao =
        ord.workType === 'reposicao' ||
        (ord.entries || []).some((e) => e.workType === 'reposicao');
      const hasAjuste =
        ord.workType === 'ajuste_refacao' ||
        (ord.entries || []).some((e) => e.workType === 'ajuste_refacao');

      if (hasReposicao) {
        countReposicao++;
      } else if (hasAjuste) {
        countAjuste++;
      } else {
        countArteNova++;
      }
    });

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
      workingDaysCount,
      registeredDaysCount: uniqueDates.size || 0,
      calendarElapsedDays,
      calendarTotalPeriodDays,
      totalMonthWorkingDays: effectiveMonthDays,
      targetPeriodDaysCount,
      discountedHolidaysInPeriod,
      activeDesignersCount: activeDesigners.length,
      teamDailyAvgOrders: Number(teamDailyAvgOrders.toFixed(1)),
      avgOrdersPerDesigner: Number(avgOrdersPerDesigner.toFixed(1)),
      teamDailyAvgCriacao: Number(teamDailyAvgCriacao.toFixed(1)),
      teamDailyAvgExportacao: Number(teamDailyAvgExportacao.toFixed(1)),
      teamDailyAvgImpressaoPieces: Math.round(teamDailyAvgImpressaoPieces),
      teamDailyGoalCriacao,
      teamDailyGoalExportacao,
      teamDailyGoalImpressaoPieces,
      monthGoalCriacao,
      monthGoalExportacao,
      monthGoalImpressaoPieces,
      elapsedGoalCriacao,
      elapsedGoalExportacao,
      elapsedGoalImpressaoPieces,
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
  }, [periodOrders, periodEntries, orders, designers, dateBounds, sectorGoals, workingDaysConfig, periodFilter]);

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
    link.setAttribute('download', `pedidos_producao_${periodFilter}_${getLocalDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup JSON
  const exportToJSON = () => {
    const data = {
      version: '3.1',
      exportedAt: new Date().toISOString(),
      designers,
      orders,
      entries,
      workingDaysConfig,
      sectorGoals
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_designflow_${getLocalDateStr()}.json`;
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
        if (json.workingDaysConfig) {
          updateWorkingDaysConfig(json.workingDaysConfig);
        }
        if (json.sectorGoals) {
          updateSectorGoals(json.sectorGoals);
        }
        if (Array.isArray(json.orders)) {
          setOrders(json.orders);
          alert('Backup com pedidos e lançamentos restaurado com sucesso!');
        } else if (Array.isArray(json.entries)) {
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
        resetToSampleData,
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
        // Dias Úteis Reais e Feriados
        workingDaysConfig,
        updateWorkingDaysConfig,
        addHolidayDate,
        removeHolidayDate,
        resetNationalHolidays,
        setDesignerAbsenceDays,
        // Supabase
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
