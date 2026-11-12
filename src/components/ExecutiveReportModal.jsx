import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  Printer,
  X,
  Copy,
  Check
} from 'lucide-react';

export function ExecutiveReportModal() {
  const { isReportOpen, setIsReportOpen, metrics, dateBounds, workingDaysConfig } = useProduction();
  const [copied, setCopied] = useState(false);

  if (!isReportOpen) return null;

  const companyName = workingDaysConfig?.companyName || 'Estamparia & Uniformes';
  const companySub = workingDaysConfig?.companySub || 'Setor de Arte & Impressão';

  const handleClose = () => {
    setIsReportOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const todayBR = new Date().toLocaleDateString('pt-BR');

  // Texto formatado pronto para enviar no WhatsApp ou e-mail da diretoria
  const generateTextMessage = () => {
    let text = `*RELATÓRIO OPERACIONAL — ${companyName.toUpperCase()} (${dateBounds.label.toUpperCase()})*\n`;
    text += `Setor: ${companySub}\n`;
    text += `Emissão: ${todayBR} | Base: ${metrics.workingDaysCount}d úteis (${metrics.totalMonthWorkingDays}d no mês)\n\n`;
    text += `*INDICADORES GERAIS:*\n`;
    text += `• Pedidos Únicos: ${metrics.totalOrders}\n`;
    text += `• Criação: ${metrics.stageCounts.criacao} artes (Média: ${metrics.teamDailyAvgCriacao}/dia | Meta Diária: ${metrics.teamDailyGoalCriacao} | Meta Mês: ${metrics.monthGoalCriacao})\n`;
    text += `• Exportação: ${metrics.stageCounts.exportacao} fechamentos (Média: ${metrics.teamDailyAvgExportacao}/dia | Meta Diária: ${metrics.teamDailyGoalExportacao} | Meta Mês: ${metrics.monthGoalExportacao})\n`;
    text += `• Impressão: ${metrics.impressaoTotalPieces.toLocaleString('pt-BR')} peças (Média: ${metrics.teamDailyAvgImpressaoPieces}/dia | Meta Diária: ${metrics.teamDailyGoalImpressaoPieces} | Meta Mês: ${metrics.monthGoalImpressaoPieces.toLocaleString('pt-BR')})\n`;
    text += `• Metragem Plotter: ${metrics.totalMeters}m lineares\n`;
    text += `• Índice de Refação: ${metrics.reworkStats?.reworkRate || 0}%\n\n`;
    text += `*DESEMPENHO POR PROFISSIONAL:*\n`;

    metrics.rankedDesigners.forEach((d, idx) => {
      const pausedTag = d.active === false ? ' [PAUSADO]' : '';
      const absenceTag = d.absenceDays > 0 ? ` (${d.workingDays}d úteis, -${d.absenceDays}d abonado)` : ` (${d.workingDays}d úteis)`;
      text += `${idx + 1}. *${d.name}* (${d.role})${pausedTag}${absenceTag}\n`;
      text += `   - Pedidos: ${d.ordersCount}\n`;
      if (d.goalCriacaoArtes > 0) {
        text += `   - Criação: ${d.dailyAvgCriacao}/dia (Meta: ${d.goalCriacaoArtes} | ${d.rateCriacao}%)\n`;
      }
      if (d.goalExportacao > 0) {
        text += `   - Exportação: ${d.dailyAvgExportacao}/dia (Meta: ${d.goalExportacao} | ${d.rateExportacao}%)\n`;
      }
      if (d.goalImpressaoPecas > 0) {
        text += `   - Impressão: ${d.dailyAvgImpressaoPieces} pçs/dia (Meta: ${d.goalImpressaoPecas} | ${d.rateImpressao}%)\n`;
      }
      text += `   - Atingimento: ${d.performanceStatus} (${d.goalAchievementRate}%)\n\n`;
    });

    text += `_Gerado via KromaOPS_`;
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
        style={{ maxWidth: '840px' }}
      >
        {/* Header do Modal com Ações */}
        <div className="modal-header no-print">
          <div className="modal-title">
            <Printer size={17} />
            Relatório de Produtividade & Médias por Categoria
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
              <div className="mono" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {companyName} • {companySub}
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                RELATÓRIO EXECUTIVO DE PRODUÇÃO & METAS
              </h2>
            </div>
            <div className="mono" style={{ textAlign: 'right', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              <div><strong>Período:</strong> {dateBounds.label} ({metrics.workingDaysCount}/{metrics.totalMonthWorkingDays}d úteis)</div>
              <div><strong>Emissão:</strong> {todayBR}</div>
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
              <div style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 600 }}>Criação (Artes)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.teamDailyAvgCriacao}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>artes/dia (Meta: {metrics.teamDailyGoalCriacao} | Mês: {metrics.monthGoalCriacao})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: 600 }}>Exportação (Exp.)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.teamDailyAvgExportacao}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>exp/dia (Meta: {metrics.teamDailyGoalExportacao} | Mês: {metrics.monthGoalExportacao})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 600 }}>Impressão (Peças)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.teamDailyAvgImpressaoPieces}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>peças/dia (Meta: {metrics.teamDailyGoalImpressaoPieces} | Mês: {metrics.monthGoalImpressaoPieces.toLocaleString('pt-BR')})</div>
            </div>
          </div>

          {/* Divisão por Etapa */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Divisão Operacional por Categoria:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>Criação de Arte</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.stageCounts.criacao} artes criadas</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Média: {metrics.teamDailyAvgCriacao}/dia • Meta Mês ({metrics.totalMonthWorkingDays}d): {metrics.monthGoalCriacao}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>Exportação / Fechamento</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.stageCounts.exportacao} fechamentos</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Média: {metrics.teamDailyAvgExportacao}/dia • Meta Mês ({metrics.totalMonthWorkingDays}d): {metrics.monthGoalExportacao}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Impressão / Plotter</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{metrics.impressaoTotalPieces.toLocaleString('pt-BR')} peças impressas</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Média: {metrics.teamDailyAvgImpressaoPieces}/dia • Meta Mês ({metrics.totalMonthWorkingDays}d): {metrics.monthGoalImpressaoPieces.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Produtividade dos Designers */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Quadro de Produtividade Individual com Metas Personalizadas:
            </h4>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Designer</th>
                    <th>Especialidade</th>
                    <th style={{ textAlign: 'center' }}>Dias Úteis</th>
                    <th style={{ textAlign: 'center' }}>Pedidos</th>
                    <th style={{ textAlign: 'center' }}>Criação (Artes/dia)</th>
                    <th style={{ textAlign: 'center' }}>Exportação (Exp/dia)</th>
                    <th style={{ textAlign: 'center' }}>Impressão (Peças/dia)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.rankedDesigners.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>
                        {d.name}
                        {d.active === false ? ' (Férias)' : ''}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.role}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                        {d.workingDays}d{d.absenceDays > 0 ? ` (-${d.absenceDays}d)` : ''}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.ordersCount}</td>
                      <td style={{ textAlign: 'center' }}>
                        {d.goalCriacaoArtes > 0 ? (
                          <><strong>{d.dailyAvgCriacao}</strong> / {d.goalCriacaoArtes} artes</>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {d.goalExportacao > 0 ? (
                          <><strong>{d.dailyAvgExportacao}</strong> / {d.goalExportacao} exp</>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {d.goalImpressaoPecas > 0 ? (
                          <><strong>{d.dailyAvgImpressaoPieces}</strong> / {d.goalImpressaoPecas} pçs</>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                          {d.active === false ? 'Pausado' : `${d.performanceStatus} (${d.goalAchievementRate}%)`}
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
              <strong>{companyName}</strong> • Gerado via <strong>KromaOPS</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ borderBottom: '1px solid var(--text-muted)', width: '200px', marginBottom: '4px' }} />
              <div>Responsável / Liderança Operacional</div>
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
