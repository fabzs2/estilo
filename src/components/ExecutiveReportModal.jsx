import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { STAGES } from '../constants/initialData';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  Calendar, 
  PenTool,
  Layers
} from 'lucide-react';

export function ExecutiveReportModal() {
  const { isReportOpen, setIsReportOpen, metrics, dateBounds } = useProduction();
  const [copied, setCopied] = useState(false);

  if (!isReportOpen) return null;

  const handleClose = () => {
    setIsReportOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Texto formatado pronto para enviar no WhatsApp ou e-mail do chefe
  const generateTextMessage = () => {
    const todayBR = new Date().toLocaleDateString('pt-BR');
    let text = `*RELATÓRIO DE PRODUÇÃO - SETOR DE DESIGN (${dateBounds.label.toUpperCase()})*\n`;
    text += `📅 Data de Emissão: ${todayBR}\n`;
    text += `📊 Base de Cálculo: ${metrics.workingDaysCount} dia(s) úteis trabalhados\n\n`;
    text += `*RESUMO GERAL DO SETOR:*\n`;
    text += `• Total de Pedidos Concluídos: ${metrics.totalOrders}\n`;
    text += `• Média Diária por Designer: ${metrics.teamDailyAvgOrders.toFixed(1)} pedidos/dia\n`;
    text += `• Volume Total de Peças: ${metrics.totalPieces.toLocaleString('pt-BR')} peças\n`;
    text += `• Metragem Impressa (Plotter): ${metrics.totalMeters} metros lineares\n\n`;
    text += `*DISTRIBUIÇÃO POR ETAPA:*\n`;
    text += `• Criação de Arte: ${metrics.stageCounts.criacao} pedidos\n`;
    text += `• Exportação / Fechamento: ${metrics.stageCounts.exportacao} pedidos\n`;
    text += `• Impressão / Plotter: ${metrics.stageCounts.impressao} pedidos\n\n`;
    text += `*DESEMPENHO INDIVIDUAL:*\n`;

    metrics.rankedDesigners.forEach((d, idx) => {
      text += `${idx + 1}. *${d.name}* (${d.role})\n`;
      text += `   - Entregas no período: ${d.ordersCount} pedidos\n`;
      text += `   - Média Diária: *${d.dailyAvgOrders} ped/dia* (Meta: ${d.dailyGoalOrders}/dia)\n`;
      text += `   - Peças: ${d.piecesCount} | Metros: ${d.metersCount}m\n`;
      text += `   - Status: ${d.performanceStatus} (${d.goalAchievementRate}% da meta)\n\n`;
    });

    return text;
  };

  const handleCopyText = () => {
    const text = generateTextMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content modal-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px' }}
      >
        {/* Header do Modal com Ações */}
        <div className="modal-header no-print">
          <div className="modal-title">
            <Printer size={17} />
            Relatório de Produtividade & Médias
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyText}
              title="Copiar resumo formatado para WhatsApp"
            >
              {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              {copied ? 'Copiado p/ WhatsApp' : 'Copiar Resumo'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} />
              Imprimir / PDF
            </button>
            <button
              className="btn btn-secondary btn-icon-only btn-sm"
              onClick={handleClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Relatório */}
        <div className="modal-body" style={{ padding: '24px 28px' }}>
          {/* Cabeçalho Oficial */}
          <div 
            style={{
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                RELATÓRIO DE DESEMPENHO & MÉDIAS - SETOR DE DESIGN
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Fábrica de Uniformes • Criação, Exportação & Impressão
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div><strong>Período:</strong> {dateBounds.label}</div>
              <div><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          {/* Resumo em Destaque */}
          <div 
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              textAlign: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total de Pedidos</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalOrders}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{metrics.workingDaysCount} dia(s) úteis</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Média Diária / Designer</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.teamDailyAvgOrders.toFixed(1)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>pedidos / dia</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Volume de Peças</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalPieces.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>uniformes</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Metragem Impressa</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalMeters}m</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>papel & sublimação</div>
            </div>
          </div>

          {/* Divisão por Etapa */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Divisão Operacional por Etapa:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Criação de Arte</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.stageCounts.criacao} pedidos</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {metrics.totalOrders > 0 ? Math.round((metrics.stageCounts.criacao / metrics.totalOrders) * 100) : 0}% da produção
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exportação / Fechamento</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.stageCounts.exportacao} pedidos</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {metrics.totalOrders > 0 ? Math.round((metrics.stageCounts.exportacao / metrics.totalOrders) * 100) : 0}% da produção
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Impressão / Plotter</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.stageCounts.impressao} pedidos</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {metrics.totalMeters}m lineares
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Produtividade dos Designers */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Quadro de Produtividade Individual:
            </h4>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Designer</th>
                    <th>Especialidade</th>
                    <th style={{ textAlign: 'center' }}>Pedidos</th>
                    <th style={{ textAlign: 'center' }}>Média Diária</th>
                    <th style={{ textAlign: 'center' }}>Peças</th>
                    <th style={{ textAlign: 'center' }}>Metros</th>
                    <th style={{ textAlign: 'center' }}>Meta</th>
                    <th style={{ textAlign: 'center' }}>% Atingido</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.rankedDesigners.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.role}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.ordersCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {d.dailyAvgOrders} ped/dia
                      </td>
                      <td style={{ textAlign: 'center' }}>{d.piecesCount}</td>
                      <td style={{ textAlign: 'center' }}>{d.metersCount > 0 ? `${d.metersCount}m` : '-'}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{d.dailyGoalOrders}/dia</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.goalAchievementRate}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                          {d.performanceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assinatura / Rodapé */}
          <div 
            style={{
              marginTop: '30px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <div>
              DesignFlow Uniformes • Relatório de Liderança
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ borderBottom: '1px solid var(--text-muted)', width: '200px', marginBottom: '4px' }} />
              <div>Liderança do Setor de Design</div>
            </div>
          </div>
        </div>

        {/* Rodapé no Modal */}
        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={handleClose}>
            Fechar
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} />
            Imprimir Relatório
          </button>
        </div>
      </div>
    </div>
  );
}
