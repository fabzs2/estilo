import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, mapEntryToDB } from '../lib/supabase';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

const AUTH_STORAGE_KEY = 'kromaops_saas_auth_v1';
const SESSION_STORAGE_KEY = 'kromaops_active_session_v1';
const LOCKOUT_STORAGE_KEY = 'kromaops_login_lockout_v1';
const SAAS_AUTH_ENTRY_ID = '__kromaops_saas_auth__';
const SAAS_AUTH_STAGE = '__sys_auth__';
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutos de inatividade

// ==========================================================
// Utilitários Criptográficos (Web Crypto API — SHA-256 + Salt)
// ==========================================================

export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPasswordWithSalt(password, salt) {
  const cleanPwd = String(password ?? '');
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${cleanPwd}:kromaops_pepper_v1`);
  if (window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinístico caso acessado via rede local HTTP sem TLS
  let h1 = 0xdeadbeef ^ data.length;
  let h2 = 0x41c6ce57 ^ data.length;
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export async function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  const computedRaw = await hashPasswordWithSalt(password, salt);
  if (computedRaw === expectedHash) return true;
  const trimmed = String(password).trim();
  if (trimmed !== password) {
    const computedTrimmed = await hashPasswordWithSalt(trimmed, salt);
    if (computedTrimmed === expectedHash) return true;
  }
  return false;
}

function mergeUniqueById(localList = [], remoteList = [], deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map();
  (remoteList || []).forEach((item) => {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  });
  (localList || []).forEach((item) => {
    if (item && item.id && !deletedSet.has(item.id)) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        // Prioriza o registro atualizado mais recentemente
        const localTime = item.updatedAt || item.createdAt || '';
        const remoteTime = existing.updatedAt || existing.createdAt || '';
        map.set(item.id, localTime >= remoteTime ? item : existing);
      }
    }
  });
  return Array.from(map.values());
}

// ==========================================================
// Dados Iniciais Padrão (1º Acesso)
// ==========================================================

const DEFAULT_TENANT = {
  id: 'tenant_default',
  name: 'Estilo Uniformes',
  sector: 'Setor de Arte & Impressão',
  document: '',
  plan: 'KromaOPS Pro',
  status: 'active', // 'active' | 'suspended' | 'trial'
  expiresAt: '2027-12-31',
  createdAt: new Date().toISOString()
};

export function AuthProvider({ children }) {
  const [isSupabaseActive] = useState(() => isSupabaseConfigured());
  const [isInitializing, setIsInitializing] = useState(true);

  const [tenants, setTenants] = useState([DEFAULT_TENANT]);
  const [users, setUsers] = useState([]);
  const [deletedUserIds, setDeletedUserIds] = useState([]);
  const [deletedTenantIds, setDeletedTenantIds] = useState([]);
  const [hasCustomizedSuperAdmin, setHasCustomizedSuperAdmin] = useState(false);
  const [saasConfig, setSaasConfig] = useState({
    supportWhatsapp: ''
  });

  // Sessão ativa
  const [currentUser, setCurrentUser] = useState(null);
  // Permite que o Super Admin inspecione/acesse qualquer empresa cliente
  const [impersonatedTenantId, setImpersonatedTenantId] = useState(null);

  // Controle de proteção contra força bruta
  const [lockoutState, setLockoutState] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCKOUT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { attempts: 0, lockedUntil: 0 };
    } catch {
      return { attempts: 0, lockedUntil: 0 };
    }
  });

  // Sincroniza registro de empresas e gestores (apenas hashes/salts) no Supabase
  const persistAuthRegistryToSupabase = useCallback(
    async (
      nextTenants,
      nextUsers,
      nextCustomizedFlag,
      nextSaasConfig,
      nextDeletedUserIds = deletedUserIds,
      nextDeletedTenantIds = deletedTenantIds
    ) => {
      if (!isSupabaseActive || !supabase) return;
      try {
        const payload = {
          tenants: nextTenants,
          users: nextUsers,
          deletedUserIds: nextDeletedUserIds,
          deletedTenantIds: nextDeletedTenantIds,
          hasCustomizedSuperAdmin: nextCustomizedFlag,
          saasConfig: nextSaasConfig || saasConfig,
          updatedAt: new Date().toISOString()
        };
        const fullRow = mapEntryToDB({
          id: SAAS_AUTH_ENTRY_ID,
          orderNumber: '__SYS_AUTH__',
          clientName: 'KROMAOPS_SAAS_AUTH',
          designerId: null,
          designerName: null,
          stage: 'criacao',
          date: '2000-01-01',
          piecesCount: 0,
          meters: 0,
          orderType: 'sublimacao_total',
          workType: 'arte_nova',
          notes: JSON.stringify(payload)
        });
        const { error } = await supabase.from('production_entries').upsert(fullRow);
        if (error) {
          // Fallback caso a tabela production_entries no Supabase não tenha a coluna work_type
          const { work_type: _wt, complexity: _cx, ...safeRow } = fullRow;
          await supabase.from('production_entries').upsert(safeRow);
        }
      } catch (err) {
        console.error('Erro ao sincronizar registro de acessos no Supabase:', err);
      }
    },
    [isSupabaseActive, saasConfig, deletedUserIds, deletedTenantIds]
  );

  const saveAuthRegistryLocal = useCallback(
    async (
      nextTenants,
      nextUsers,
      nextCustomizedFlag,
      nextSaasConfig,
      nextDeletedUserIds = deletedUserIds,
      nextDeletedTenantIds = deletedTenantIds
    ) => {
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            tenants: nextTenants,
            users: nextUsers,
            deletedUserIds: nextDeletedUserIds,
            deletedTenantIds: nextDeletedTenantIds,
            hasCustomizedSuperAdmin: nextCustomizedFlag,
            saasConfig: nextSaasConfig || saasConfig,
            updatedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore storage quota errors
      }
      await persistAuthRegistryToSupabase(
        nextTenants,
        nextUsers,
        nextCustomizedFlag,
        nextSaasConfig || saasConfig,
        nextDeletedUserIds,
        nextDeletedTenantIds
      );
    },
    [persistAuthRegistryToSupabase, saasConfig, deletedUserIds, deletedTenantIds]
  );

  // Inicialização: garante criação criptográfica do Super Admin e Gestor Padrão
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      let localTenants = [];
      let localUsers = [];
      let localDeletedUsers = [];
      let localDeletedTenants = [];
      let customizedFlag = false;
      let loadedSaasConfig = { supportWhatsapp: '' };

      // 1. Tenta carregar do localStorage
      try {
        const localRaw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed.tenants)) localTenants = parsed.tenants;
          if (Array.isArray(parsed.users)) localUsers = parsed.users;
          if (Array.isArray(parsed.deletedUserIds)) localDeletedUsers = parsed.deletedUserIds;
          if (Array.isArray(parsed.deletedTenantIds)) localDeletedTenants = parsed.deletedTenantIds;
          if (parsed.saasConfig) {
            loadedSaasConfig = { ...loadedSaasConfig, ...parsed.saasConfig };
          }
          customizedFlag = Boolean(parsed.hasCustomizedSuperAdmin);
        }
      } catch {
        // ignore parse errors
      }

      let remoteTenants = [];
      let remoteUsers = [];
      let remoteDeletedUsers = [];
      let remoteDeletedTenants = [];

      // 2. Se Supabase estiver ativo, busca registro atualizado da nuvem e mescla sem perder criados localmente
      if (isSupabaseActive && supabase) {
        try {
          const { data: authRow } = await supabase
            .from('production_entries')
            .select('notes')
            .eq('id', SAAS_AUTH_ENTRY_ID)
            .maybeSingle();

          if (authRow && authRow.notes) {
            const remoteParsed = JSON.parse(authRow.notes);
            if (Array.isArray(remoteParsed.tenants)) remoteTenants = remoteParsed.tenants;
            if (Array.isArray(remoteParsed.users)) remoteUsers = remoteParsed.users;
            if (Array.isArray(remoteParsed.deletedUserIds)) remoteDeletedUsers = remoteParsed.deletedUserIds;
            if (Array.isArray(remoteParsed.deletedTenantIds)) remoteDeletedTenants = remoteParsed.deletedTenantIds;
            if (remoteParsed.saasConfig) {
              loadedSaasConfig = {
                ...loadedSaasConfig,
                ...remoteParsed.saasConfig,
                supportWhatsapp: loadedSaasConfig.supportWhatsapp || remoteParsed.saasConfig.supportWhatsapp || ''
              };
            }
            if (typeof remoteParsed.hasCustomizedSuperAdmin === 'boolean') {
              customizedFlag = customizedFlag || remoteParsed.hasCustomizedSuperAdmin;
            }
          }
        } catch {
          // ignore if not found yet
        }
      }

      const mergedDeletedUsers = Array.from(new Set([...localDeletedUsers, ...remoteDeletedUsers]));
      const mergedDeletedTenants = Array.from(new Set([...localDeletedTenants, ...remoteDeletedTenants]));

      let loadedTenants = mergeUniqueById(localTenants, remoteTenants, mergedDeletedTenants);
      if (loadedTenants.length === 0) {
        loadedTenants = [DEFAULT_TENANT];
      }
      let loadedUsers = mergeUniqueById(localUsers, remoteUsers, mergedDeletedUsers);

      // 3. Se ainda não existir nenhum usuário, cria Super Admin e 1º Gestor com SHA-256 + Salt
      if (loadedUsers.length === 0) {
        const adminSalt = generateSalt();
        const adminHash = await hashPasswordWithSalt('Kroma@2026', adminSalt);

        const managerSalt = generateSalt();
        const managerHash = await hashPasswordWithSalt('estilo@2026', managerSalt);

        loadedUsers = [
          {
            id: 'usr_super_admin',
            name: 'Super Admin KromaOPS',
            username: 'admin@kromaops.com',
            role: 'super_admin',
            tenantId: null,
            salt: adminSalt,
            passwordHash: adminHash,
            active: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'usr_default_manager',
            name: 'Estilo Uniformes (Matriz)',
            username: 'estilouniformes22@gmail.com',
            role: 'company_manager',
            tenantId: 'tenant_default',
            salt: managerSalt,
            passwordHash: managerHash,
            active: true,
            createdAt: new Date().toISOString()
          }
        ];
      } else {
        // Migração automática caso o navegador já tivesse criado o gestor padrão antigo (gestor@empresa.com)
        const legacyIdx = loadedUsers.findIndex(
          (u) => u.id === 'usr_default_manager' && u.username === 'gestor@empresa.com'
        );
        if (legacyIdx !== -1) {
          const managerSalt = generateSalt();
          const managerHash = await hashPasswordWithSalt('estilo@2026', managerSalt);
          loadedUsers[legacyIdx] = {
            ...loadedUsers[legacyIdx],
            name: 'Estilo Uniformes (Matriz)',
            username: 'estilouniformes22@gmail.com',
            salt: managerSalt,
            passwordHash: managerHash,
            updatedAt: new Date().toISOString()
          };
          loadedTenants = loadedTenants.map((t) =>
            t.id === 'tenant_default' && t.name === 'Estamparia & Uniformes Matriz'
              ? { ...t, name: 'Estilo Uniformes' }
              : t
          );
        }
      }

      // Garante persistência sincronizada entre localStorage e Supabase
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            tenants: loadedTenants,
            users: loadedUsers,
            deletedUserIds: mergedDeletedUsers,
            deletedTenantIds: mergedDeletedTenants,
            hasCustomizedSuperAdmin: customizedFlag,
            saasConfig: loadedSaasConfig,
            updatedAt: new Date().toISOString()
          })
        );
      } catch {
        // ignore
      }

      if (!isMounted) return;

      setTenants(loadedTenants);
      setUsers(loadedUsers);
      setDeletedUserIds(mergedDeletedUsers);
      setDeletedTenantIds(mergedDeletedTenants);
      setHasCustomizedSuperAdmin(customizedFlag);
      setSaasConfig(loadedSaasConfig);

      // 4. Restaura sessão ativa se válida e dentro do tempo limite
      try {
        const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionRaw) {
          const parsedSession = JSON.parse(sessionRaw);
          const now = Date.now();
          if (parsedSession.userId && now - (parsedSession.lastActivity || 0) < INACTIVITY_LIMIT_MS) {
            const foundUser = loadedUsers.find((u) => u.id === parsedSession.userId && u.active !== false);
            if (foundUser) {
              // Se for gestor ou operador de empresa, confere se a empresa continua ativa
              if (foundUser.role === 'company_manager' || foundUser.role === 'company_operator') {
                const userTenant = loadedTenants.find((t) => t.id === foundUser.tenantId);
                const todayStr = new Date().toISOString().slice(0, 10);
                const isExpired = userTenant?.expiresAt && userTenant.expiresAt < todayStr;
                if (userTenant && userTenant.status !== 'suspended' && !isExpired) {
                  setCurrentUser(foundUser);
                } else {
                  sessionStorage.removeItem(SESSION_STORAGE_KEY);
                  localStorage.removeItem(SESSION_STORAGE_KEY);
                }
              } else {
                setCurrentUser(foundUser);
                if (parsedSession.impersonatedTenantId) {
                  setImpersonatedTenantId(parsedSession.impersonatedTenantId);
                }
              }
            }
          } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch {
        // ignore
      }

      setIsInitializing(false);
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [isSupabaseActive]);

  // Logout / Bloqueio de Sessão
  const logout = useCallback(() => {
    setCurrentUser(null);
    setImpersonatedTenantId(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Monitor de Inatividade (Auto-Lock em 30 minutos sem interação)
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      try {
        const payload = JSON.stringify({
          userId: currentUser.id,
          impersonatedTenantId,
          lastActivity: Date.now()
        });
        sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
        localStorage.setItem(SESSION_STORAGE_KEY, payload);
      } catch {
        // ignore
      }
    };

    updateActivity();

    const interval = setInterval(() => {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() - (parsed.lastActivity || 0) > INACTIVITY_LIMIT_MS) {
            logout();
          }
        }
      } catch {
        // ignore
      }
    }, 30000);

    const handleUserEvent = () => updateActivity();
    window.addEventListener('mousedown', handleUserEvent, { passive: true });
    window.addEventListener('keydown', handleUserEvent, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousedown', handleUserEvent);
      window.removeEventListener('keydown', handleUserEvent);
    };
  }, [currentUser, impersonatedTenantId, logout]);

  // Função de Login com Verificação de Hash, Licença, Sincronização em Tempo Real e Proteção contra Força Bruta
  const login = async (usernameInput, passwordInput) => {
    const now = Date.now();
    if (lockoutState.lockedUntil > now) {
      const remainingSec = Math.ceil((lockoutState.lockedUntil - now) / 1000);
      return {
        ok: false,
        error: `Muitas tentativas incorretas. Aguarde ${remainingSec}s para tentar novamente.`
      };
    }

    const cleanUser = (usernameInput || '').trim().toLowerCase();

    // Garante leitura dos usuários e empresas mais recentes do localStorage e do Supabase antes de validar
    let latestUsers = [...users];
    let latestTenants = [...tenants];
    let latestDeletedUsers = [...deletedUserIds];
    let latestDeletedTenants = [...deletedTenantIds];

    try {
      const localRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed.deletedUserIds)) {
          latestDeletedUsers = Array.from(new Set([...latestDeletedUsers, ...parsed.deletedUserIds]));
        }
        if (Array.isArray(parsed.deletedTenantIds)) {
          latestDeletedTenants = Array.from(new Set([...latestDeletedTenants, ...parsed.deletedTenantIds]));
        }
        if (Array.isArray(parsed.users)) {
          latestUsers = mergeUniqueById(latestUsers, parsed.users, latestDeletedUsers);
        }
        if (Array.isArray(parsed.tenants)) {
          latestTenants = mergeUniqueById(latestTenants, parsed.tenants, latestDeletedTenants);
        }
      }
    } catch {
      // ignore
    }

    if (isSupabaseActive && supabase) {
      try {
        const { data: authRow } = await supabase
          .from('production_entries')
          .select('notes')
          .eq('id', SAAS_AUTH_ENTRY_ID)
          .maybeSingle();

        if (authRow && authRow.notes) {
          const remoteParsed = JSON.parse(authRow.notes);
          if (Array.isArray(remoteParsed.deletedUserIds)) {
            latestDeletedUsers = Array.from(new Set([...latestDeletedUsers, ...remoteParsed.deletedUserIds]));
          }
          if (Array.isArray(remoteParsed.deletedTenantIds)) {
            latestDeletedTenants = Array.from(new Set([...latestDeletedTenants, ...remoteParsed.deletedTenantIds]));
          }
          if (Array.isArray(remoteParsed.users)) {
            latestUsers = mergeUniqueById(latestUsers, remoteParsed.users, latestDeletedUsers);
          }
          if (Array.isArray(remoteParsed.tenants)) {
            latestTenants = mergeUniqueById(latestTenants, remoteParsed.tenants, latestDeletedTenants);
          }
        }
      } catch {
        // ignore
      }
    }

    if (latestUsers.length > 0) setUsers(latestUsers);
    if (latestTenants.length > 0) setTenants(latestTenants);

    // Permite entrar digitando tanto o Login/E-mail quanto o Nome cadastrado do usuário/operador
    const matchingUsers = latestUsers.filter(
      (u) =>
        (u.username || '').trim().toLowerCase() === cleanUser ||
        (u.name || '').trim().toLowerCase() === cleanUser
    );

    const registerFailure = () => {
      const nextAttempts = (lockoutState.attempts || 0) + 1;
      const lockedUntil = nextAttempts >= 5 ? Date.now() + 60 * 1000 : 0;
      const nextLock = { attempts: nextAttempts >= 5 ? 0 : nextAttempts, lockedUntil };
      setLockoutState(nextLock);
      try {
        localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(nextLock));
      } catch {
        // ignore
      }
      if (lockedUntil > 0) {
        return 'Acesso bloqueado temporariamente por 60 segundos após 5 tentativas inválidas.';
      }
      return `Credenciais inválidas. (${5 - nextAttempts} tentativa(s) restante(s))`;
    };

    if (matchingUsers.length === 0) {
      return { ok: false, error: registerFailure() };
    }

    let authenticatedUser = null;
    for (const candidate of matchingUsers) {
      const isOk = await verifyPassword(passwordInput, candidate.salt, candidate.passwordHash);
      if (isOk) {
        authenticatedUser = candidate;
        break;
      }
    }

    if (!authenticatedUser) {
      return { ok: false, error: registerFailure() };
    }

    const user = authenticatedUser;

    if (user.active === false) {
      return {
        ok: false,
        error: 'Este usuário está desativado. Contate o administrador do KromaOPS.'
      };
    }

    // Se for Gestor ou Operador de Empresa, valida se a Empresa está ativa e dentro da validade
    if (user.role === 'company_manager' || user.role === 'company_operator') {
      const tenant =
        latestTenants.find((t) => t.id === user.tenantId) ||
        latestTenants.find((t) => t.id === 'tenant_default') ||
        latestTenants[0] ||
        DEFAULT_TENANT;

      if (tenant.status === 'suspended') {
        return {
          ok: false,
          isBillingBlock: true,
          tenantName: tenant.name,
          error: `O acesso da empresa "${tenant.name}" está suspenso. Entre em contato com o suporte KromaOPS para regularização.`
        };
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      if (tenant.expiresAt && tenant.expiresAt < todayStr) {
        return {
          ok: false,
          isBillingBlock: true,
          tenantName: tenant.name,
          error: `A licença da empresa "${tenant.name}" expirou em ${tenant.expiresAt.split('-').reverse().join('/')}. Contate o suporte KromaOPS para renovar.`
        };
      }
    }

    // Sucesso: zera contador de falhas
    const cleanLock = { attempts: 0, lockedUntil: 0 };
    setLockoutState(cleanLock);
    try {
      localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(cleanLock));
    } catch {
      // ignore
    }

    setCurrentUser(user);
    setImpersonatedTenantId(null);

    const sessionPayload = JSON.stringify({
      userId: user.id,
      impersonatedTenantId: null,
      lastActivity: Date.now()
    });
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionPayload);
      localStorage.setItem(SESSION_STORAGE_KEY, sessionPayload);
    } catch {
      // ignore
    }

    return { ok: true, user };
  };

  // ==========================================================
  // Funções de Gerenciamento Multi-Empresa (Exclusivas Super Admin)
  // ==========================================================

  const createCompanyWithManager = async ({
    companyName,
    sector,
    document,
    plan,
    status,
    expiresAt,
    managerName,
    managerUsername,
    managerPassword
  }) => {
    const cleanUsername = (managerUsername || '').trim().toLowerCase();
    if (users.some((u) => (u.username || '').trim().toLowerCase() === cleanUsername)) {
      return { ok: false, error: 'Já existe um usuário cadastrado com este login/e-mail.' };
    }

    const nowIso = new Date().toISOString();
    const newTenantId = `tenant_${Date.now()}`;
    const newTenant = {
      id: newTenantId,
      name: companyName.trim(),
      sector: (sector || 'Setor de Arte & Impressão').trim(),
      document: (document || '').trim(),
      plan: plan || 'KromaOPS Pro',
      status: status || 'active',
      expiresAt: expiresAt || '2027-12-31',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt((managerPassword || '').trim(), salt);

    const newManager = {
      id: `usr_${Date.now()}`,
      name: (managerName || `Gestor ${companyName}`).trim(),
      username: cleanUsername,
      role: 'company_manager',
      tenantId: newTenantId,
      salt,
      passwordHash,
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const nextTenants = [...tenants, newTenant];
    const nextUsers = [...users, newManager];

    setTenants(nextTenants);
    setUsers(nextUsers);
    await saveAuthRegistryLocal(nextTenants, nextUsers, hasCustomizedSuperAdmin);

    return { ok: true, tenant: newTenant, manager: newManager };
  };

  const updateTenant = (tenantId, partial) => {
    const nextTenants = tenants.map((t) =>
      t.id === tenantId ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t
    );
    setTenants(nextTenants);
    saveAuthRegistryLocal(nextTenants, users, hasCustomizedSuperAdmin);
  };

  const deleteTenant = (tenantId) => {
    if (tenantId === 'tenant_default' && tenants.length <= 1) {
      return { ok: false, error: 'Não é possível excluir a única empresa matriz.' };
    }
    const removedUsers = users.filter((u) => u.tenantId === tenantId).map((u) => u.id);
    const nextDeletedTenants = Array.from(new Set([...deletedTenantIds, tenantId]));
    const nextDeletedUsers = Array.from(new Set([...deletedUserIds, ...removedUsers]));
    const nextTenants = tenants.filter((t) => t.id !== tenantId);
    const nextUsers = users.filter((u) => u.tenantId !== tenantId);

    setDeletedTenantIds(nextDeletedTenants);
    setDeletedUserIds(nextDeletedUsers);
    setTenants(nextTenants);
    setUsers(nextUsers);
    if (impersonatedTenantId === tenantId) {
      setImpersonatedTenantId(null);
    }
    saveAuthRegistryLocal(nextTenants, nextUsers, hasCustomizedSuperAdmin, saasConfig, nextDeletedUsers, nextDeletedTenants);
    return { ok: true };
  };

  const addManagerToTenant = async ({ tenantId, name, username, password, role = 'company_manager' }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (users.some((u) => (u.username || '').trim().toLowerCase() === cleanUsername)) {
      return { ok: false, error: 'Este login/e-mail já está em uso.' };
    }
    const nowIso = new Date().toISOString();
    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt((password || '').trim(), salt);

    const newUser = {
      id: `usr_${Date.now()}`,
      name: (name || '').trim(),
      username: cleanUsername,
      role: role === 'company_operator' ? 'company_operator' : 'company_manager',
      tenantId: tenantId || 'tenant_default',
      salt,
      passwordHash,
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    await saveAuthRegistryLocal(tenants, nextUsers, hasCustomizedSuperAdmin);
    return { ok: true, user: newUser };
  };

  const updateSaasConfig = (partial) => {
    const nextConfig = { ...saasConfig, ...partial };
    setSaasConfig(nextConfig);
    saveAuthRegistryLocal(tenants, users, hasCustomizedSuperAdmin, nextConfig);
  };

  const updateUserCredentials = async (userId, { name, username, newPassword, active }) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'Usuário não encontrado.' };

    const cleanUsername = username ? username.trim().toLowerCase() : target.username;
    if (
      cleanUsername !== (target.username || '').toLowerCase() &&
      users.some((u) => u.id !== userId && (u.username || '').toLowerCase() === cleanUsername)
    ) {
      return { ok: false, error: 'Este login/e-mail já está sendo utilizado por outro usuário.' };
    }

    let nextSalt = target.salt;
    let nextHash = target.passwordHash;
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
      }
      nextSalt = generateSalt();
      nextHash = await hashPasswordWithSalt(newPassword.trim(), nextSalt);
    }

    const updatedUser = {
      ...target,
      name: name !== undefined ? name.trim() : target.name,
      username: cleanUsername,
      salt: nextSalt,
      passwordHash: nextHash,
      active: active !== undefined ? active : target.active,
      updatedAt: new Date().toISOString()
    };

    const nextUsers = users.map((u) => (u.id === userId ? updatedUser : u));
    const nextCustomized = target.role === 'super_admin' ? true : hasCustomizedSuperAdmin;

    setUsers(nextUsers);
    setHasCustomizedSuperAdmin(nextCustomized);
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }
    await saveAuthRegistryLocal(tenants, nextUsers, nextCustomized);
    return { ok: true };
  };

  const deleteUser = (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.role === 'super_admin') {
      return { ok: false, error: 'Não é permitido excluir a conta Super Admin principal.' };
    }
    const nextDeletedUsers = Array.from(new Set([...deletedUserIds, userId]));
    const nextUsers = users.filter((u) => u.id !== userId);
    setDeletedUserIds(nextDeletedUsers);
    setUsers(nextUsers);
    saveAuthRegistryLocal(tenants, nextUsers, hasCustomizedSuperAdmin, saasConfig, nextDeletedUsers, deletedTenantIds);
    return { ok: true };
  };

  // Empresa ativa no contexto atual (para Gestor ou Operador é a empresa dele; para o Super Admin é a empresa inspecionada ou a padrão)
  const activeTenantId =
    currentUser?.role === 'company_manager' || currentUser?.role === 'company_operator'
      ? currentUser.tenantId
      : impersonatedTenantId || tenants[0]?.id || 'tenant_default';

  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0] || DEFAULT_TENANT;

  return (
    <AuthContext.Provider
      value={{
        isInitializing,
        currentUser,
        tenants,
        users,
        activeTenantId,
        activeTenant,
        impersonatedTenantId,
        setImpersonatedTenantId,
        hasCustomizedSuperAdmin,
        saasConfig,
        updateSaasConfig,
        lockoutState,
        login,
        logout,
        createCompanyWithManager,
        updateTenant,
        deleteTenant,
        addManagerToTenant,
        updateUserCredentials,
        deleteUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

