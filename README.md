# DesignFlow Uniformes - Gestão de Produção & Médias

Sistema minimalista e funcional para gestão de produtividade e cálculo de médias do setor de design, fechamento e impressão em fábricas de uniformes.

---

## 🗄️ 1. Como Conectar ao Supabase (Banco na Nuvem)

### Passo 1: Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New Project**, defina um nome (ex: `designflow-uniformes`) e crie uma senha para o banco de dados.

### Passo 2: Criar as Tabelas com o Script SQL
1. No menu lateral esquerdo do Supabase, clique em **SQL Editor** -> **New Query**.
2. Abra o arquivo `supabase_schema.sql` deste projeto (ou clique no botão **"Copiar SQL"** na interface da nossa aplicação no topo) e cole no editor.
3. Clique no botão **Run**. As tabelas `designers` e `production_entries` com índices e políticas de segurança serão criadas instantaneamente.

### Passo 3: Obter as Chaves de Conexão
1. No Supabase, clique na engrenagem no canto inferior esquerdo (**Project Settings**) -> **API**.
2. Copie:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **Project API Anon Key** (chave pública anônima)

### Passo 4: Conectar à Aplicação
Você tem duas formas simples de conectar:
* **Pela Interface Web:** No cabeçalho da aplicação, clique no botão **"Banco Local"**, cole a URL e a Anon Key e clique em **"Salvar e Conectar"**.
* **Por Arquivo `.env.local`:** Crie um arquivo `.env.local` na raiz com:
  ```env
  VITE_SUPABASE_URL=https://seu-projeto.supabase.co
  VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
  ```

---

## 🚀 2. Como Fazer Deploy na Vercel

O projeto já inclui o arquivo `vercel.json` configurado para roteamento SPA sem erros de recarregamento de página.

### Opção A: Pelo Painel Web da Vercel (Recomendado)
1. Suba o código deste repositório para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New...** -> **Project**.
3. Importe o repositório do projeto.
4. Na seção **Environment Variables**, adicione as duas variáveis:
   - `VITE_SUPABASE_URL` = `sua-url-do-supabase`
   - `VITE_SUPABASE_ANON_KEY` = `sua-anon-key-do-supabase`
5. Clique em **Deploy**. Em menos de 1 minuto seu sistema estará online com link HTTPS público para acessar do celular ou de qualquer computador da empresa!

### Opção B: Pelo Terminal via Vercel CLI
```bash
npx vercel
```
Siga as instruções rápidas na tela para vincular sua conta e publicar.

---

## 💻 3. Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento local
npm run dev

# Gerar build otimizado de produção
npm run build
```
Acesse em seu navegador: `http://localhost:5173/`
