import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  UserPlus,
  Trash2,
  ExternalLink,
  Calendar,
  X,
  Check
} from 'lucide-react';

export function SuperAdminPanel({ onEnterCompanyWorkspace }) {
  const {
    currentUser,
    tenants,
    users,
    activeTenantId,
    setImpersonatedTenantId,
    createCompanyWithManager,
    updateTenant,
    deleteTenant,
    addManagerToTenant,
    updateUserCredentials,
    deleteUser
  } = useAuth();

  // Modal Nova Empresa + Gestor
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    companyName: '',
    sector: 'Setor de Arte & Impressão',
    document: '',
    plan: 'KromaOPS Pro',
    status: 'active',
    expiresAt: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    managerName: '',
    managerUsername: '',
    managerPassword: ''
  });
  const [formError, setFormError] = useState('');

  // Modal Adicionar Gestor em Empresa Existente
  const [targetTenantForNewManager, setTargetTenantForNewManager] = useState(null);
  const [newManagerForm, setNewManagerForm] = useState({
    name: '',
    username: '',
    password: ''
  });

  // Modal Editar / Redefinir Senha de Usuário (Gestor ou Super Admin)
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    username: '',
    newPassword: ''
  });

  const [feedbackBanner, setFeedbackBanner] = useState('');

  if (currentUser?.role !== 'super_admin') {
    return null;
  }

  const showFeedback = (msg) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(''), 3500);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const activeTenantsCount = tenants.filter(
    (t) => t.status === 'active' && (!t.expiresAt || t.expiresAt >= todayStr)
  ).length;
  const blockedOrExpiredCount = tenants.length - activeTenantsCount;
  const managersCount = users.filter((u) => u.role === 'company_manager').length;

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newCompanyForm.companyName.trim()) {
      setFormError('Informe o nome da empresa cliente.');
      return;
    }
    if (!newCompanyForm.managerUsername.trim() || newCompanyForm.managerPassword.trim().length < 6) {
      setFormError('Informe o login do gestor e uma senha com no mínimo 6 caracteres.');
      return;
    }

    const res = await createCompanyWithManager(newCompanyForm);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setIsNewCompanyOpen(false);
    setNewCompanyForm({
      companyName: '',
      sector: 'Setor de Arte & Impressão',
      document: '',
      plan: 'KromaOPS Pro',
      status: 'active',
      expiresAt: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })(),
      managerName: '',
      managerUsername: '',
      managerPassword: ''
    });
    showFeedback(`Empresa "${res.tenant.name}" e acesso do gestor criados com sucesso.`);
  };

  const handleAdd30Days = (tenant) => {
    const baseDate =
      tenant.expiresAt && tenant.expiresAt >= todayStr ? new Date(tenant.expiresAt + 'T12:00:00') : new Date();
    baseDate.setDate(baseDate.getDate() + 30);
    const nextDateStr = baseDate.toISOString().slice(0, 10);
    updateTenant(tenant.id, { expiresAt: nextDateStr, status: 'active' });
    showFeedback(`Licença de "${tenant.name}" renovada até ${nextDateStr.split('-').reverse().join('/')}.`);
  };

  const handleToggleSuspend = (tenant) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    updateTenant(tenant.id, { status: nextStatus });
    showFeedback(
      nextStatus === 'suspended'
        ? `Acesso da empresa "${tenant.name}" suspenso.`
        : `Acesso da empresa "${tenant.name}" reativado.`
    );
  };

  const handleAddManagerSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newManagerForm.name.trim() || !newManagerForm.username.trim() || newManagerForm.password.trim().length < 6) {
      setFormError('Preencha nome, login e senha (mínimo 6 caracteres).');
      return;
    }
    const res = await addManagerToTenant({
      tenantId: targetTenantForNewManager.id,
      ...newManagerForm
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setTargetTenantForNewManager(null);
    setNewManagerForm({ name: '', username: '', password: '' });
    showFeedback(`Novo gestor adicionado para "${targetTenantForNewManager.name}".`);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const res = await updateUserCredentials(editingUser.id, editUserForm);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setEditingUser(null);
    showFeedback(`Credenciais de "${editUserForm.name}" atualizadas com sucesso.`);
  };

  const formatDateBR = (dStr) => {
    if (!dStr) return 'Sem vencimento';
    const parts = dStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
  };

  return (
    <div className="super-admin-view">
      {/* Cabeçalho Super Admin */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Central SaaS — Gestão de Empresas & Acessos
            </h2>
            <span
              className="mono"
              style={{
                fontSize: '0.64rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(59, 130, 246, 0.14)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--accent-blue)',
                fontWeight: 600
              }}
            >
              SUPER ADMIN
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Controle de licenças, mensalidades, isolamento de dados por cliente e senhas de gestores
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFormError('');
              setEditingUser(currentUser);
              setEditUserForm({
                name: currentUser.name,
                username: currentUser.username,
                newPassword: ''
              });
            }}
          >
            <KeyRound size={13} />
            Minha Senha Super Admin
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFormError('');
              setIsNewCompanyOpen(true);
            }}
          >
            <Plus size={14} />
            Nova Empresa Cliente
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.78rem',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500
          }}
        >
          <Check size={14} />
          {feedbackBanner}
        </div>
      )}

      {/* Fita de Indicadores SaaS */}
      <section className="metrics-panel" style={{ marginBottom: '18px' }}>
        <div className="metrics-secondary-row">
          <div className="metric-cell-compact">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Empresas Clientes
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ambientes isolados no KromaOPS
              </div>
            </div>
            <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {tenants.length}
            </span>
          </div>

          <div className="metric-cell-compact">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Licenças Ativas
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {blockedOrExpiredCount > 0 ? `${blockedOrExpiredCount} suspensa(s)/vencida(s)` : '100% em dia'}
              </div>
            </div>
            <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {activeTenantsCount}
            </span>
          </div>

          <div className="metric-cell-compact">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Gestores Cadastrados
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Senhas protegidas c/ SHA-256 + Salt
              </div>
            </div>
            <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {managersCount}
            </span>
          </div>
        </div>
      </section>

      {/* Lista de Empresas e Seus Gestores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {tenants.map((tenant) => {
          const tenantManagers = users.filter((u) => u.tenantId === tenant.id);
          const isExpired = tenant.expiresAt && tenant.expiresAt < todayStr;
          const isSuspended = tenant.status === 'suspended';
          const isInspecting = activeTenantId === tenant.id;

          let statusBadge = { label: 'LICENÇA ATIVA', color: 'var(--accent-emerald)', dot: '#10b981' };
          if (isSuspended) {
            statusBadge = { label: 'SUSPENSA / BLOQUEADA', color: 'var(--accent-rose)', dot: '#ef4444' };
          } else if (isExpired) {
            statusBadge = { label: 'LICENÇA EXPIRADA', color: 'var(--accent-amber)', dot: '#f59e0b' };
          }

          return (
            <div
              key={tenant.id}
              style={{
                background: 'var(--bg-secondary)',
                border: isInspecting ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
              }}
            >
              {/* Cabeçalho da Empresa */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tenant.name}
                      </h3>
                      <span className="stage-badge mono" style={{ color: statusBadge.color }}>
                        <span className="status-dot" style={{ background: statusBadge.dot, width: '5px', height: '5px' }} />
                        {statusBadge.label}
                      </span>
                      {isInspecting && (
                        <span
                          className="mono"
                          style={{
                            fontSize: '0.64rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'rgba(59, 130, 246, 0.14)',
                            color: 'var(--accent-blue)',
                            fontWeight: 600
                          }}
                        >
                          PAINEL SELECIONADO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {tenant.sector}
                      {tenant.document ? ` · CNPJ/Doc: ${tenant.document}` : ''} · Plano: <strong>{tenant.plan || 'KromaOPS Pro'}</strong>
                    </div>
                  </div>
                </div>

                {/* Controles Rápidos da Licença e Acesso */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: '0.72rem',
                      color: isExpired ? 'var(--accent-rose)' : 'var(--text-secondary)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Calendar size={12} />
                    Validade: <strong>{formatDateBR(tenant.expiresAt)}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAdd30Days(tenant)}
                    title="Renovar assinatura por +30 dias"
                  >
                    +30 Dias
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      color: isSuspended ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                    }}
                    onClick={() => handleToggleSuspend(tenant)}
                  >
                    {isSuspended ? <Unlock size={13} /> : <Lock size={13} />}
                    {isSuspended ? 'Liberar Acesso' : 'Bloquear'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setImpersonatedTenantId(tenant.id);
                      if (onEnterCompanyWorkspace) onEnterCompanyWorkspace();
                    }}
                    title="Abrir o Dashboard e os Pedidos desta empresa"
                  >
                    <ExternalLink size={13} />
                    Acessar Painel
                  </button>

                  {tenants.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-icon-only btn-sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Tem certeza que deseja excluir a empresa "${tenant.name}" e os logins vinculados a ela?`
                          )
                        ) {
                          deleteTenant(tenant.id);
                        }
                      }}
                      title="Excluir empresa"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Gestores da Empresa */}
              <div style={{ padding: '12px 18px', background: 'var(--bg-surface)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    Logins de Gestores desta Empresa ({tenantManagers.length})
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    onClick={() => {
                      setFormError('');
                      setTargetTenantForNewManager(tenant);
                      setNewManagerForm({ name: '', username: '', password: '' });
                    }}
                  >
                    <UserPlus size={12} />
                    Adicionar Gestor
                  </button>
                </div>

                {tenantManagers.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Nenhum gestor vinculado. Clique em "Adicionar Gestor" para criar um login.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '8px' }}>
                    {tenantManagers.map((mgr) => (
                      <div
                        key={mgr.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {mgr.name}
                          </div>
                          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {mgr.username}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            onClick={() => {
                              setFormError('');
                              setEditingUser(mgr);
                              setEditUserForm({
                                name: mgr.name,
                                username: mgr.username,
                                newPassword: ''
                              });
                            }}
                            title="Alterar login ou redefinir senha deste gestor"
                          >
                            <KeyRound size={11} />
                            Senha
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-icon-only btn-sm"
                            style={{ width: '24px', height: '24px' }}
                            onClick={() => {
                              if (window.confirm(`Remover o acesso do gestor "${mgr.name}"?`)) {
                                deleteUser(mgr.id);
                              }
                            }}
                            title="Remover gestor"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: CADASTRAR NOVA EMPRESA CLIENTE + GESTOR */}
      {isNewCompanyOpen && (
        <div className="modal-overlay" onClick={() => setIsNewCompanyOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Building2 size={16} color="var(--accent-blue)" />
                Cadastrar Nova Empresa Cliente (SaaS)
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setIsNewCompanyOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCompany}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>
                    {formError}
                  </div>
                )}

                <div style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  1. Dados da Empresa & Licença
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nome da Confecção / Empresa:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Estilo Uniformes"
                      value={newCompanyForm.companyName}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, companyName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Setor / Unidade:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Setor de Arte & Impressão"
                      value={newCompanyForm.sector}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, sector: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">CNPJ / Identificador:</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder="Opcional"
                      value={newCompanyForm.document}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, document: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plano Comercial:</label>
                    <select
                      className="form-select"
                      value={newCompanyForm.plan}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, plan: e.target.value })}
                    >
                      <option value="KromaOPS Pro">KromaOPS Pro</option>
                      <option value="KromaOPS Enterprise">KromaOPS Enterprise</option>
                      <option value="Trial (Teste)">Trial (Teste)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Validade da Licença:</label>
                    <input
                      type="date"
                      className="form-input mono"
                      value={newCompanyForm.expiresAt}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, expiresAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '12px', marginBottom: '8px', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  2. Credenciais do Gestor da Empresa
                </div>

                <div className="form-group">
                  <label className="form-label">Nome do Gestor / Responsável:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Rodrigo Silva"
                    value={newCompanyForm.managerName}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, managerName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">E-mail / Login do Gestor:</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder="ex: rodrigo@estilouniformes.com"
                      value={newCompanyForm.managerUsername}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, managerUsername: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Senha Inicial (mín. 6 dígitos):</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder="Ex: Mudar@2026"
                      value={newCompanyForm.managerPassword}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, managerPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsNewCompanyOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Check size={14} />
                  Criar Empresa & Gestor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADICIONAR GESTOR EM EMPRESA EXISTENTE */}
      {targetTenantForNewManager && (
        <div className="modal-overlay" onClick={() => setTargetTenantForNewManager(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <UserPlus size={16} />
                Novo Gestor — {targetTenantForNewManager.name}
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setTargetTenantForNewManager(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddManagerSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Nome do Gestor:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newManagerForm.name}
                    onChange={(e) => setNewManagerForm({ ...newManagerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail / Login:</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={newManagerForm.username}
                    onChange={(e) => setNewManagerForm({ ...newManagerForm, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha (mín. 6 caracteres):</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={newManagerForm.password}
                    onChange={(e) => setNewManagerForm({ ...newManagerForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTargetTenantForNewManager(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Salvar Gestor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR CREDENCIAIS / REDEFINIR SENHA */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <ShieldCheck size={16} color="var(--accent-blue)" />
                Credenciais — {editingUser.name}
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setEditingUser(null)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Nome:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail / Usuário de Login:</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={editUserForm.username}
                    onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nova Senha (deixe em branco para manter a atual):</label>
                  <input
                    type="password"
                    className="form-input mono"
                    placeholder="Nova senha (mín. 6 caracteres)"
                    value={editUserForm.newPassword}
                    onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingUser(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Salvar Credenciais
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

