import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KromaLogo } from './KromaLogo';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginScreen() {
  const { login, lockoutState } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    const checkTimer = () => {
      const diff = Math.ceil(((lockoutState?.lockedUntil || 0) - Date.now()) / 1000);
      setLockRemaining(diff > 0 ? diff : 0);
    };
    checkTimer();
    const id = setInterval(checkTimer, 1000);
    return () => clearInterval(id);
  }, [lockoutState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Preencha seu login/e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (!res.ok) {
        setErrorMsg(res.error || 'Falha na autenticação.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Grade Arquitetônica Sutil de Fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none'
        }}
      />

      {/* Container Principal de Login */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#111113',
          border: '1px solid #222226',
          borderRadius: '10px',
          padding: '28px 26px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Cabeçalho da Marca */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
          <KromaLogo size={48} />
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa' }}>
              Kroma<span style={{ color: '#3b82f6' }}>OPS</span>
            </h1>
            <span
              className="mono"
              style={{
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: '4px',
                background: '#18181b',
                border: '1px solid #2e2e34',
                color: '#a1a1aa',
                fontWeight: 600
              }}
            >
              SAAS PRO
            </span>
          </div>
          <p style={{ fontSize: '0.77rem', color: '#71717a', marginTop: '4px' }}>
            Acesse o painel operacional da sua unidade ou central SaaS
          </p>
        </div>

        {/* Mensagem de Erro ou Bloqueio */}
        {(errorMsg || lockRemaining > 0) && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.28)',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.76rem',
              color: '#f87171',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {lockRemaining > 0
                ? `Muitas tentativas incorretas. Aguarde ${lockRemaining}s para tentar novamente.`
                : errorMsg}
            </span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username" style={{ color: '#a1a1aa' }}>
              E-mail ou Usuário de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={14}
                color="#71717a"
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-username"
                type="text"
                className="form-input"
                style={{
                  paddingLeft: '34px',
                  background: '#18181b',
                  borderColor: '#27272a',
                  color: '#fafafa',
                  height: '38px'
                }}
                placeholder="ex: gestor@empresa.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={lockRemaining > 0 || isSubmitting}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" htmlFor="login-password" style={{ color: '#a1a1aa' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={14}
                color="#71717a"
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{
                  paddingLeft: '34px',
                  paddingRight: '34px',
                  background: '#18181b',
                  borderColor: '#27272a',
                  color: '#fafafa',
                  height: '38px'
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockRemaining > 0 || isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '2px'
                }}
                tabIndex={-1}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={lockRemaining > 0 || isSubmitting}
            style={{
              width: '100%',
              height: '38px',
              background: '#fafafa',
              color: '#09090b',
              fontWeight: 600,
              fontSize: '0.82rem',
              justifyContent: 'center'
            }}
          >
            {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Rodapé de Segurança */}
        <div
          className="mono"
          style={{
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid #1f1f23',
            textAlign: 'center',
            fontSize: '0.64rem',
            color: '#52525b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Lock size={10} />
          ACESSO RESTRITO • AMBIENTE CRIPTOGRAFADO
        </div>
      </div>
    </div>
  );
}

