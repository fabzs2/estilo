import React, { useState, useEffect } from 'react';
import { useProduction } from '../context/ProductionContext';
import { STAGES } from '../constants/initialData';
import { 
  TrendingUp, 
  Layers, 
  Printer, 
  Award, 
  Ruler, 
  Shirt, 
  PlusCircle, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  Clock
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export function Dashboard({ onSelectDesigner, onOpenQuickEntry }) {
  const { metrics, periodFilter, dateBounds, setIsQuickEntryOpen, setSelectedDesignerFilter } = useProduction();
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

  // Dados para o Gráfico de Barras: Produção por Designer & Etapas
  const barChartData = {
    labels: metrics.designerStats.map((d) => d.nickname || d.name),
    datasets: [
      {
        label: 'Criação de Arte',
        data: metrics.designerStats.map((d) => d.criacaoCount),
        backgroundColor: '#60a5fa',
        borderRadius: 3
      },
      {
        label: 'Exportação / Fechamento',
        data: metrics.designerStats.map((d) => d.exportacaoCount),
        backgroundColor: '#a78bfa',
        borderRadius: 3
      },
      {
        label: 'Impressão / Plotter',
        data: metrics.designerStats.map((d) => d.impressaoCount),
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
          metrics.stageCounts.criacao,
          metrics.stageCounts.exportacao,
          metrics.stageCounts.impressao
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
      {/* 1. Grid de KPIs Principais & Médias */}
      <section className="kpi-grid">
        {/* Média Diária por Designer */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Média Diária / Designer</span>
            <div className="kpi-icon-wrap">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '120px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.teamDailyAvgOrders.toFixed(1)}
                <span className="kpi-unit">pedidos / dia</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">Média do Setor</span>
            <span>{metrics.activeDesignersCount} designers ativos</span>
          </div>
        </div>

        {/* Total de Pedidos Concluídos */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total de Pedidos</span>
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
            <span className="kpi-badge badge-neutral">{metrics.workingDaysCount} dia(s) com registro</span>
            <span>Média {metrics.avgOrdersPerDesigner} / membro</span>
          </div>
        </div>

        {/* Metragem Linear Impressa */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Metragem de Impressão</span>
            <div className="kpi-icon-wrap">
              <Ruler size={16} />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '100px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.totalMeters}
                <span className="kpi-unit">metros lineares</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">Média: {metrics.teamDailyAvgMeters} m/dia</span>
            <span>Papel / Sublimação</span>
          </div>
        </div>

        {/* Volume de Peças de Uniformes */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Volume de Peças</span>
            <div className="kpi-icon-wrap">
              <Shirt size={16} />
            </div>
          </div>
          <div className="kpi-body">
            {isLoading ? (
              <div className="skeleton" style={{ height: '32px', width: '110px', marginBottom: '6px' }} />
            ) : (
              <div className="kpi-value">
                {metrics.totalPieces.toLocaleString('pt-BR')}
                <span className="kpi-unit">peças</span>
              </div>
            )}
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-neutral">Média: {metrics.teamDailyAvgPieces} peças/dia</span>
            <span>Grade Total</span>
          </div>
        </div>
      </section>

      {/* 2. Mini-Cards das 3 Etapas Operacionais */}
      <section className="stages-summary-bar">
        {/* Criação */}
        <div className="stage-card">
          <div className="stage-card-icon">
            <PenTool size={18} />
          </div>
          <div className="stage-card-info">
            <h4>Criação de Artes</h4>
            <div className="stage-card-count">{metrics.stageCounts.criacao} pedidos</div>
            <div className="stage-card-meta">
              {metrics.totalOrders > 0 ? Math.round((metrics.stageCounts.criacao / metrics.totalOrders) * 100) : 0}% da produção
            </div>
          </div>
        </div>

        {/* Exportação */}
        <div className="stage-card">
          <div className="stage-card-icon">
            <Layers size={18} />
          </div>
          <div className="stage-card-info">
            <h4>Exportação / Fechamento</h4>
            <div className="stage-card-count">{metrics.stageCounts.exportacao} pedidos</div>
            <div className="stage-card-meta">
              {metrics.totalOrders > 0 ? Math.round((metrics.stageCounts.exportacao / metrics.totalOrders) * 100) : 0}% da produção
            </div>
          </div>
        </div>

        {/* Impressão */}
        <div className="stage-card">
          <div className="stage-card-icon">
            <Printer size={18} />
          </div>
          <div className="stage-card-info">
            <h4>Impressão / Plotters</h4>
            <div className="stage-card-count">{metrics.stageCounts.impressao} pedidos</div>
            <div className="stage-card-meta">
              {metrics.totalMeters}m lineares rodados
            </div>
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
                Comparativo de pedidos entregues em Criação, Exportação e Impressão
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

      {/* 4. Tabela de Desempenho e Médias dos Designers */}
      <section className="ranking-section">
        <div className="ranking-header">
          <div>
            <h3 className="section-title">Desempenho & Médias por Designer</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Base de cálculo ajustada pelos dias registrados no período ({dateBounds.label})
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
                <th style={{ width: '50px' }}>Pos.</th>
                <th>Designer</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'center' }}>Média Diária</th>
                <th style={{ textAlign: 'center' }}>Peças / Metros</th>
                <th>Etapas Concluídas</th>
                <th style={{ minWidth: '140px' }}>Meta Diária ({metrics.designerStats[0]?.dailyGoalOrders || 8} ped/dia)</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rankedDesigners.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Nenhum designer cadastrado no momento
                    </div>
                    <p style={{ fontSize: '0.78rem', marginBottom: '14px' }}>
                      Adicione os designers da sua equipe para começar a calcular as médias e metas.
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
                    {/* Posição no Ranking */}
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

                    {/* Média Diária */}
                    <td style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'baseline',
                          gap: '3px',
                          background: 'var(--bg-surface)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {designer.dailyAvgOrders}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ped/dia</span>
                      </div>
                    </td>

                    {/* Peças / Metragem */}
                    <td style={{ textAlign: 'center', fontSize: '0.775rem' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {designer.piecesCount} peças
                      </div>
                      {designer.metersCount > 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                          {designer.metersCount}m
                        </div>
                      )}
                    </td>

                    {/* Distribuição por Etapa */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px', fontSize: '0.725rem' }}>
                        {designer.criacaoCount > 0 && (
                          <span className="stage-badge" style={{ color: '#60a5fa' }}>
                            Criação: {designer.criacaoCount}
                          </span>
                        )}
                        {designer.exportacaoCount > 0 && (
                          <span className="stage-badge" style={{ color: '#a78bfa' }}>
                            Exportação: {designer.exportacaoCount}
                          </span>
                        )}
                        {designer.impressaoCount > 0 && (
                          <span className="stage-badge" style={{ color: '#34d399' }}>
                            Impressão: {designer.impressaoCount}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Meta Diária & Barra de Progresso */}
                    <td>
                      <div className="goal-bar-container">
                        <div className="goal-bar-text">
                          <span style={{ color: 'var(--text-muted)' }}>Meta: {designer.dailyGoalOrders}/dia</span>
                          <span style={{ color: statusColor }}>{designer.goalAchievementRate}%</span>
                        </div>
                        <div className="goal-bar-track">
                          <div
                            className="goal-bar-fill"
                            style={{
                              width: `${Math.min(100, designer.goalAchievementRate)}%`,
                              background: statusColor
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="stage-badge" style={{ color: statusColor }}>
                        {designer.performanceStatus}
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
                        title="Ver histórico deste designer"
                      >
                        Ver Pedidos
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
