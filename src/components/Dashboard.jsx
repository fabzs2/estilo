import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  Plus,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

import 'chart.js/auto';
import { Bar, Doughnut } from 'react-chartjs-2';

export function Dashboard({ onSelectDesigner, onGoToTeam }) {
  const {
    metrics,
    periodFilter,
    dateBounds,
    setIsQuickEntryOpen,
    setEditingOrder,
    setSelectedDesignerFilter,
    setIsSectorGoalsModalOpen
  } = useProduction();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 140);
    return () => clearTimeout(timer);
  }, [periodFilter, dateBounds]);

  // Configuração limpa para gráficos (tipografia Inter + JetBrains Mono)
  const chartOptionsMinimal = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#71717a',
          font: { family: 'Inter', size: 11, weight: '500' },
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#d4d4d8',
        borderColor: '#2e2e34',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { family: 'Inter', size: 11, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(128, 128, 128, 0.06)' },
        ticks: { color: '#71717a', font: { family: 'Inter', size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(128, 128, 128, 0.06)' },
        ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 10 } }
      }
    }
  };

  // Gráfico de Evolução Diária
  const dailyChartData = {
    labels: metrics.dailyTimeline?.labels || [],
    datasets: [
      {
        type: 'line',
        label: 'Criação (Artes)',
        data: metrics.dailyTimeline?.criacao || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'Exportação (Fech.)',
        data: metrics.dailyTimeline?.exportacao || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Impressão (Peças)',
        data: metrics.dailyTimeline?.impressao || [],
        backgroundColor: 'rgba(16, 185, 129, 0.45)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 3,
        yAxisID: 'y1'
      }
    ]
  };

  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#71717a',
          font: { family: 'Inter', size: 11, weight: '500' },
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#d4d4d8',
        borderColor: '#2e2e34',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
        titleFont: { family: 'Inter', size: 11, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(128, 128, 128, 0.06)' },
        ticks: { color: '#71717a', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Artes / Exp',
          color: '#71717a',
          font: { family: 'Inter', size: 10 }
        },
        grid: { color: 'rgba(128, 128, 128, 0.06)' },
        ticks: { color: '#71717a', beginAtZero: true, stepSize: 1, font: { family: 'JetBrains Mono', size: 10 } }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Peças Impressas',
          color: '#10b981',
          font: { family: 'Inter', size: 10 }
        },
        grid: { drawOnChartArea: false },
        ticks: { color: '#10b981', beginAtZero: true, font: { family: 'JetBrains Mono', size: 10 } }
      }
    }
  };

  // Gráfico de Barras por Designer
  const designerStatsList = metrics.designerStats || [];
  const barChartData = {
    labels: designerStatsList.map((d) => d.nickname || d.name),
    datasets: [
      {
        label: 'Criação',
        data: designerStatsList.map((d) => d.criacaoCount),
        backgroundColor: '#3b82f6',
        borderRadius: 2
      },
      {
        label: 'Exportação',
        data: designerStatsList.map((d) => d.exportacaoCount),
        backgroundColor: '#8b5cf6',
        borderRadius: 2
      },
      {
        label: 'Impressão (Pçs)',
        data: designerStatsList.map((d) => d.impressaoPieces),
        backgroundColor: '#10b981',
        borderRadius: 2
      }
    ]
  };

  // Gráfico Donut
  const doughnutData = {
    labels: ['Criação', 'Exportação', 'Impressão'],
    datasets: [
      {
        data: [
          metrics.stageCounts?.criacao || 0,
          metrics.stageCounts?.exportacao || 0,
          metrics.stageCounts?.impressao || 0
        ],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 3
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#71717a',
          font: { family: 'Inter', size: 11 },
          padding: 12,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#d4d4d8',
        borderColor: '#2e2e34',
        borderWidth: 1,
        padding: 10,
        bodyFont: { family: 'JetBrains Mono', size: 11 }
      }
    },
    cutout: '74%'
  };

  // Taxas percentuais para as barras de progresso do painel integrado
  const rateCriacao =
    metrics.teamDailyGoalCriacao > 0
      ? Math.round((metrics.teamDailyAvgCriacao / metrics.teamDailyGoalCriacao) * 100)
      : 100;
  const rateExportacao =
    metrics.teamDailyGoalExportacao > 0
      ? Math.round((metrics.teamDailyAvgExportacao / metrics.teamDailyGoalExportacao) * 100)
      : 100;
  const rateImpressao =
    metrics.teamDailyGoalImpressaoPieces > 0
      ? Math.round((metrics.teamDailyAvgImpressaoPieces / metrics.teamDailyGoalImpressaoPieces) * 100)
      : 100;

  return (
    <div className={`dashboard-view ${isLoading ? 'opacity-80' : ''}`} style={{ transition: 'opacity 0.14s ease' }}>
      {/* Cabeçalho Enxuto da Visão Geral */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Indicadores Operacionais
          </h2>
          <span className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            {dateBounds.label} · {metrics.workingDaysCount}d úteis
          </span>
        </div>

        <button
          id="btn-adjust-sector-goals"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsSectorGoalsModalOpen(true)}
        >
          <SlidersHorizontal size={13} />
          Ajustar Metas
        </button>
      </div>

      {/* 1. Painel Integrado de Indicadores (Fita Contínua com Divisórias de 1px) */}
      <section className="metrics-panel">
        {/* Linha Principal: As 3 Etapas Produtivas com Barras de Progresso Reais */}
        <div className="metrics-primary-row">
          {/* Célula 1: Criação de Arte */}
          <div className="metric-cell">
            <div>
              <div className="metric-label-row">
                <span className="metric-label">
                  <span className="status-dot" style={{ background: '#3b82f6' }} />
                  Criação de Arte
                </span>
                <span
                  className="metric-rate-pill"
                  style={{
                    color: rateCriacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {rateCriacao}% da meta
                </span>
              </div>

              {isLoading ? (
                <div className="skeleton" style={{ height: '32px', width: '110px', marginBottom: '12px' }} />
              ) : (
                <div className="metric-main-number">
                  {metrics.teamDailyAvgCriacao}
                  <span className="metric-unit">artes / dia útil</span>
                </div>
              )}
            </div>

            <div>
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill"
                  style={{
                    width: `${Math.min(100, rateCriacao)}%`,
                    background: rateCriacao >= 100 ? 'var(--accent-emerald)' : '#3b82f6'
                  }}
                />
              </div>
              <div className="metric-sub-row">
                <span>
                  Acumulado: <strong>{metrics.stageCounts.criacao}</strong>
                </span>
                <span>
                  Meta dia: <strong>{metrics.teamDailyGoalCriacao}</strong>
                </span>
                <span>
                  Meta mês: <strong>{metrics.monthGoalCriacao}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Célula 2: Exportação / Fechamento */}
          <div className="metric-cell">
            <div>
              <div className="metric-label-row">
                <span className="metric-label">
                  <span className="status-dot" style={{ background: '#8b5cf6' }} />
                  Exportação & Fechamento
                </span>
                <span
                  className="metric-rate-pill"
                  style={{
                    color: rateExportacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {rateExportacao}% da meta
                </span>
              </div>

              {isLoading ? (
                <div className="skeleton" style={{ height: '32px', width: '110px', marginBottom: '12px' }} />
              ) : (
                <div className="metric-main-number">
                  {metrics.teamDailyAvgExportacao}
                  <span className="metric-unit">exp / dia útil</span>
                </div>
              )}
            </div>

            <div>
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill"
                  style={{
                    width: `${Math.min(100, rateExportacao)}%`,
                    background: rateExportacao >= 100 ? 'var(--accent-emerald)' : '#8b5cf6'
                  }}
                />
              </div>
              <div className="metric-sub-row">
                <span>
                  Acumulado: <strong>{metrics.stageCounts.exportacao}</strong>
                </span>
                <span>
                  Meta dia: <strong>{metrics.teamDailyGoalExportacao}</strong>
                </span>
                <span>
                  Meta mês: <strong>{metrics.monthGoalExportacao}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Célula 3: Impressão (Peças) */}
          <div className="metric-cell">
            <div>
              <div className="metric-label-row">
                <span className="metric-label">
                  <span className="status-dot" style={{ background: '#10b981' }} />
                  Impressão / Plotter
                </span>
                <span
                  className="metric-rate-pill"
                  style={{
                    color: rateImpressao >= 100 ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {rateImpressao}% da meta
                </span>
              </div>

              {isLoading ? (
                <div className="skeleton" style={{ height: '32px', width: '110px', marginBottom: '12px' }} />
              ) : (
                <div className="metric-main-number">
                  {metrics.teamDailyAvgImpressaoPieces}
                  <span className="metric-unit">peças / dia útil</span>
                </div>
              )}
            </div>

            <div>
              <div className="metric-progress-track">
                <div
                  className="metric-progress-fill"
                  style={{
                    width: `${Math.min(100, rateImpressao)}%`,
                    background: '#10b981'
                  }}
                />
              </div>
              <div className="metric-sub-row">
                <span>
                  Impressas: <strong>{metrics.impressaoTotalPieces.toLocaleString('pt-BR')}</strong>
                </span>
                <span>
                  Meta dia: <strong>{metrics.teamDailyGoalImpressaoPieces}</strong>
                </span>
                <span>
                  Meta mês: <strong>{metrics.monthGoalImpressaoPieces.toLocaleString('pt-BR')}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Secundária: Telemetria de Volume, Lead Time e Taxa de Refação */}
        <div className="metrics-secondary-row">
          {/* Volume Geral */}
          <div className="metric-cell-compact">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Volume Processado
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{metrics.totalMeters}m</span> lineares · <span className="mono">{metrics.totalPieces.toLocaleString('pt-BR')}</span> pçs totais
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics.totalOrders}
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>pedidos</span>
            </div>
          </div>

          {/* Lead Time */}
          <div className="metric-cell-compact">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Lead Time (Ciclo)
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {metrics.leadTimeStats?.completedCyclesCount || 0}
                </span>{' '}
                pedidos concluídos
                {metrics.leadTimeStats?.avgDaysToExport !== null && ` · Arte→Exp: ${metrics.leadTimeStats.avgDaysToExport}d`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics.leadTimeStats?.avgLeadTimeDays ?? metrics.leadTimeStats?.avgDaysToExport ?? 0}d
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>média</span>
            </div>
          </div>

          {/* Qualidade / Refação */}
          <div className="metric-cell-compact" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Índice de Refação
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Nova <strong className="mono" style={{ color: 'var(--text-primary)' }}>{metrics.reworkStats?.arteNova || 0}</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Ajuste <strong className="mono" style={{ color: 'var(--accent-amber)' }}>{metrics.reworkStats?.ajusteRefacao || 0}</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Repos. <strong className="mono" style={{ color: 'var(--accent-rose)' }}>{metrics.reworkStats?.reposicao || 0}</strong>
                </span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                  {metrics.reworkStats?.reworkRate || 0}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'var(--bg-surface-elevated)' }}>
              <div
                style={{
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.arteNova || 0) / metrics.totalOrders) * 100 : 100}%`,
                  background: '#3b82f6'
                }}
              />
              <div
                style={{
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.ajusteRefacao || 0) / metrics.totalOrders) * 100 : 0}%`,
                  background: '#f59e0b'
                }}
              />
              <div
                style={{
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.reposicao || 0) / metrics.totalOrders) * 100 : 0}%`,
                  background: '#ef4444'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Gráfico de Linha do Tempo Diária */}
      <section style={{ marginBottom: '18px' }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Fluxo Diário de Produção</h3>
              <p className="chart-desc">Volume diário registrado por etapa operacional</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: '245px' }}>
            {metrics.dailyTimeline?.labels?.length > 0 ? (
              <Bar data={dailyChartData} options={dailyChartOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Sem registros no período selecionado.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Gráficos Comparativos */}
      <section className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Produção por Profissional</h3>
              <p className="chart-desc">Comparativo entre criação, fechamento e peças impressas</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: '250px' }}>
            <Bar data={barChartData} options={chartOptionsMinimal} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Proporção de Lançamentos</h3>
              <p className="chart-desc">Distribuição entre etapas</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: '250px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </section>

      {/* 4. Tabela de Desempenho da Equipe */}
      <section className="ranking-section">
        <div className="ranking-header">
          <div>
            <h3 className="section-title">Desempenho da Equipe</h3>
          </div>

          <button
            id="btn-add-order-table"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingOrder(null);
              setIsQuickEntryOpen(true);
            }}
          >
            <Plus size={13} />
            Lançar Pedido
          </button>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>Profissional</th>
                <th style={{ textAlign: 'center' }}>Dias Úteis</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'center' }}>Criação (Dia / Meta)</th>
                <th style={{ textAlign: 'center' }}>Exportação (Dia / Meta)</th>
                <th style={{ textAlign: 'center' }}>Impressão (Dia / Meta)</th>
                <th style={{ textAlign: 'center' }}>Atingimento</th>
                <th style={{ textAlign: 'right' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rankedDesigners.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Nenhum profissional cadastrado
                    </div>
                    <p style={{ fontSize: '0.76rem', marginBottom: '14px' }}>
                      Cadastre os integrantes da equipe para acompanhar metas individuais.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => (onGoToTeam ? onGoToTeam() : onSelectDesigner && onSelectDesigner())}
                    >
                      Cadastrar Equipe
                    </button>
                  </td>
                </tr>
              ) : (
                metrics.rankedDesigners.map((designer, index) => {
                  const isPaused = designer.active === false;
                  const statusColor = isPaused
                    ? 'var(--text-muted)'
                    : designer.performanceStatus === 'Superando'
                    ? 'var(--accent-emerald)'
                    : designer.performanceStatus === 'Na Meta'
                    ? 'var(--text-primary)'
                    : 'var(--accent-amber)';

                  return (
                    <tr key={designer.id} style={{ opacity: isPaused ? 0.6 : 1 }}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      <td>
                        <div className="designer-cell">
                          <div
                            className="avatar-badge"
                            style={{
                              background: designer.avatarColor || 'var(--bg-surface-elevated)',
                              color: '#ffffff',
                              borderColor: 'rgba(255,255,255,0.14)'
                            }}
                          >
                            {designer.name.charAt(0)}
                          </div>
                          <div className="designer-details">
                            <div className="designer-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {designer.name}
                              {isPaused && (
                                <span className="mono" style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.14)', color: 'var(--accent-amber)' }}>
                                  PAUSADO
                                </span>
                              )}
                            </div>
                            <div className="designer-role">{designer.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="mono" style={{ textAlign: 'center', fontSize: '0.76rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {designer.workingDays}d
                        </div>
                        {designer.absenceDays > 0 && (
                          <div style={{ fontSize: '0.64rem', color: 'var(--accent-blue)' }} title="Dias abonados no período">
                            -{designer.absenceDays}d abon.
                          </div>
                        )}
                      </td>

                      <td className="mono" style={{ textAlign: 'center', fontWeight: 600 }}>
                        {designer.ordersCount}
                      </td>

                      {/* Criação */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalCriacaoArtes > 0 ? (
                          <div>
                            <div className="mono">
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                {designer.dailyAvgCriacao}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / {designer.goalCriacaoArtes}</span>
                            </div>
                            <div className="mono" style={{ fontSize: '0.67rem', color: designer.rateCriacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.criacaoCount} total ({designer.rateCriacao}%)
                            </div>
                          </div>
                        ) : (
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Exportação */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalExportacao > 0 ? (
                          <div>
                            <div className="mono">
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                {designer.dailyAvgExportacao}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / {designer.goalExportacao}</span>
                            </div>
                            <div className="mono" style={{ fontSize: '0.67rem', color: designer.rateExportacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.exportacaoCount} total ({designer.rateExportacao}%)
                            </div>
                          </div>
                        ) : (
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Impressão */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalImpressaoPecas > 0 ? (
                          <div>
                            <div className="mono">
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                {designer.dailyAvgImpressaoPieces}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / {designer.goalImpressaoPecas}</span>
                            </div>
                            <div className="mono" style={{ fontSize: '0.67rem', color: designer.rateImpressao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.impressaoPieces} pçs ({designer.rateImpressao}%)
                            </div>
                          </div>
                        ) : (
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="stage-badge mono" style={{ color: statusColor }}>
                          <span className="status-dot" style={{ background: statusColor, width: '5px', height: '5px' }} />
                          {isPaused ? 'Pausado' : `${designer.performanceStatus} · ${designer.goalAchievementRate}%`}
                        </span>
                      </td>

                      {/* Ações */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedDesignerFilter(designer.id);
                            if (onSelectDesigner) onSelectDesigner(designer.id);
                          }}
                        >
                          Pedidos
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
