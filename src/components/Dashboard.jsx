import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { 
  TrendingUp, 
  Layers, 
  Printer, 
  Award, 
  Ruler, 
  Shirt, 
  PlusCircle, 
  ChevronRight,
  PenTool, 
  Target,
  Clock,
  Calendar,
  Tag,
  RefreshCw
} from 'lucide-react';

import 'chart.js/auto';
import { Bar, Doughnut } from 'react-chartjs-2';

export function Dashboard({ onSelectDesigner, onOpenQuickEntry }) {
  const { 
    metrics, 
    periodFilter, 
    dateBounds, 
    setIsQuickEntryOpen, 
    setSelectedDesignerFilter,
    setIsSectorGoalsModalOpen 
  } = useProduction();
  const [isLoading, setIsLoading] = useState(false);

  // Efeito sutil de transição ao alternar período
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(timer);
  }, [periodFilter, dateBounds]);

  // Opções para gráficos limpos, sem neons
  const chartOptionsMinimal = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          boxWidth: 10,
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: '#1a202c',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e3748',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11 } }
      }
    }
  };

  // Dados para o Gráfico de Evolução Diária (Linha do Tempo por Dia)
  const dailyChartData = {
    labels: metrics.dailyTimeline?.labels || [],
    datasets: [
      {
        type: 'line',
        label: 'Criação (Artes)',
        data: metrics.dailyTimeline?.criacao || [],
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#60a5fa',
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'Exportação (Fechamentos)',
        data: metrics.dailyTimeline?.exportacao || [],
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.15)',
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#a78bfa',
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Impressão (Peças)',
        data: metrics.dailyTimeline?.impressao || [],
        backgroundColor: 'rgba(52, 211, 153, 0.55)',
        borderColor: '#34d399',
        borderWidth: 1,
        borderRadius: 4,
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
        labels: {
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          boxWidth: 12,
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: '#1a202c',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e3748',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10 } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Artes / Exp',
          color: '#64748b',
          font: { size: 10 }
        },
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', beginAtZero: true, stepSize: 1 }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Peças Impressas',
          color: '#34d399',
          font: { size: 10 }
        },
        grid: { drawOnChartArea: false },
        ticks: { color: '#34d399', beginAtZero: true }
      }
    }
  };

  // Dados para o Gráfico de Barras: Produção por Designer & Etapas
  const designerStatsList = metrics.designerStats || [];
  const barChartData = {
    labels: designerStatsList.map((d) => d.nickname || d.name),
    datasets: [
      {
        label: 'Criação (Artes)',
        data: designerStatsList.map((d) => d.criacaoCount),
        backgroundColor: '#60a5fa',
        borderRadius: 3
      },
      {
        label: 'Exportação (Fechamentos)',
        data: designerStatsList.map((d) => d.exportacaoCount),
        backgroundColor: '#a78bfa',
        borderRadius: 3
      },
      {
        label: 'Impressão (Peças)',
        data: designerStatsList.map((d) => d.impressaoPieces),
        backgroundColor: '#34d399',
        borderRadius: 3
      }
    ]
  };

  // Dados para o Gráfico Donut
  const doughnutData = {
    labels: ['Criação de Arte', 'Exportação / Fechamento', 'Impressão / Plotter'],
    datasets: [
      {
        data: [
          metrics.stageCounts?.criacao || 0,
          metrics.stageCounts?.exportacao || 0,
          metrics.stageCounts?.impressao || 0
        ],
        backgroundColor: ['#60a5fa', '#a78bfa', '#34d399'],
        borderColor: '#141820',
        borderWidth: 2,
        hoverOffset: 4
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
          color: '#94a3b8',
          font: { family: 'Plus Jakarta Sans', size: 11 },
          padding: 12,
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: '#1a202c',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e3748',
        borderWidth: 1,
        padding: 10
      }
    },
    cutout: '72%'
  };

  return (
    <div className={`dashboard-view ${isLoading ? 'opacity-80' : ''}`} style={{ transition: 'opacity 0.15s ease' }}>
      {/* Barra de Título das Metas por Categoria */}
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
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--accent-sky)" />
            Metas & Médias por Categoria ({dateBounds.label})
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <strong>Criação:</strong> artes diárias • <strong>Exportação:</strong> exportações diárias • <strong>Impressão:</strong> somente peças impressas
          </p>
        </div>

        <button
          id="btn-adjust-sector-goals"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsSectorGoalsModalOpen(true)}
          title="Personalizar metas diárias globais do setor"
        >
          <Target size={14} color="var(--accent-sky)" />
          Personalizar Metas do Setor
        </button>
      </div>

      {/* 1. Grid de Metas & KPIs Principais por Categoria */}
      <section className="kpi-grid">
        {/* Criação: Artes Diárias */}
        <div className="kpi-card" style={{ borderTop: '2px solid #60a5fa' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: '#60a5fa', fontWeight: 600 }}>🎨 Criação de Arte</span>
            <div className="kpi-icon-wrap">
              <PenTool size={16} color="#60a5fa" />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '120px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.teamDailyAvgCriacao}
                <span className="kpi-unit">artes / dia</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">
              Meta: {metrics.teamDailyGoalCriacao} artes/dia
            </span>
            <span style={{ color: metrics.teamDailyGoalCriacao > 0 && metrics.teamDailyAvgCriacao >= metrics.teamDailyGoalCriacao ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
              {metrics.stageCounts.criacao} artes ({metrics.teamDailyGoalCriacao > 0 ? Math.round((metrics.teamDailyAvgCriacao / metrics.teamDailyGoalCriacao) * 100) : 100}%)
            </span>
          </div>
        </div>

        {/* Exportação: Exportações Diárias */}
        <div className="kpi-card" style={{ borderTop: '2px solid #a78bfa' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: '#a78bfa', fontWeight: 600 }}>📐 Exportação / Fechamento</span>
            <div className="kpi-icon-wrap">
              <Layers size={16} color="#a78bfa" />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '120px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.teamDailyAvgExportacao}
                <span className="kpi-unit">exp / dia</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">
              Meta: {metrics.teamDailyGoalExportacao} exp/dia
            </span>
            <span style={{ color: metrics.teamDailyGoalExportacao > 0 && metrics.teamDailyAvgExportacao >= metrics.teamDailyGoalExportacao ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
              {metrics.stageCounts.exportacao} fechamentos ({metrics.teamDailyGoalExportacao > 0 ? Math.round((metrics.teamDailyAvgExportacao / metrics.teamDailyGoalExportacao) * 100) : 100}%)
            </span>
          </div>
        </div>

        {/* Impressão: Somente Peças Impressas */}
        <div className="kpi-card" style={{ borderTop: '2px solid #34d399' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: '#34d399', fontWeight: 600 }}>🖨️ Impressão (Peças)</span>
            <div className="kpi-icon-wrap">
              <Printer size={16} color="#34d399" />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '120px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.teamDailyAvgImpressaoPieces}
                <span className="kpi-unit">peças / dia</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">
              Meta: {metrics.teamDailyGoalImpressaoPieces} peças/dia
            </span>
            <span style={{ color: metrics.teamDailyGoalImpressaoPieces > 0 && metrics.teamDailyAvgImpressaoPieces >= metrics.teamDailyGoalImpressaoPieces ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
              {metrics.impressaoTotalPieces.toLocaleString('pt-BR')} peças ({metrics.teamDailyGoalImpressaoPieces > 0 ? Math.round((metrics.teamDailyAvgImpressaoPieces / metrics.teamDailyGoalImpressaoPieces) * 100) : 100}%)
            </span>
          </div>
        </div>

        {/* Total Geral da Produção */}
        <div className="kpi-card" style={{ borderTop: '2px solid #64748b' }}>
          <div className="kpi-header">
            <span className="kpi-title">📦 Total da Produção</span>
            <div className="kpi-icon-wrap">
              <Award size={16} />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '90px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.totalOrders}
                <span className="kpi-unit">pedidos</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">{metrics.totalMeters}m lineares plotter</span>
            <span>{metrics.workingDaysCount} dia(s) úteis</span>
          </div>
        </div>

        {/* Lead Time: Tempo de Ciclo entre Etapas */}
        <div className="kpi-card" style={{ borderTop: '2px solid #f59e0b' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: '#f59e0b', fontWeight: 600 }}>⏱️ Lead Time (Ciclo)</span>
            <div className="kpi-icon-wrap">
              <Clock size={16} color="#f59e0b" />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '100px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.leadTimeStats?.avgLeadTimeDays !== null ? (
                  <>
                    {metrics.leadTimeStats.avgLeadTimeDays}
                    <span className="kpi-unit">dias (Arte → Impressão)</span>
                  </>
                ) : metrics.leadTimeStats?.avgDaysToExport !== null ? (
                  <>
                    {metrics.leadTimeStats.avgDaysToExport}
                    <span className="kpi-unit">dias (Arte → Exp)</span>
                  </>
                ) : (
                  <>
                    0
                    <span className="kpi-unit">dias (em fluxo)</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">
              {metrics.leadTimeStats?.completedCyclesCount || 0} pedido(s) 100% impressos
            </span>
            <span>
              {metrics.leadTimeStats?.avgDaysToExport !== null 
                ? `Média Arte→Exp: ${metrics.leadTimeStats.avgDaysToExport}d` 
                : `${metrics.leadTimeStats?.totalTrackedOrders || 0} pedidos rastreados`}
            </span>
          </div>
        </div>

        {/* 6. Taxa de Refação / Tipo de Lançamento */}
        <div className="kpi-card" style={{ borderTop: '2px solid #fbbf24' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: '#fbbf24', fontWeight: 600 }}>🏷️ Taxa de Refação</span>
            <div className="kpi-icon-wrap">
              <RefreshCw size={16} color="#fbbf24" />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '90px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.reworkStats?.reworkRate || 0}%
                <span className="kpi-unit">reprovações / ajustes</span>
              </div>
            )}
          </div>
          <div className="kpi-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
            {/* Barra de distribuição proporcional */}
            <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
              <div 
                style={{ 
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.arteNova || 0) / metrics.totalOrders) * 100 : 100}%`, 
                  background: '#38bdf8' 
                }} 
                title={`Artes Novas: ${metrics.reworkStats?.arteNova || 0}`}
              />
              <div 
                style={{ 
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.ajusteRefacao || 0) / metrics.totalOrders) * 100 : 0}%`, 
                  background: '#fbbf24' 
                }} 
                title={`Ajustes / Refações: ${metrics.reworkStats?.ajusteRefacao || 0}`}
              />
              <div 
                style={{ 
                  width: `${metrics.totalOrders > 0 ? ((metrics.reworkStats?.reposicao || 0) / metrics.totalOrders) * 100 : 0}%`, 
                  background: '#f87171' 
                }} 
                title={`Reposições: ${metrics.reworkStats?.reposicao || 0}`}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.69rem' }}>
              <span style={{ color: '#38bdf8' }}>✨ Nova: <strong>{metrics.reworkStats?.arteNova || 0}</strong></span>
              <span style={{ color: '#fbbf24' }}>🔄 Ajuste: <strong>{metrics.reworkStats?.ajusteRefacao || 0}</strong></span>
              <span style={{ color: '#f87171' }}>⚠️ Repos: <strong>{metrics.reworkStats?.reposicao || 0}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Gráfico de Evolução Diária da Produção (Linha do Tempo por Dia) */}
      <section style={{ marginBottom: '20px' }}>
        <div className="chart-card">
          <div className="chart-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#60a5fa" />
                Evolução da Produção Diária (Linha do Tempo)
              </h3>
              <p className="chart-desc">
                Produção registrada na data exata de cada etapa (Criação da Arte, Fechamento e Impressão de Peças).
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
                Criação (artes/dia)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
                Exportação (exp/dia)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#34d399', display: 'inline-block' }} />
                Impressão (peças impressas)
              </span>
            </div>
          </div>
          <div className="chart-container" style={{ height: '260px' }}>
            {metrics.dailyTimeline?.labels?.length > 0 ? (
              <Bar data={dailyChartData} options={dailyChartOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Nenhum dado diário encontrado no período.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Seção de Gráficos Visuais */}
      <section className="charts-grid">
        {/* Gráfico 1: Produção por Designer e Etapas */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Produção por Designer & Etapas</h3>
              <p className="chart-desc">
                Criação (artes), Exportação (fechamentos) e Impressão (peças impressas)
              </p>
            </div>
          </div>
          <div className="chart-container" style={{ height: '280px' }}>
            <Bar data={barChartData} options={chartOptionsMinimal} />
          </div>
        </div>

        {/* Gráfico 2: Divisão Percentual por Etapa */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Divisão Operacional</h3>
              <p className="chart-desc">Proporção por etapa de trabalho</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: '280px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </section>

      {/* 4. Tabela de Desempenho e Médias dos Designers com Metas por Categoria */}
      <section className="ranking-section">
        <div className="ranking-header">
          <div>
            <h3 className="section-title">Desempenho & Médias por Categoria</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Metas: <strong>Criação</strong> (artes diárias) • <strong>Exportação</strong> (exportações diárias) • <strong>Impressão</strong> (peças impressas diárias)
            </p>
          </div>

          <button
            id="btn-add-order-table"
            className="btn btn-primary btn-sm"
            onClick={() => setIsQuickEntryOpen(true)}
          >
            <PlusCircle size={14} />
            + Lançar Pedido
          </button>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>Pos.</th>
                <th>Designer</th>
                <th style={{ textAlign: 'center' }}>Total Pedidos</th>
                <th style={{ textAlign: 'center' }}>
                  <span style={{ color: '#60a5fa' }}>🎨 Criação (Artes)</span>
                </th>
                <th style={{ textAlign: 'center' }}>
                  <span style={{ color: '#a78bfa' }}>📐 Exportação (Exp.)</span>
                </th>
                <th style={{ textAlign: 'center' }}>
                  <span style={{ color: '#34d399' }}>🖨️ Impressão (Peças)</span>
                </th>
                <th style={{ textAlign: 'center' }}>Status / Meta</th>
                <th style={{ textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rankedDesigners.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Nenhum designer cadastrado no momento
                    </div>
                    <p style={{ fontSize: '0.78rem', marginBottom: '14px' }}>
                      Adicione os designers da sua equipe para definir metas personalizadas por categoria.
                    </p>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => onSelectDesigner && onSelectDesigner()}
                    >
                      + Cadastrar Designers na Aba Equipe
                    </button>
                  </td>
                </tr>
              ) : (
                metrics.rankedDesigners.map((designer, index) => {
                  const statusColor =
                    designer.performanceStatus === 'Superando'
                      ? 'var(--accent-emerald)'
                      : designer.performanceStatus === 'Na Meta'
                      ? 'var(--text-primary)'
                      : 'var(--accent-amber)';

                  return (
                    <tr key={designer.id}>
                      {/* Posição */}
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{index + 1}
                      </td>

                      {/* Designer */}
                      <td>
                        <div className="designer-cell">
                          <div className="avatar-badge">
                            {designer.name.charAt(0)}
                          </div>
                          <div className="designer-details">
                            <div className="designer-name">{designer.name}</div>
                            <div className="designer-role">{designer.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Pedidos no Período */}
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {designer.ordersCount}
                      </td>

                      {/* Criação: Artes Diárias vs Meta */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalCriacaoArtes > 0 ? (
                          <div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {designer.dailyAvgCriacao}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {designer.goalCriacaoArtes} artes</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: designer.rateCriacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.rateCriacao}% da meta
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Exportação: Exportações Diárias vs Meta */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalExportacao > 0 ? (
                          <div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {designer.dailyAvgExportacao}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {designer.goalExportacao} exp</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: designer.rateExportacao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.rateExportacao}% da meta
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Impressão: Peças Impressas Diárias vs Meta */}
                      <td style={{ textAlign: 'center' }}>
                        {designer.goalImpressaoPecas > 0 ? (
                          <div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {designer.dailyAvgImpressaoPieces}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {designer.goalImpressaoPecas} pçs</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: designer.rateImpressao >= 100 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {designer.rateImpressao}% da meta
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="stage-badge" style={{ color: statusColor }}>
                          {designer.performanceStatus} ({designer.goalAchievementRate}%)
                        </span>
                      </td>

                      {/* Ações */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedDesignerFilter(designer.id);
                            if (onSelectDesigner) onSelectDesigner(designer.id);
                          }}
                          title="Ver pedidos deste designer"
                        >
                          Ver Pedidos
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
