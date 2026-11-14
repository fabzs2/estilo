import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { useAuth } from '../context/AuthContext';
import { KromaLogo } from './KromaLogo';
import {
  BarChart3,
  ListFilter,
  Users,
  Plus,
  Layers,
  Printer,
  Download,
  Database,
  Trash2,
  SlidersHorizontal,
  Sun,
  Moon,
  Building2,
  Edit3,
  ShieldCheck,
  LogOut,
  KeyRound,
  UserPlus,
  X
} from 'lucide-react';

export function Header({ activeTab, setActiveTab, onOpenBackup, onOpenSupabase }) {
  const {
    setIsQuickEntryOpen,
    setEditingOrder,
    setIsBatchEntryOpen,
    setIsReportOpen,
    setIsSectorGoalsModalOpen,
    isSupabaseActive,
    clearAllData,
    metrics,
    designers,
    workingDaysConfig
  } = useProduction();

  const {
    currentUser,
    tenants,
    users,
    activeTenant,
    activeTenantId,
    logout,
    updateUserCredentials,
    addManagerToTenant,
    deleteUser
  } = useAuth();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('designflow_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Modal de troca de senha do próprio usuário logado
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' });

  // Modal para o Gestor da Empresa gerenciar logins de Operadores da sua fábrica
  const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
  const [opForm, setOpForm] = useState({ name: '', username: '', password: '' });
  const [opMessage, setOpMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('designflow_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPwdMessage({ type: '', text: '' });
    if (pwdForm.newPassword.trim().length < 6) {
      setPwdMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMessage({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }
    const res = await updateUserCredentials(currentUser.id, {
      newPassword: pwdForm.newPassword
    });
    if (!res.ok) {
      setPwdMessage({ type: 'error', text: res.error });
      return;
    }
    setPwdForm({ newPassword: '', confirmPassword: '' });
    setPwdMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setPwdMessage({ type: '', text: '' });
    }, 1200);
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isOperator = currentUser?.role === 'company_operator';
  const activeDesignersCount = designers.filter((d) => d.active !== false).length;
  const companyName = workingDaysConfig?.companyName || activeTenant?.name || 'Estamparia & Uniformes';
  const companySub = workingDaysConfig?.companySub || activeTenant?.sector || 'Setor de Arte & Impressão';
  const companyOperators = (users || []).filter(
    (u) => u.tenantId === activeTenantId && u.role === 'company_operator'
  );

  const handleAddOperatorSubmit = async (e) => {
    e.preventDefault();
    setOpMessage({ type: '', text: '' });
    if (!opForm.name.trim() || !opForm.username.trim() || opForm.password.trim().length < 6) {
      setOpMessage({ type: 'error', text: 'Preencha nome, login e senha (mínimo 6 caracteres).' });
      return;
    }
    const res = await addManagerToTenant({
      tenantId: activeTenantId,
      name: opForm.name,
      username: opForm.username,
      password: opForm.password,
      role: 'company_operator'
    });
    if (!res.ok) {
      setOpMessage({ type: 'error', text: res.error });
      return;
    }
    setOpForm({ name: '', username: '', password: '' });
    setOpMessage({ type: 'success', text: `Login de operador "${res.user.name}" criado com sucesso!` });
  };

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-top">
          {/* Identidade da Plataforma KromaOPS + Empresa Cliente (White-Label) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="sidebar-brand">
              <KromaLogo size={32} />
              <div className="brand-text-wrap">
                <div className="brand-name">
                  Kroma<span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>OPS</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.58rem',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}
                  >
                    PRO
                  </span>
                </div>
                <div className="brand-sub">Production OS</div>
              </div>
            </div>

            {/* Card White-Label da Empresa / Fábrica Cliente */}
            <button
              type="button"
              onClick={() => {
                if (!isOperator) setIsSectorGoalsModalOpen(true);
              }}
              title={isOperator ? companyName : 'Clique para personalizar os dados da unidade operacional'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                width: '100%',
                padding: '7px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                cursor: isOperator ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'border-color var(--trans-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Building2 size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {companyName}
                  </div>
                  <div
                    style={{
                      fontSize: '0.66rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {companySub}
                  </div>
                </div>
              </div>
              {!isOperator && <Edit3 size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
            </button>
          </div>

          {/* Ações de Lançamento com Dicas de Atalho */}
          <div className="sidebar-quick-actions">
            <button
              id="btn-quick-entry"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px' }}
              onClick={() => {
                setEditingOrder(null);
                setIsQuickEntryOpen(true);
              }}
              title="Atalho rápido: pressione a tecla N"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={15} strokeWidth={2.4} />
                Lançar Pedido
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '0.62rem',
                  padding: '0px 5px',
                  borderRadius: '3px',
                  background: 'rgba(0,0,0,0.18)',
                  opacity: 0.75
                }}
              >
                N
              </span>
            </button>

            <button
              id="btn-batch-entry"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between', padding: '6px 12px' }}
              onClick={() => setIsBatchEntryOpen(true)}
              title="Atalho rápido: pressione a tecla B"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} />
                Lançamento em Lote
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '0.62rem',
                  padding: '0px 5px',
                  borderRadius: '3px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)'
                }}
              >
                B
              </span>
            </button>
          </div>

          {/* Exclusivo Super Admin: Central SaaS */}
          {isSuperAdmin && (
            <div>
              <div className="sidebar-section-label">Administração SaaS</div>
              <nav className="sidebar-nav">
                <button
                  id="tab-super-admin"
                  className={`sidebar-nav-item ${activeTab === 'super_admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('super_admin')}
                  style={{
                    borderColor: activeTab === 'super_admin' ? 'var(--accent-blue)' : 'transparent'
                  }}
                >
                  <span className="sidebar-nav-item-left">
                    <ShieldCheck size={15} color="var(--accent-blue)" />
                    Empresas & Acessos
                  </span>
                  <span className="sidebar-counter">{tenants.length}</span>
                </button>
              </nav>
            </div>
          )}

          {/* Navegação Principal */}
          <div>
            <div className="sidebar-section-label">Operação</div>
            <nav className="sidebar-nav">
              <button
                id="tab-dashboard"
                className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="sidebar-nav-item-left">
                  <BarChart3 size={15} />
                  Visão Geral
                </span>
              </button>

              <button
                id="tab-orders"
                className={`sidebar-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <span className="sidebar-nav-item-left">
                  <ListFilter size={15} />
                  Fila de Pedidos
                </span>
                <span className="sidebar-counter">{metrics.totalOrders}</span>
              </button>

              <button
                id="tab-team"
                className={`sidebar-nav-item ${activeTab === 'team' ? 'active' : ''}`}
                onClick={() => setActiveTab('team')}
              >
                <span className="sidebar-nav-item-left">
                  <Users size={15} />
                  Equipe & Metas
                </span>
                <span className="sidebar-counter">{activeDesignersCount}</span>
              </button>
            </nav>
          </div>

          {/* Ferramentas e Gestão */}
          <div>
            <div className="sidebar-section-label">Gestão</div>
            <nav className="sidebar-nav">
              {!isOperator && (
                <button
                  id="btn-sidebar-goals"
                  className="sidebar-nav-item"
                  onClick={() => setIsSectorGoalsModalOpen(true)}
                >
                  <span className="sidebar-nav-item-left">
                    <SlidersHorizontal size={15} />
                    Empresa, Dias & Metas
                  </span>
                  <span className="sidebar-counter">{metrics.workingDaysCount}d</span>
                </button>
              )}

              {!isOperator && (
                <button
                  id="btn-sidebar-operators"
                  className="sidebar-nav-item"
                  onClick={() => {
                    setOpMessage({ type: '', text: '' });
                    setOpForm({ name: '', username: '', password: '' });
                    setIsOperatorsModalOpen(true);
                  }}
                >
                  <span className="sidebar-nav-item-left">
                    <UserPlus size={15} />
                    Logins de Operadores
                  </span>
                  <span className="sidebar-counter">{companyOperators.length}</span>
                </button>
              )}

              <button
                id="btn-executive-report"
                className="sidebar-nav-item"
                onClick={() => setIsReportOpen(true)}
              >
                <span className="sidebar-nav-item-left">
                  <Printer size={15} />
                  Relatório Executivo
                </span>
              </button>

              {!isOperator && (
                <button
                  id="btn-settings-data"
                  className="sidebar-nav-item"
                  onClick={onOpenBackup}
                >
                  <span className="sidebar-nav-item-left">
                    <Download size={15} />
                    Backup & CSV
                  </span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Rodapé da Sidebar: Usuário Logado, Banco, Tema e Logout */}
        <div className="sidebar-footer">
          {/* Perfil Logado */}
          {currentUser && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentUser.name}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '0.62rem',
                    color: isSuperAdmin
                      ? 'var(--accent-blue)'
                      : isOperator
                      ? 'var(--accent-amber)'
                      : 'var(--accent-emerald)'
                  }}
                >
                  {isSuperAdmin ? 'SUPER ADMIN' : isOperator ? 'OPERADOR' : 'GESTOR'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon-only btn-sm"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => {
                    setPwdForm({ newPassword: '', confirmPassword: '' });
                    setPwdMessage({ type: '', text: '' });
                    setIsPasswordModalOpen(true);
                  }}
                  title="Alterar minha senha"
                >
                  <KeyRound size={12} />
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-icon-only btn-sm"
                  style={{ width: '24px', height: '24px' }}
                  onClick={logout}
                  title="Sair / Bloquear sessão"
                >
                  <LogOut size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Conexão Supabase (Visível para Super Admin) */}
          {isSuperAdmin && (
            <button
              id="btn-supabase-status"
              className="sidebar-status-btn"
              onClick={onOpenSupabase}
              title={isSupabaseActive ? 'Conectado ao Supabase (Nuvem)' : 'Clique para configurar banco em nuvem'}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span
                  className="status-dot"
                  style={{
                    background: isSupabaseActive ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}
                />
                <Database size={13} />
                <span>{isSupabaseActive ? 'Supabase Online' : 'Banco Local'}</span>
              </span>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {isSupabaseActive ? 'SYNC' : 'LOCAL'}
              </span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={toggleTheme}
              title="Alternar entre Modo Carbono Escuro e Modo Claro"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-icon-only btn-sm"
                onClick={() => {
                  if (window.confirm('Atenção: deseja limpar e zerar todo o banco de dados desta empresa?')) {
                    clearAllData();
                  }
                }}
                title="Zerar banco de dados da empresa atual"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Modal para o Gestor/Admin alterar a própria senha */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <KeyRound size={16} color="var(--accent-blue)" />
                Alterar Minha Senha
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="modal-body">
                {pwdMessage.text && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      marginBottom: '12px',
                      background: pwdMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${pwdMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: pwdMessage.type === 'success' ? 'var(--accent-emerald)' : '#f87171'
                    }}
                  >
                    {pwdMessage.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nova Senha (mín. 6 caracteres):</label>
                  <input
                    type="password"
                    className="form-input mono"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar Nova Senha:</label>
                  <input
                    type="password"
                    className="form-input mono"
                    value={pwdForm.confirmPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para o Gestor da Empresa gerenciar logins de Operadores (Chão de Fábrica) */}
      {isOperatorsModalOpen && !isOperator && (
        <div className="modal-overlay" onClick={() => setIsOperatorsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <UserPlus size={16} color="var(--accent-blue)" />
                Logins de Operadores — {companyName}
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setIsOperatorsModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.45 }}>
                Crie acessos restritos de <strong>Operador</strong> para seus designers e impressores. Eles poderão lançar pedidos e avançar etapas na fila, mas <strong>não podem</strong> excluir pedidos, alterar metas nem apagar o banco.
              </p>

              {opMessage.text && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    marginBottom: '12px',
                    background: opMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${opMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: opMessage.type === 'success' ? 'var(--accent-emerald)' : '#f87171'
                  }}
                >
                  {opMessage.text}
                </div>
              )}

              <form onSubmit={handleAddOperatorSubmit} style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nome do Operador / Designer:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Lucas (Arte / Plotter)"
                    value={opForm.name}
                    onChange={(e) => setOpForm({ ...opForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Login / E-mail:</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder="ex: lucas@fabrica.com"
                      value={opForm.username}
                      onChange={(e) => setOpForm({ ...opForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Senha Inicial (mín. 6 dígitos):</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder="Ex: Arte@2026"
                      value={opForm.password}
                      onChange={(e) => setOpForm({ ...opForm, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  <Plus size={14} />
                  Criar Login de Operador
                </button>
              </form>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Operadores Cadastrados ({companyOperators.length})
                </div>

                {companyOperators.length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                    Nenhum operador cadastrado ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {companyOperators.map((op) => (
                      <div
                        key={op.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '7px 11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {op.name}
                          </div>
                          <div className="mono" style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>
                            Login: {op.username}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.68rem' }}
                            onClick={async () => {
                              const newPwd = window.prompt(
                                `Digite a nova senha para o operador "${op.name}" (mínimo 6 caracteres):`
                              );
                              if (!newPwd) return;
                              if (newPwd.trim().length < 6) {
                                setOpMessage({ type: 'error', text: 'A senha precisa ter pelo menos 6 caracteres.' });
                                return;
                              }
                              const res = await updateUserCredentials(op.id, { newPassword: newPwd.trim() });
                              if (res.ok) {
                                setOpMessage({ type: 'success', text: `Senha de "${op.name}" atualizada com sucesso!` });
                              } else {
                                setOpMessage({ type: 'error', text: res.error });
                              }
                            }}
                            title="Redefinir senha deste operador"
                          >
                            <KeyRound size={11} />
                            Nova Senha
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-icon-only btn-sm"
                            style={{ width: '24px', height: '24px' }}
                            onClick={() => {
                              if (window.confirm(`Remover o login do operador "${op.name}"?`)) {
                                deleteUser(op.id);
                              }
                            }}
                            title="Excluir operador"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
