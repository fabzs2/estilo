import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Target, 
  Ruler, 
  Shirt, 
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
    dailyGoalOrders: 8,
    dailyGoalMeters: 0,
    dailyGoalPieces: 50
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
      dailyGoalOrders: 8,
      dailyGoalMeters: 0,
      dailyGoalPieces: 50
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
      dailyGoalOrders: designer.dailyGoalOrders || 8,
      dailyGoalMeters: designer.dailyGoalMeters || 0,
      dailyGoalPieces: designer.dailyGoalPieces || 50
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
            Equipe de Designers & Metas Diárias
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Gerencie os membros e configure metas para cálculo de médias e produtividade.
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
                    <label className="form-label" htmlFor="des-role">Cargo / Especialidade:</label>
                    <select
                      id="des-role"
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Designer Criação">Designer Criação (Layouts & Mockups)</option>
                      <option value="Arte-Finalista & Exportação">Arte-Finalista & Exportação (Fechamento)</option>
                      <option value="Operador de Impressão / RIP">Operador de Impressão / RIP</option>
                      <option value="Designer Geral">Designer Geral (Todas as Etapas)</option>
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

                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0 16px', paddingTop: '12px' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Metas Diárias para Cálculo da Média:
                  </h4>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-orders">Meta Pedidos/Dia:</label>
                      <input
                        id="des-goal-orders"
                        type="number"
                        min="1"
                        className="form-input"
                        value={formData.dailyGoalOrders}
                        onChange={(e) => setFormData({ ...formData, dailyGoalOrders: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-pieces">Meta Peças/Dia:</label>
                      <input
                        id="des-goal-pieces"
                        type="number"
                        min="0"
                        className="form-input"
                        value={formData.dailyGoalPieces}
                        onChange={(e) => setFormData({ ...formData, dailyGoalPieces: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="des-goal-meters">Meta Metros/Dia (Impressão):</label>
                      <input
                        id="des-goal-meters"
                        type="number"
                        min="0"
                        className="form-input"
                        value={formData.dailyGoalMeters}
                        onChange={(e) => setFormData({ ...formData, dailyGoalMeters: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar Designer' : 'Cadastrar Designer'}
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
              Cadastre os membros da sua equipe para definir metas diárias e calcular a média de produção em Criação, Exportação e Impressão.
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

                {/* Métricas Recentes deste Designer */}
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
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Média Diária</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.dailyAvgOrders : 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ped/dia</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>No Período</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.ordersCount : 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>pedidos</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Metragem</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stats ? stats.metersCount : 0}m
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>linear</div>
                  </div>
                </div>

                {/* Metas Diárias Cadastradas */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Target size={13} color="var(--text-muted)" /> Meta Pedidos:
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{designer.dailyGoalOrders} / dia</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Shirt size={13} color="var(--text-muted)" /> Meta Peças:
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{designer.dailyGoalPieces || 0} peças/dia</strong>
                  </div>
                  {designer.dailyGoalMeters > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Ruler size={13} color="var(--text-muted)" /> Meta Impressão:
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{designer.dailyGoalMeters}m / dia</strong>
                    </div>
                  )}
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
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ fontWeight: 600, color: stats?.performanceStatus === 'Superando' ? 'var(--accent-emerald)' : stats?.performanceStatus === 'Na Meta' ? 'var(--text-primary)' : 'var(--accent-amber)' }}>
                  {stats?.performanceStatus || 'Ativo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
