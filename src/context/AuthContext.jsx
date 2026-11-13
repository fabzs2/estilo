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
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}:kromaops_pepper_v1`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  const computed = await hashPasswordWithSalt(password, salt);
  return computed === expectedHash;
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
  const [hasCustomizedSuperAdmin, setHasCustomizedSuperAdmin] = useState(false);

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
    async (nextTenants, nextUsers, nextCustomizedFlag) => {
      if (!isSupabaseActive || !supabase) return;
      try {
        const payload = {
          tenants: nextTenants,
          users: nextUsers,
          hasCustomizedSuperAdmin: nextCustomizedFlag,
          updatedAt: new Date().toISOString()
        };
        await supabase.from('production_entries').upsert(
          mapEntryToDB({
            id: SAAS_AUTH_ENTRY_ID,
            orderNumber: '__SYS_AUTH__',
            clientName: 'KROMAOPS_SAAS_AUTH',
            designerId: null,
            designerName: null,
            stage: SAAS_AUTH_STAGE,
            date: '2000-01-01',
            piecesCount: 0,
            meters: 0,
            orderType: 'sublimacao_total',
            workType: 'arte_nova',
            notes: JSON.stringify(payload)
          })
        );
      } catch (err) {
        console.error('Erro ao sincronizar registro de acessos no Supabase:', err);
      }
    },
    [isSupabaseActive]
  );

  const saveAuthRegistryLocal = useCallback(
    (nextTenants, nextUsers, nextCustomizedFlag) => {
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            tenants: nextTenants,
            users: nextUsers,
            hasCustomizedSuperAdmin: nextCustomizedFlag
          })
        );
      } catch {
        // ignore storage quota errors
      }
      persistAuthRegistryToSupabase(nextTenants, nextUsers, nextCustomizedFlag);
    },
    [persistAuthRegistryToSupabase]
  );

  // Inicialização: garante criação criptográfica do Super Admin e Gestor Padrão
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      let loadedTenants = [DEFAULT_TENANT];
      let loadedUsers = [];
      let customizedFlag = false;

      // 1. Tenta carregar do localStorage
      try {
        const localRaw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed.tenants) && parsed.tenants.length > 0) {
            loadedTenants = parsed.tenants;
          }
          if (Array.isArray(parsed.users) && parsed.users.length > 0) {
            loadedUsers = parsed.users;
          }
          customizedFlag = Boolean(parsed.hasCustomizedSuperAdmin);
        }
      } catch {
        // ignore parse errors
      }

      // 2. Se Supabase estiver ativo, busca registro atualizado da nuvem
      if (isSupabaseActive && supabase) {
        try {
          const { data: authRow } = await supabase
            .from('production_entries')
            .select('notes')
            .eq('id', SAAS_AUTH_ENTRY_ID)
            .maybeSingle();

          if (authRow && authRow.notes) {
            const remoteParsed = JSON.parse(authRow.notes);
            if (Array.isArray(remoteParsed.tenants) && remoteParsed.tenants.length > 0) {
              loadedTenants = remoteParsed.tenants;
            }
            if (Array.isArray(remoteParsed.users) && remoteParsed.users.length > 0) {
              loadedUsers = remoteParsed.users;
            }
            if (typeof remoteParsed.hasCustomizedSuperAdmin === 'boolean') {
              customizedFlag = remoteParsed.hasCustomizedSuperAdmin;
            }
          }
        } catch {
          // ignore if not found yet
        }
      }

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
            role: 'super_admin', // 'super_admin' | 'company_manager'
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

        try {
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              tenants: loadedTenants,
              users: loadedUsers,
              hasCustomizedSuperAdmin: false
            })
          );
        } catch {
          // ignore
        }
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
            passwordHash: managerHash
          };
          loadedTenants = loadedTenants.map((t) =>
            t.id === 'tenant_default' && t.name === 'Estamparia & Uniformes Matriz'
              ? { ...t, name: 'Estilo Uniformes' }
              : t
          );
          try {
            localStorage.setItem(
              AUTH_STORAGE_KEY,
              JSON.stringify({
                tenants: loadedTenants,
                users: loadedUsers,
                hasCustomizedSuperAdmin: customizedFlag
              })
            );
          } catch {
            // ignore
          }
        }
      }

      if (!isMounted) return;

      setTenants(loadedTenants);
      setUsers(loadedUsers);
      setHasCustomizedSuperAdmin(customizedFlag);

      // 4. Restaura sessão ativa se válida e dentro do tempo limite
      try {
        const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionRaw) {
          const parsedSession = JSON.parse(sessionRaw);
          const now = Date.now();
          if (parsedSession.userId && now - (parsedSession.lastActivity || 0) < INACTIVITY_LIMIT_MS) {
            const foundUser = loadedUsers.find((u) => u.id === parsedSession.userId && u.active !== false);
            if (foundUser) {
              // Se for gestor de empresa, confere se a empresa continua ativa
              if (foundUser.role === 'company_manager') {
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

  // Função de Login com Verificação de Hash, Licença e Proteção contra Força Bruta
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
    const user = users.find((u) => (u.username || '').toLowerCase() === cleanUser);

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

    if (!user) {
      return { ok: false, error: registerFailure() };
    }

    const validPassword = await verifyPassword(passwordInput, user.salt, user.passwordHash);
    if (!validPassword) {
      return { ok: false, error: registerFailure() };
    }

    if (user.active === false) {
      return {
        ok: false,
        error: 'Este usuário está desativado. Contate o administrador do KromaOPS.'
      };
    }

    // Se for Gestor de Empresa, valida se a Empresa está ativa e dentro da validade
    if (user.role === 'company_manager') {
      const tenant = tenants.find((t) => t.id === user.tenantId);
      if (!tenant) {
        return { ok: false, error: 'Empresa vinculada não encontrada.' };
      }
      if (tenant.status === 'suspended') {
        return {
          ok: false,
          error: `O acesso da empresa "${tenant.name}" está suspenso. Entre em contato com o suporte KromaOPS para regularização.`
        };
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      if (tenant.expiresAt && tenant.expiresAt < todayStr) {
        return {
          ok: false,
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
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { ok: false, error: 'Já existe um usuário cadastrado com este login/e-mail.' };
    }

    const newTenantId = `tenant_${Date.now()}`;
    const newTenant = {
      id: newTenantId,
      name: companyName.trim(),
      sector: (sector || 'Setor de Arte & Impressão').trim(),
      document: (document || '').trim(),
      plan: plan || 'KromaOPS Pro',
      status: status || 'active',
      expiresAt: expiresAt || '2027-12-31',
      createdAt: new Date().toISOString()
    };

    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(managerPassword, salt);

    const newManager = {
      id: `usr_${Date.now()}`,
      name: (managerName || `Gestor ${companyName}`).trim(),
      username: cleanUsername,
      role: 'company_manager',
      tenantId: newTenantId,
      salt,
      passwordHash,
      active: true,
      createdAt: new Date().toISOString()
    };

    const nextTenants = [...tenants, newTenant];
    const nextUsers = [...users, newManager];

    setTenants(nextTenants);
    setUsers(nextUsers);
    saveAuthRegistryLocal(nextTenants, nextUsers, hasCustomizedSuperAdmin);

    return { ok: true, tenant: newTenant, manager: newManager };
  };

  const updateTenant = (tenantId, partial) => {
    const nextTenants = tenants.map((t) => (t.id === tenantId ? { ...t, ...partial } : t));
    setTenants(nextTenants);
    saveAuthRegistryLocal(nextTenants, users, hasCustomizedSuperAdmin);
  };

  const deleteTenant = (tenantId) => {
    if (tenantId === 'tenant_default' && tenants.length <= 1) {
      return { ok: false, error: 'Não é possível excluir a única empresa matriz.' };
    }
    const nextTenants = tenants.filter((t) => t.id !== tenantId);
    const nextUsers = users.filter((u) => u.tenantId !== tenantId);
    setTenants(nextTenants);
    setUsers(nextUsers);
    if (impersonatedTenantId === tenantId) {
      setImpersonatedTenantId(null);
    }
    saveAuthRegistryLocal(nextTenants, nextUsers, hasCustomizedSuperAdmin);
    return { ok: true };
  };

  const addManagerToTenant = async ({ tenantId, name, username, password }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { ok: false, error: 'Este login/e-mail já está em uso.' };
    }
    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(password, salt);

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      role: 'company_manager',
      tenantId,
      salt,
      passwordHash,
      active: true,
      createdAt: new Date().toISOString()
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    saveAuthRegistryLocal(tenants, nextUsers, hasCustomizedSuperAdmin);
    return { ok: true, user: newUser };
  };

  const updateUserCredentials = async (userId, { name, username, newPassword, active }) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'Usuário não encontrado.' };

    const cleanUsername = username ? username.trim().toLowerCase() : target.username;
    if (
      cleanUsername !== target.username.toLowerCase() &&
      users.some((u) => u.id !== userId && u.username.toLowerCase() === cleanUsername)
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
      active: active !== undefined ? active : target.active
    };

    const nextUsers = users.map((u) => (u.id === userId ? updatedUser : u));
    const nextCustomized = target.role === 'super_admin' ? true : hasCustomizedSuperAdmin;

    setUsers(nextUsers);
    setHasCustomizedSuperAdmin(nextCustomized);
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }
    saveAuthRegistryLocal(tenants, nextUsers, nextCustomized);
    return { ok: true };
  };

  const deleteUser = (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.role === 'super_admin') {
      return { ok: false, error: 'Não é permitido excluir a conta Super Admin principal.' };
    }
    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);
    saveAuthRegistryLocal(tenants, nextUsers, hasCustomizedSuperAdmin);
    return { ok: true };
  };

  // Empresa ativa no contexto atual (para o Gestor é a empresa dele; para o Super Admin é a empresa inspecionada ou a padrão)
  const activeTenantId =
    currentUser?.role === 'company_manager'
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

