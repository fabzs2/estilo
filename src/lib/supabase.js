import { createClient } from '@supabase/supabase-js';

// Chaves obtidas de variáveis de ambiente ou salvas pelo usuário
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('designflow_supabase_url') || '';
  const localKey = localStorage.getItem('designflow_supabase_anon_key') || '';

  const url = (envUrl || localUrl).trim();
  const key = (envKey || localKey).trim();

  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key && url.startsWith('http'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(config.url, config.key)
  : null;

// Salvar chaves manualmente pelo painel da aplicação
export const saveSupabaseCredentials = (url, key) => {
  if (url && key) {
    localStorage.setItem('designflow_supabase_url', url.trim());
    localStorage.setItem('designflow_supabase_anon_key', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('designflow_supabase_url');
  localStorage.removeItem('designflow_supabase_anon_key');
  window.location.reload();
};

// Conversão Designer: JS (camelCase) <-> DB (snake_case)
export const mapDesignerFromDB = (row) => ({
  id: row.id,
  name: row.name,
  nickname: row.nickname || '',
  role: row.role || 'Designer Criação',
  avatarColor: row.avatar_color || '#3b82f6',
  dailyGoalOrders: Number(row.daily_goal_orders) || 8,
  dailyGoalMeters: Number(row.daily_goal_meters) || 0,
  dailyGoalPieces: Number(row.daily_goal_pieces) || 50,
  active: row.active ?? true,
  createdAt: row.created_at
});

export const mapDesignerToDB = (d) => ({
  id: d.id,
  name: d.name,
  nickname: d.nickname || null,
  role: d.role || 'Designer Criação',
  avatar_color: d.avatarColor || '#3b82f6',
  daily_goal_orders: Number(d.dailyGoalOrders) || 8,
  daily_goal_meters: Number(d.dailyGoalMeters) || 0,
  daily_goal_pieces: Number(d.dailyGoalPieces) || 50,
  active: d.active ?? true
});

// Conversão Lançamento: JS (camelCase) <-> DB (snake_case)
export const mapEntryFromDB = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
  clientName: row.client_name,
  designerId: row.designer_id,
  designerName: row.designer_name || 'Designer',
  stage: row.stage,
  date: row.date,
  piecesCount: Number(row.pieces_count) || 0,
  meters: Number(row.meters) || 0,
  orderType: row.order_type || 'sublimacao_total',
  complexity: row.complexity || 'media',
  notes: row.notes || '',
  createdAt: row.created_at
});

export const mapEntryToDB = (e) => ({
  id: e.id,
  order_number: e.orderNumber,
  client_name: e.clientName,
  designer_id: e.designerId || null,
  designer_name: e.designerName || null,
  stage: e.stage,
  date: e.date,
  pieces_count: Number(e.piecesCount) || 0,
  meters: Number(e.meters) || 0,
  order_type: e.orderType || 'sublimacao_total',
  complexity: e.complexity || 'media',
  notes: e.notes || null
});
