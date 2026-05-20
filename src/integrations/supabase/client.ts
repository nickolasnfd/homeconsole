import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Detecta se as variáveis de ambiente são ausentes ou valores dummy
const isDummy = 
  !SUPABASE_URL || 
  !SUPABASE_PUBLISHABLE_KEY || 
  SUPABASE_URL.includes('dummy') || 
  SUPABASE_PUBLISHABLE_KEY.includes('dummy') ||
  SUPABASE_URL === 'https://cgjejxggkbunlklkhtno.supabase.co'; // ID padrão do Lovable que virá vazio para o usuário

// Mock Database em LocalStorage
class MockQueryBuilder {
  private tableName: string;
  private currentQuery: any[] = [];
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filterField: string | null = null;
  private filterValue: any = null;
  private sortColumn: string | null = null;
  private sortAscending = true;
  private isSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
    const raw = localStorage.getItem(`mock_db:${tableName}`);
    if (raw) {
      this.currentQuery = JSON.parse(raw);
    } else {
      this.currentQuery = this.getInitialData(tableName);
      localStorage.setItem(`mock_db:${tableName}`, JSON.stringify(this.currentQuery));
    }
  }

  private getInitialData(tableName: string): any[] {
    const formatISO = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return formatISO(d);
    };

    if (tableName === 'inventory') {
      return [
        { id: 'i1', name: 'Arroz Integral', current_qty: 2, min_threshold: 5, unit: 'kg', category: 'Alimentos', expires_at: addDays(45), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'i2', name: 'Leite Integral', current_qty: 12, min_threshold: 6, unit: 'L', category: 'Alimentos', expires_at: addDays(5), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'i3', name: 'Detergente Líquido', current_qty: 0, min_threshold: 2, unit: 'un', category: 'Limpeza', expires_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'i4', name: 'Creme Dental', current_qty: 1, min_threshold: 3, unit: 'un', category: 'Higiene', expires_at: addDays(60), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
    }
    if (tableName === 'maintenance') {
      return [
        { id: 'm1', title: 'Limpar ar-condicionado', description: 'Higienizar filtros e verificar gás da unidade do quarto principal', frequency_days: 180, frequency_unit: 'days', last_performed_date: addDays(-175), next_due_date: addDays(5), priority_level: 'medium', completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'm2', title: 'Lavar a garagem', description: 'Lavar o piso e remover manchas de óleo da garagem', frequency_days: 30, frequency_unit: 'days', last_performed_date: addDays(-32), next_due_date: addDays(-2), priority_level: 'low', completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'm3', title: 'Dedetização anual', description: 'Contratar serviço para dedetização geral contra insetos', frequency_days: 365, frequency_unit: 'days', last_performed_date: addDays(-320), next_due_date: addDays(45), priority_level: 'high', completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
    }
    if (tableName === 'finances') {
      return [
        { id: 'f1', description: 'Conta de Energia', amount: 250.50, due_date: addDays(10), status: 'pending', category: 'Contas', frequency_value: 1, frequency_unit: 'months', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'f2', description: 'Condomínio', amount: 450.00, due_date: addDays(5), status: 'pending', category: 'Contas', frequency_value: 1, frequency_unit: 'months', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'f3', description: 'Supermercado Mensal', amount: 820.40, due_date: addDays(-3), status: 'paid', category: 'Alimentação', frequency_value: null, frequency_unit: 'days', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'f4', description: 'Internet Fibra', amount: 120.00, due_date: addDays(15), status: 'pending', category: 'Internet', frequency_value: 1, frequency_unit: 'months', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
    }
    return [];
  }

  select(columns?: string) {
    this.action = 'select';
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortColumn = column;
    this.sortAscending = options?.ascending ?? true;
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filterField = field;
    this.filterValue = value;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  then(onfulfilled: (value: any) => any, onrejected?: (reason: any) => any) {
    let result: any = null;
    let error: any = null;

    try {
      const allData = [...this.currentQuery];

      if (this.action === 'select') {
        let filtered = allData;
        if (this.filterField !== null) {
          filtered = filtered.filter(item => item[this.filterField!] === this.filterValue);
        }
        if (this.sortColumn !== null) {
          filtered.sort((a, b) => {
            const valA = a[this.sortColumn!];
            const valB = b[this.sortColumn!];
            if (valA < valB) return this.sortAscending ? -1 : 1;
            if (valA > valB) return this.sortAscending ? 1 : -1;
            return 0;
          });
        }
        result = filtered;
      } 
      else if (this.action === 'insert') {
        const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        const insertedRows = rowsToInsert.map(row => {
          const newRow = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...row
          };
          this.currentQuery.push(newRow);
          return newRow;
        });
        localStorage.setItem(`mock_db:${this.tableName}`, JSON.stringify(this.currentQuery));
        result = this.isSingle ? insertedRows[0] : insertedRows;
      } 
      else if (this.action === 'update') {
        if (this.filterField === null) {
          throw new Error('Update queries require a filter (.eq)');
        }
        const updatedRows: any[] = [];
        this.currentQuery = this.currentQuery.map(item => {
          if (item[this.filterField!] === this.filterValue) {
            const updatedItem = {
              ...item,
              ...this.payload,
              updated_at: new Date().toISOString()
            };
            updatedRows.push(updatedItem);
            return updatedItem;
          }
          return item;
        });
        localStorage.setItem(`mock_db:${this.tableName}`, JSON.stringify(this.currentQuery));
        result = this.isSingle ? updatedRows[0] : updatedRows;
      } 
      else if (this.action === 'delete') {
        if (this.filterField === null) {
          throw new Error('Delete queries require a filter (.eq)');
        }
        this.currentQuery = this.currentQuery.filter(item => item[this.filterField!] !== this.filterValue);
        localStorage.setItem(`mock_db:${this.tableName}`, JSON.stringify(this.currentQuery));
        result = [];
      }
    } catch (err: any) {
      error = err;
    }

    if (error) {
      return Promise.resolve({ data: null, error: { message: error.message } }).then(onfulfilled);
    }

    return Promise.resolve({ data: result, error: null }).then(onfulfilled);
  }
}

// Mock Auth
const mockAuth = {
  listeners: [] as ((event: string, session: any) => void)[],

  async getSession() {
    const raw = localStorage.getItem('mock_auth:session');
    if (raw) {
      return { data: { session: JSON.parse(raw) }, error: null };
    }
    return { data: { session: null }, error: null };
  },

  async signUp({ email, password }: any) {
    const session = {
      user: { id: 'user-mock-123', email },
      access_token: 'mock-token',
      refresh_token: 'mock-token'
    };
    const users = JSON.parse(localStorage.getItem('mock_auth:users') || '[]');
    if (users.some((u: any) => u.email === email)) {
      return { data: { user: null }, error: { message: 'Este usuário já está cadastrado.' } };
    }
    users.push({ email, password });
    localStorage.setItem('mock_auth:users', JSON.stringify(users));
    return { data: { user: session.user }, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    const users = JSON.parse(localStorage.getItem('mock_auth:users') || '[]');
    
    // Se não existirem usuários ainda, registramos automaticamente o primeiro acesso para facilitar
    let matched = users.find((u: any) => u.email === email && u.password === password);
    if (!matched && users.length === 0) {
      matched = { email, password };
      users.push(matched);
      localStorage.setItem('mock_auth:users', JSON.stringify(users));
    }

    if (matched) {
      const session = {
        user: { id: 'user-mock-123', email },
        access_token: 'mock-token',
        refresh_token: 'mock-token'
      };
      localStorage.setItem('mock_auth:session', JSON.stringify(session));
      this.triggerChange('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    } else {
      return { data: { session: null }, error: { message: 'E-mail ou senha incorretos no modo local.' } };
    }
  },

  async signOut() {
    localStorage.removeItem('mock_auth:session');
    this.triggerChange('SIGNED_OUT', null);
    return { error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    this.getSession().then(({ data: { session } }) => {
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    });
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
          }
        }
      }
    };
  },

  triggerChange(event: string, session: any) {
    this.listeners.forEach(l => l(event, session));
  }
};

// Se for chave real, usa o cliente oficial. Caso contrário, chave fake entra no modo local transparente.
export const supabase = isDummy 
  ? ({
      from: (table: string) => new MockQueryBuilder(table),
      auth: mockAuth
    } as any)
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });