# Frontend Redesign — Central de Comando Residencial

**Data:** 2026-05-24  
**Abordagem:** Camada visual only — lógica de dados, hooks, supabase e estrutura JSX intactos

---

## Contexto

O app atual usa shadcn/ui com styling padrão e aparência genérica. O objetivo é uma identidade visual própria "Mission Control": dark, técnico, com personalidade — sem reescrever nenhuma lógica de negócio.

---

## Design System

### Cores (CSS variables em `index.css`)

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#060c16` | Fundo da página |
| `--surface` | `#0d1a28` | Cards, painéis |
| `--surface-2` | `#112030` | Superfície elevada |
| `--primary` | `#00d4b4` | Cyan — cor principal |
| `--destructive` | `#ff4d4d` | Alertas críticos |
| `--warning` | `#f59e0b` | Alertas de atenção |
| `--success` | `#10b981` | Status OK |
| `--foreground` | `#d8f0ea` | Texto principal |
| `--muted-foreground` | `#4a7a6e` | Texto secundário |
| `--border` | `rgba(0,212,180,0.10)` | Bordas normais |
| `--border-strong` | `rgba(0,212,180,0.22)` | Bordas em destaque |

### Tipografia

- **Títulos e labels uppercase:** `Rajdhani` (700 para h1, 600 para labels)
  - h1 de página: `font-size: 26–32px`, `letter-spacing: -0.5px`
  - Labels uppercase: `font-size: 9–12px`, `letter-spacing: 0.25–0.35em`, `text-transform: uppercase`
- **Corpo e UI:** `Outfit` (400/500/600)
  - Corpo: `font-size: 12–14px`
  - Badges e metas: `font-size: 10–11px`
- Importar via Google Fonts em `index.html`

### Efeitos globais

- **Grid overlay:** `background-image` com linhas `rgba(0,212,180,0.025)` em `32px × 32px`, posição `fixed`, `z-index: -1`, `pointer-events: none`
- **Ambient glows:** dois blobs radial-gradient fixed (top-left cyan, bottom-right azul), `z-index: -1`
- **Cards com top-border highlight:** pseudo-elemento `::before` com `linear-gradient(90deg, transparent, var(--primary), transparent)` de `1px` de altura, `opacity: 0.4`

---

## Componentes a Reestilizar

### `AppShell.tsx`

**Header:**
- Eyebrow: Rajdhani 600, uppercase, letter-spacing 0.3em, cor cyan
- Título da página: Rajdhani 700, 26px, foreground
- Botões do header: `border-radius: 10px`, background `var(--primary)/12%`, borda `var(--border-strong)`

**Bottom nav (mobile):**
- Container: `background: var(--surface)`, `border: 1px solid var(--border-strong)`, `border-radius: 22px`, `padding: 6px`
- "Pill" ativo: elemento absoluto com `background: var(--primary)/12%`, `border: 1px solid var(--border-strong)`, `border-radius: 16px`, `box-shadow: 0 0 16px rgba(0,212,180,0.08)`, translação via `left` com `transition: left 0.3s cubic-bezier(.4,0,.2,1)`
- Item ativo: label cor `var(--primary)`; inativo: `opacity: 0.25` no ícone, label `var(--text-dim)`

**Sidebar (desktop):**
- Background `var(--surface)/60%`, `backdrop-filter: blur(20px)`, borda direita `var(--border)`
- NavLink ativo: `background: var(--primary)/10%`, borda `var(--border-strong)`, texto cyan
- NavLink inativo: texto `var(--muted-foreground)`, hover `var(--foreground)`

### `Dashboard.tsx`

**Alertas:**
- Row com `border-radius: 10px`, background dimmed da cor (e.g. `var(--destructive)/10%`), borda colorida, dot com `box-shadow` glowing, texto + arrow `›`

**Stat cards (StockHealthCard + MaintenanceDonutCard):**
- Substituir por dois `stat-card` lado a lado
- Número grande em Rajdhani 700, 36px, na cor semântica
- Label uppercase Rajdhani 600 9px
- Progress bar fina (3px) abaixo do número

**Card Telegram:**
- Manter estrutura, atualizar styling: icon container com cor azul, botão "Enviar" com background/border azul translúcido

### `Inventory.tsx`

**Item cards:**
- Layout: icon square à esquerda (36×36, `border-radius: 10px`) + nome/categoria + qty/badge à direita
- Borda normal: `var(--border)`; item em falta: `border-color: rgba(255,77,77,0.25)`
- Progress bar de 3px abaixo do nome
- Badges: `badge-green` / `badge-red` / `badge-amber` / `badge-cyan`
- Botões `+/-` de quantidade: manter funcionalidade, atualizar visual para `btn-icon` style

### `Maintenance.tsx`

**Task cards:**
- Barra lateral de 3px (`border-left` ou pseudo-elemento) na cor semântica: vermelho/âmbar/verde
- Título em Outfit 600 13px
- Meta em Outfit 400 10px muted
- Badge de status inline
- Botões ✓ e 🗑: `btn-icon` style (32×32, `border-radius: 8px`)

### `Auth.tsx`

- Background com grid overlay e glows (já existe versão similar, só refinar)
- Card do formulário: `var(--surface)`, `border: 1px solid var(--border-strong)`, `border-radius: 16px`
- Título em Rajdhani 700
- Inputs com borda `var(--border)`, focus `var(--primary)`

---

## Arquivos a Modificar

1. `index.html` — adicionar Google Fonts (Rajdhani + Outfit)
2. `src/index.css` — atualizar CSS variables (dark palette) + adicionar utilitários globais (grid overlay, glows, card highlight, badge classes, btn-icon)
3. `src/components/layout/AppShell.tsx` — header + bottom nav pill + sidebar
4. `src/pages/app/Dashboard.tsx` — stat cards + alertas + telegram card
5. `src/pages/app/Inventory.tsx` — item cards + progress + badges
6. `src/pages/app/Maintenance.tsx` — task cards com barra lateral colorida
7. `src/pages/app/Auth.tsx` — formulário reestilizado

---

## Fora do Escopo

- Lógica de dados (hooks, supabase queries, mutations)
- Estrutura de roteamento
- Componentes shadcn/ui internos (Dialog, Sheet, Toast) — mantidos como estão
- Novas features ou páginas
