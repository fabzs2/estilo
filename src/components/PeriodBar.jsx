import React from 'react';
import { useProduction } from '../context/ProductionContext';
import { Calendar, Clock, BarChart2, CheckCircle2 } from 'lucide-react';

export function PeriodBar() {
  const { 
    periodFilter, 
    setPeriodFilter, 
    customRange, 
    setCustomRange, 
    dateBounds,
    metrics 
  } = useProduction();

  const handlePeriodChange = (filter) => {
    setPeriodFilter(filter);
  };

  return (
    <div className="period-bar">
      {/* Pills de Período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span>Período:</span>
        </div>

        <div className="period-pills">
          <button
            id="period-today"
            className={`period-pill ${periodFilter === 'today' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('today')}
          >
            Hoje
          </button>
          <button
            id="period-yesterday"
            className={`period-pill ${periodFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('yesterday')}
          >
            Ontem
          </button>
          <button
            id="period-week"
            className={`period-pill ${periodFilter === 'this_week' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('this_week')}
          >
            Últimos 7 Dias
          </button>
          <button
            id="period-month"
            className={`period-pill ${periodFilter === 'this_month' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('this_month')}
          >
            Este Mês
          </button>
          <button
            id="period-all"
            className={`period-pill ${periodFilter === 'all' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('all')}
          >
            Todo Histórico
          </button>
          <button
            id="period-custom"
            className={`period-pill ${periodFilter === 'custom' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('custom')}
          >
            Personalizado
          </button>
        </div>

        {/* Inputs de Data Personalizada */}
        {periodFilter === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: '0.75rem', width: 'auto' }}
              value={customRange.start}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>até</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: '0.75rem', width: 'auto' }}
              value={customRange.end}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Indicador de Resumo */}
      <div className="period-info-tag">
        <Clock size={13} color="var(--text-muted)" />
        <span>
          Base: <strong>{metrics.workingDaysCount} dia(s) com registro</strong>
        </span>
        <span style={{ color: 'var(--border-subtle)' }}>•</span>
        <span>
          Pedidos: <strong>{metrics.totalOrders}</strong>
        </span>
      </div>
    </div>
  );
}
