import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  PenTool, 
  Layers, 
  Printer, 
  X
} from 'lucide-react';

export function TeamManagement() {
  const { designers, addDesigner, updateDesigner, deleteDesigner, metrics } = useProduction();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    role: 'Designer Criação',
    avatarColor: '#3b82f6',
    goalCriacaoArtes: 8,
    goalExportacao: 10,
    goalImpressaoPecas: 120
  });

  const colorOptions = [
    '#3b82f6', // Slate blue
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#64748b', // Slate
    '#0ea5e9'  // Sky
  ];

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      nickname: '',
      role: 'Designer Criação',
      avatarColor: colorOptions[Math.floor(Math.random() * colorOptions.length)],
      goalCriacaoArtes: 8,
      goalExportacao: 10,
      goalImpressaoPecas: 120
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (designer) => {
    setEditingId(designer.id);
    setFormData({
      name: designer.name,
      nickname: designer.nickname || '',
      role: designer.role || '',
      avatarColor: designer.avatarColor || '#3b82f6',
      goalCriacaoArtes: designer.goalCriacaoArtes ?? 8,
      goalExportacao: designer.goalExportacao ?? 10,
      goalImpressaoPecas: designer.goalImpressaoPecas ?? 120
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Informe o nome do designer.');
      return;
    }

    if (editingId) {
      updateDesigner(editingId, formData);
    } else {
      addDesigner(formData);
    }
    setIsFormOpen(false);
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
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--text-muted)" />
            Equipe de Designers & Metas por Categoria
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Metas específicas: <strong>Criação</strong> (artes diárias), <strong>Exportação</strong> (exportações diárias) e <strong>Impressão</strong> (peças impressas).
          </p>
        </div>

        <button
          id="btn-add-designer"
          className="btn btn-primary"
          onClick={handleOpenNew}
        >
          <UserPlus size={14} />
          + Novo Designer
        </button>
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
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
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
                        🎨 Criação:
                      </label>
                      <input
                        id="des-goal-criacao"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="Ex: 8"
                        value={formData.goalCriacaoArtes}
                        onChange={(e) => setFormData({ ...formData, goalCriacaoArtes: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>artes diárias (0 se não cria)</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-exportacao">
                        📐 Exportação:
                      </label>
                      <input
                        id="des-goal-exportacao"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="Ex: 10"
                        value={formData.goalExportacao}
                        onChange={(e) => setFormData({ ...formData, goalExportacao: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>exportações/dia (0 se não fecha)</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-impressao">
                        🖨️ Impressão:
                      </label>
                      <input
                        id="des-goal-impressao"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="Ex: 120"
                        value={formData.goalImpressaoPecas}
                        onChange={(e) => setFormData({ ...formData, goalImpressaoPecas: Number(e.target.value) })}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>peças impressas/dia (0 se não imprime)</span>
                    </div>
                  </div>
                </div>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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

          return (
            <div 
              key={designer.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
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
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {designer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {designer.name}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {designer.nickname || designer.role}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary btn-icon-only btn-sm"
                      onClick={() => handleOpenEdit(designer)}
                      title="Editar metas"
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
                </div>

                {/* Médias Diárias Reais por Categoria */}
                <div 
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600 }}>Criação</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgCriacao : 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateCriacao !== null ? `${stats.rateCriacao}% meta` : 'artes/dia'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 600 }}>Exportação</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgExportacao : 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateExportacao !== null ? `${stats.rateExportacao}% meta` : 'exp/dia'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>Impressão</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgImpressaoPieces : 0}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {stats?.rateImpressao !== null ? `${stats.rateImpressao}% meta` : 'peças/dia'}
                    </div>
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
                        {designer.goalCriacaoArtes} artes/dia
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
                        {designer.goalExportacao} exp/dia
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
                        {designer.goalImpressaoPecas} peças/dia
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
                <span style={{ color: 'var(--text-muted)' }}>Desempenho Geral:</span>
                <span style={{ fontWeight: 600, color: stats?.performanceStatus === 'Superando' ? 'var(--accent-emerald)' : stats?.performanceStatus === 'Na Meta' ? 'var(--text-primary)' : 'var(--accent-amber)' }}>
                  {stats?.performanceStatus || 'Ativo'} ({stats ? stats.goalAchievementRate : 100}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
