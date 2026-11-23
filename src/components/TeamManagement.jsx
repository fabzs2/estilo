import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Edit3,
  Trash2,
  PenTool,
  Layers,
  Printer,
  X,
  PauseCircle,
  PlayCircle,
  CalendarMinus,
  KeyRound
} from 'lucide-react';

export function TeamManagement() {
  const {
    currentUser,
    users,
    activeTenantId,
    addManagerToTenant,
    updateUserCredentials
  } = useAuth();
  const isOperator = currentUser?.role === 'company_operator';

  const {
    designers,
    addDesigner,
    updateDesigner,
    deleteDesigner,
    metrics,
    workingDaysConfig,
    setDesignerAbsenceDays,
    showToast
  } = useProduction();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [authError, setAuthError] = useState('');

  // Modal rápido exclusivo para Criar / Alterar Login & Senha direto no card do funcionário
  const [quickLoginDesigner, setQuickLoginDesigner] = useState(null);
  const [quickLoginForm, setQuickLoginForm] = useState({ username: '', password: '' });
  const [quickLoginError, setQuickLoginError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    role: 'Designer Criação',
    avatarColor: '#3b82f6',
    goalCriacaoArtes: 8,
    goalExportacao: 10,
    goalImpressaoPecas: 120,
    active: true,
    loginUsername: '',
    loginPassword: ''
  });

  const colorOptions = [
    '#3b82f6', // Slate blue
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#0ea5e9', // Sky
    '#8b5cf6', // Violet
    '#f43f5e'  // Rose
  ];

  const normalizeStr = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const suggestLoginFromDesigner = (des) => {
    const base = normalizeStr(des?.nickname || des?.name || '').split(/[\s(]+/)[0];
    return base.replace(/[^a-z0-9._-]/g, '');
  };

  const findLinkedOperatorUser = (designer) => {
    if (!designer || !Array.isArray(users)) return null;
    const desNameClean = normalizeStr(designer.name);
    const desLoginClean = normalizeStr(designer.loginUsername);
    return users.find(
      (u) =>
        (u.tenantId === activeTenantId || (!u.tenantId && activeTenantId === 'tenant_default')) &&
        u.role === 'company_operator' &&
        (normalizeStr(u.name) === desNameClean ||
          (desLoginClean && normalizeStr(u.username) === desLoginClean) ||
          normalizeStr(u.username) === desNameClean)
    );
  };

  const handleOpenQuickLogin = (designer) => {
    const linked = findLinkedOperatorUser(designer);
    setQuickLoginDesigner(designer);
    setQuickLoginError('');
    setQuickLoginForm({
      username: linked?.username || designer.loginUsername || suggestLoginFromDesigner(designer),
      password: ''
    });
  };

  const handleQuickLoginSubmit = async (e) => {
    e.preventDefault();
    setQuickLoginError('');
    if (!quickLoginDesigner) return;

    const cleanLogin = (quickLoginForm.username || suggestLoginFromDesigner(quickLoginDesigner)).trim().toLowerCase();
    const cleanPass = (quickLoginForm.password || '').trim();
    const linked = findLinkedOperatorUser(quickLoginDesigner);

    if (!cleanLogin) {
      setQuickLoginError('Informe um usuário ou e-mail de login.');
      return;
    }

    if (linked && !cleanPass) {
      const res = await updateUserCredentials(linked.id, {
        name: quickLoginDesigner.name.trim(),
        username: cleanLogin
      });
      if (!res.ok) {
        setQuickLoginError(res.error);
        return;
      }
    } else {
      if (cleanPass.length < 3) {
        setQuickLoginError('Informe uma senha com pelo menos 3 caracteres.');
        return;
      }
      const res = await addManagerToTenant({
        tenantId: activeTenantId,
        name: quickLoginDesigner.name.trim(),
        username: cleanLogin,
        password: cleanPass,
        role: 'company_operator'
      });
      if (!res.ok) {
        setQuickLoginError(res.error);
        return;
      }
    }

    await updateDesigner(quickLoginDesigner.id, { loginUsername: cleanLogin });
    if (showToast) {
      showToast(`Acesso de "${quickLoginDesigner.name}" salvo! Login: ${cleanLogin}`);
    }
    setQuickLoginDesigner(null);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setAuthError('');
    setFormData({
      name: '',
      nickname: '',
      role: 'Designer Criação',
      avatarColor: colorOptions[Math.floor(Math.random() * colorOptions.length)],
      goalCriacaoArtes: 8,
      goalExportacao: 0,
      goalImpressaoPecas: 0,
      active: true,
      loginUsername: '',
      loginPassword: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (designer) => {
    const linkedUser = findLinkedOperatorUser(designer);
    setEditingId(designer.id);
    setAuthError('');
    setFormData({
      name: designer.name,
      nickname: designer.nickname || '',
      role: designer.role || '',
      avatarColor: designer.avatarColor || '#3b82f6',
      goalCriacaoArtes: designer.goalCriacaoArtes ?? 8,
      goalExportacao: designer.goalExportacao ?? 10,
      goalImpressaoPecas: designer.goalImpressaoPecas ?? 120,
      active: designer.active ?? true,
      loginUsername: linkedUser?.username || designer.loginUsername || '',
      loginPassword: ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!formData.name.trim()) {
      alert('Informe o nome do profissional.');
      return;
    }

    const existingDesigner = editingId ? designers.find((d) => d.id === editingId) : null;
    const linkedUser = existingDesigner ? findLinkedOperatorUser(existingDesigner) : null;

    let cleanLogin = (formData.loginUsername || '').trim().toLowerCase();
    const cleanPass = (formData.loginPassword || '').trim();

    // Se o gestor digitou apenas a senha sem preencher o campo de login, gera o login automaticamente pelo apelido/nome
    if (!cleanLogin && cleanPass) {
      cleanLogin = suggestLoginFromDesigner(formData) || normalizeStr(formData.name);
    }

    if (cleanLogin || cleanPass) {
      if (linkedUser && !cleanPass) {
        const res = await updateUserCredentials(linkedUser.id, {
          name: formData.name.trim(),
          username: cleanLogin
        });
        if (!res.ok) {
          setAuthError(res.error);
          return;
        }
      } else {
        if (!cleanPass || cleanPass.length < 3) {
          setAuthError('Para ativar ou atualizar o login deste funcionário, digite uma senha (mínimo 3 caracteres).');
          return;
        }
        const res = await addManagerToTenant({
          tenantId: activeTenantId,
          name: formData.name.trim(),
          username: cleanLogin,
          password: cleanPass,
          role: 'company_operator'
        });
        if (!res.ok) {
          setAuthError(res.error);
          return;
        }
        if (showToast) {
          showToast(`Login "${cleanLogin}" ativado para ${formData.name.trim()}!`);
        }
      }
    }

    const { loginPassword: _lp, ...designerPayload } = formData;
    designerPayload.loginUsername = cleanLogin || designerPayload.loginUsername || '';

    if (editingId) {
      await updateDesigner(editingId, designerPayload);
    } else {
      await addDesigner(designerPayload);
    }
    setIsFormOpen(false);
  };

  const handleToggleActive = (designer) => {
    const nextActive = designer.active === false;
    updateDesigner(designer.id, { active: nextActive });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Tem certeza que deseja remover o(a) designer "${name}"? Os lançamentos existentes serão mantidos.`)) {
      deleteDesigner(id);
    }
  };

  return (
    <div className="team-view">
      {/* Cabeçalho da Seção de Equipe */}
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
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Equipe & Metas Individuais
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Metas diárias por etapa e controle de folgas abonadas no período
          </p>
        </div>

        {!isOperator && (
          <button
            id="btn-add-designer"
            className="btn btn-primary btn-sm"
            onClick={handleOpenNew}
          >
            <UserPlus size={14} />
            Novo Profissional
          </button>
        )}
      </div>

      {/* Formulário Modal para Criar/Editar Designer */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editingId ? 'Editar Designer' : 'Novo Designer da Equipe'}
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setIsFormOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {authError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      marginBottom: '12px',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171'
                    }}
                  >
                    {authError}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="des-name">Nome Completo:</label>
                    <input
                      id="des-name"
                      type="text"
                      className="form-input"
                      placeholder="Ex: Carlos Eduardo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="des-nick">Apelido no Setor (Opcional):</label>
                    <input
                      id="des-nick"
                      type="text"
                      className="form-input"
                      placeholder="Ex: Cadu Criação"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="des-role">Cargo / Especialidade Principal:</label>
                    <select
                      id="des-role"
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        let presets = {};
                        if (newRole === 'Designer Criação') {
                          presets = { goalCriacaoArtes: 8, goalExportacao: 0, goalImpressaoPecas: 0 };
                        } else if (newRole === 'Arte-Finalista & Exportação') {
                          presets = { goalCriacaoArtes: 0, goalExportacao: 10, goalImpressaoPecas: 0 };
                        } else if (newRole === 'Operador de Impressão / RIP') {
                          presets = { goalCriacaoArtes: 0, goalExportacao: 0, goalImpressaoPecas: 120 };
                        } else if (newRole === 'Designer Geral') {
                          presets = { goalCriacaoArtes: 8, goalExportacao: 10, goalImpressaoPecas: 120 };
                        }
                        setFormData((prev) => ({
                          ...prev,
                          role: newRole,
                          ...presets
                        }));
                      }}
                    >
                      <option value="Designer Criação">Designer Criação (Foco em Artes)</option>
                      <option value="Arte-Finalista & Exportação">Arte-Finalista (Foco em Exportação/Fechamento)</option>
                      <option value="Operador de Impressão / RIP">Operador de Impressão (Foco em Peças Impressas)</option>
                      <option value="Designer Geral">Designer Geral (Atua em Todas as Etapas)</option>
                      <option value="Pré-Impressão & DTF">Pré-Impressão & DTF / Serigrafia</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cor de Identificação:</label>
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', flexWrap: 'wrap' }}>
                      {colorOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: c,
                            border: formData.avatarColor === c ? '2px solid #fff' : '1px solid var(--border-light)',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          onClick={() => setFormData({ ...formData, avatarColor: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metas Personalizadas por Categoria */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '14px 0 16px', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Metas Personalizadas por Categoria:
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Defina o objetivo diário esperado para cada etapa. Digite <strong>0</strong> caso o profissional não atue nessa etapa.
                  </p>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-criacao">
                        Criação (Artes/dia):
                      </label>
                      <input
                        id="des-goal-criacao"
                        type="number"
                        min="0"
                        className="form-input mono"
                        placeholder="Ex: 8"
                        value={formData.goalCriacaoArtes}
                        onChange={(e) => setFormData({ ...formData, goalCriacaoArtes: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>0 se não cria</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-exportacao">
                        Exportação (Exp/dia):
                      </label>
                      <input
                        id="des-goal-exportacao"
                        type="number"
                        min="0"
                        className="form-input mono"
                        placeholder="Ex: 10"
                        value={formData.goalExportacao}
                        onChange={(e) => setFormData({ ...formData, goalExportacao: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>0 se não fecha</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-impressao">
                        Impressão (Peças/dia):
                      </label>
                      <input
                        id="des-goal-impressao"
                        type="number"
                        min="0"
                        className="form-input mono"
                        placeholder="Ex: 120"
                        value={formData.goalImpressaoPecas}
                        onChange={(e) => setFormData({ ...formData, goalImpressaoPecas: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>0 se não imprime</span>
                    </div>
                  </div>
                </div>

                {/* Acesso ao Sistema (Login de Operador - Opcional) */}
                {!isOperator && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '14px 0 4px', paddingTop: '14px' }}>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <KeyRound size={14} color="var(--accent-blue)" />
                      Acesso ao Sistema (Login de Operador — Opcional)
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Preencha abaixo se desejar que este profissional tenha um login próprio para entrar no sistema como <strong>Operador</strong>.
                    </p>

                    <div className="form-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="des-login-user">
                          Login ou E-mail de Acesso:
                        </label>
                        <input
                          id="des-login-user"
                          type="text"
                          className="form-input mono"
                          placeholder="ex: lucas ou lucas@estilo.com"
                          value={formData.loginUsername || ''}
                          onChange={(e) => setFormData({ ...formData, loginUsername: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="des-login-pass">
                          {editingId && findLinkedOperatorUser(designers.find((d) => d.id === editingId))
                            ? 'Nova Senha (deixe em branco p/ manter):'
                            : 'Senha de Acesso (mín. 3 dígitos):'}
                        </label>
                        <input
                          id="des-login-pass"
                          type="text"
                          className="form-input mono"
                          placeholder="Ex: estilo123"
                          value={formData.loginPassword || ''}
                          onChange={(e) => setFormData({ ...formData, loginPassword: e.target.value })}
                        />
                      </div>
                    </div>

                    {authError && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          marginTop: '10px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#f87171'
                        }}
                      >
                        {authError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Designer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de Cards dos Designers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: '16px'
        }}
      >
        {designers.length === 0 && (
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '48px 24px',
              textAlign: 'center',
              gridColumn: '1 / -1'
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Nenhum designer cadastrado ainda
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
              Cadastre os membros da sua equipe para definir metas personalizadas de artes, exportações e peças impressas.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleOpenNew}>
              <UserPlus size={14} />
              + Cadastrar Primeiro Designer
            </button>
          </div>
        )}

        {designers.map((designer) => {
          const stats = metrics.designerStats.find((s) => s.id === designer.id);
          const isPaused = designer.active === false;
          const absenceDays = Number(workingDaysConfig?.designerAbsences?.[designer.id] || 0);
          const linkedOp = findLinkedOperatorUser(designer);

          return (
            <div
              key={designer.id}
              style={{
                background: 'var(--bg-secondary)',
                border: isPaused ? '1px dashed var(--border-light)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: isPaused ? 0.72 : 1
              }}
            >
              {/* Header do Card */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="avatar-badge"
                      style={{
                        width: '38px',
                        height: '38px',
                        fontSize: '1rem',
                        background: designer.avatarColor || '#3b82f6',
                        color: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.2)'
                      }}
                    >
                      {designer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {designer.name}
                        {isPaused && (
                          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                            Férias / Inativo
                          </span>
                        )}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {designer.nickname ? `${designer.nickname} • ${designer.role}` : designer.role}
                      </div>
                      {!isOperator && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {linkedOp ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickLogin(designer)}
                              className="mono"
                              style={{
                                fontSize: '0.66rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(16, 185, 129, 0.14)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34d399',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600
                              }}
                              title="Clique para alterar o login ou redefinir a senha deste funcionário"
                            >
                              <KeyRound size={11} />
                              Login: {linkedOp.username} (Alterar Senha)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickLogin(designer)}
                              style={{
                                fontSize: '0.67rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: 'var(--accent-blue)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600
                              }}
                              title="Clique para criar usuário e senha para este funcionário entrar no sistema"
                            >
                              <KeyRound size={11} />
                              + Criar Login de Acesso
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isOperator && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-secondary btn-icon-only btn-sm"
                        onClick={() => handleToggleActive(designer)}
                        title={isPaused ? 'Reativar designer na equipe' : 'Pausar designer (Férias / Afastamento)'}
                      >
                        {isPaused ? <PlayCircle size={13} color="#34d399" /> : <PauseCircle size={13} color="#fbbf24" />}
                      </button>
                      <button
                        className="btn btn-secondary btn-icon-only btn-sm"
                        onClick={() => handleOpenEdit(designer)}
                        title="Editar metas e dados"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon-only btn-sm"
                        onClick={() => handleDelete(designer.id, designer.name)}
                        title="Remover designer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Médias Diárias Reais por Categoria */}
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Criação</div>
                    <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgCriacao : 0}
                    </div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateCriacao !== null ? `${stats.rateCriacao}% meta` : 'artes/dia'}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Exportação</div>
                    <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgExportacao : 0}
                    </div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateExportacao !== null ? `${stats.rateExportacao}% meta` : 'exp/dia'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Impressão</div>
                    <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgImpressaoPieces : 0}
                    </div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateImpressao !== null ? `${stats.rateImpressao}% meta` : 'peças/dia'}
                    </div>
                  </div>
                </div>

                {/* Controle de Folgas / Faltas Abonadas no Período */}
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '7px 10px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.73rem'
                  }}
                  title="Desconta dias de folga ou atestado médico para não derrubar a média diária deste designer"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <CalendarMinus size={13} color="#38bdf8" />
                    Folgas/Atestados no Período:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isOperator && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '1px 6px', height: '22px', fontSize: '0.72rem' }}
                        onClick={() => setDesignerAbsenceDays(designer.id, Math.max(0, absenceDays - 1))}
                        disabled={absenceDays <= 0}
                      >
                        -
                      </button>
                    )}
                    <strong style={{ minWidth: '42px', textAlign: 'center', color: absenceDays > 0 ? '#38bdf8' : 'var(--text-primary)' }}>
                      {absenceDays} dia{absenceDays !== 1 ? 's' : ''}
                    </strong>
                    {!isOperator && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '1px 6px', height: '22px', fontSize: '0.72rem' }}
                        onClick={() => setDesignerAbsenceDays(designer.id, absenceDays + 1)}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* Metas Personalizadas Cadastradas */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <PenTool size={12} color="#60a5fa" /> Meta Criação:
                    </span>
                    {Number(designer.goalCriacaoArtes) > 0 ? (
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {designer.goalCriacaoArtes} artes/dia ({designer.goalCriacaoArtes * (metrics.totalMonthWorkingDays || 22)}/mês)
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>— (Não se aplica)</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Layers size={12} color="#a78bfa" /> Meta Exportação:
                    </span>
                    {Number(designer.goalExportacao) > 0 ? (
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {designer.goalExportacao} exp/dia ({designer.goalExportacao * (metrics.totalMonthWorkingDays || 22)}/mês)
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>— (Não se aplica)</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Printer size={12} color="#34d399" /> Meta Impressão:
                    </span>
                    {Number(designer.goalImpressaoPecas) > 0 ? (
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {designer.goalImpressaoPecas} pçs/dia ({(designer.goalImpressaoPecas * (metrics.totalMonthWorkingDays || 22)).toLocaleString('pt-BR')}/mês)
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>— (Não se aplica)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status do Membro */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Base: <strong>{stats ? stats.workingDays : metrics.workingDaysCount}d úteis</strong>
                </span>
                <span style={{ fontWeight: 600, color: isPaused ? 'var(--text-muted)' : stats?.performanceStatus === 'Superando' ? 'var(--accent-emerald)' : stats?.performanceStatus === 'Na Meta' ? 'var(--text-primary)' : 'var(--accent-amber)' }}>
                  {isPaused ? 'Pausado / Férias' : `${stats?.performanceStatus || 'Ativo'} (${stats ? stats.goalAchievementRate : 100}%)`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Rápido de Login & Senha direto no Card do Funcionário */}
      {quickLoginDesigner && !isOperator && (
        <div className="modal-overlay" onClick={() => setQuickLoginDesigner(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={16} color="var(--accent-blue)" />
                Acesso do Funcionário — {quickLoginDesigner.name}
              </div>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => setQuickLoginDesigner(null)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleQuickLoginSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.45 }}>
                  Defina o usuário/e-mail e a senha para <strong>{quickLoginDesigner.name}</strong> entrar no sistema como <strong>Operador</strong>. Ele também poderá entrar digitando o próprio nome.
                </p>

                {quickLoginError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      marginBottom: '12px',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171'
                    }}
                  >
                    {quickLoginError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="quick-login-user">
                    Usuário ou E-mail de Login:
                  </label>
                  <input
                    id="quick-login-user"
                    type="text"
                    className="form-input mono"
                    placeholder="ex: lucas ou lucas@estilo.com"
                    value={quickLoginForm.username}
                    onChange={(e) => setQuickLoginForm({ ...quickLoginForm, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="quick-login-pass">
                    Senha de Acesso (mín. 3 dígitos):
                  </label>
                  <input
                    id="quick-login-pass"
                    type="text"
                    className="form-input mono"
                    placeholder="Digite a senha (ex: 123456)"
                    value={quickLoginForm.password}
                    onChange={(e) => setQuickLoginForm({ ...quickLoginForm, password: e.target.value })}
                    autoFocus
                    required={!findLinkedOperatorUser(quickLoginDesigner)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickLoginDesigner(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Salvar Login & Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
