import React, { useRef } from 'react';
import { useProduction } from '../context/ProductionContext';
import { Download, Upload, RotateCcw, X, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export function BackupModal({ isOpen, onClose }) {
  const { exportToJSON, importFromJSON, exportToCSV, resetToSampleData } = useProduction();
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromJSON(file);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <ShieldCheck size={17} />
            Backup & Segurança dos Dados
          </div>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Seus lançamentos ficam salvos localmente. Exporte cópias de segurança para manter um histórico externo ou importar em outro computador.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Exportar JSON */}
            <div 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileJson size={15} color="var(--text-muted)" />
                  Backup Completo (JSON)
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Salva todos os designers, metas e histórico
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={exportToJSON}>
                <Download size={13} />
                Baixar JSON
              </button>
            </div>

            {/* Importar JSON */}
            <div 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={15} color="var(--text-muted)" />
                  Restaurar Backup
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Carrega um arquivo .json salvo anteriormente
                </p>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} />
                Selecionar
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </div>

            {/* Exportar CSV */}
            <div 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={15} color="var(--text-muted)" />
                  Planilha Excel (CSV)
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Exporta histórico para abrir em planilhas
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={exportToCSV}>
                <Download size={13} />
                Baixar CSV
              </button>
            </div>

            {/* Restaurar Exemplo */}
            <div 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Restaurar Dados Padrão
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Recarrega equipe e histórico padrão de uniformes
                </p>
              </div>
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => {
                  if (window.confirm('Substituir todos os dados atuais pelos dados padrão de exemplo?')) {
                    resetToSampleData();
                    onClose();
                  }
                }}
              >
                <RotateCcw size={13} />
                Restaurar
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
