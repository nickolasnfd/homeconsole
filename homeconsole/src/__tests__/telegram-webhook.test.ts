import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/telegram-webhook';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = vi.fn((table) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        if (table === 'telegram_authorized_chats') {
          return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => {
        if (table === 'telegram_authorized_chats') {
          return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
        }
        return Promise.resolve({ data: null, error: new Error('Not found') });
      },
      update: () => builder,
      insert: () => Promise.resolve({ error: null }),
      delete: () => builder,
      then: (onfulfilled: any) => {
        return Promise.resolve({ data: [], error: null }).then(onfulfilled);
      }
    };
    return builder;
  });

  return {
    createClient: vi.fn(() => ({
      from: mockFrom,
    })),
  };
});

// Mock fetch global
const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
global.fetch = mockFetch as any;

describe('Telegram Webhook Serverless Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    process.env.TELEGRAM_BOT_TOKEN = 'mock-bot-token';
  });

  it('should ignore unauthorized chats and return 200', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;
    
    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: null, error: new Error('Unauthorized') });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    let resStatus = 200;
    let resSent = '';

    const req = {
      method: 'POST',
      body: {
        message: {
          chat: { id: 999999 },
          text: 'hello'
        }
      }
    } as any;

    const res = {
      status: (s: number) => { resStatus = s; return res; },
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resStatus).toBe(200);
    expect(resSent).toContain('unauthorized');
  });

  it('should process status command and send summary message', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;
    
    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    let resStatus = 200;
    let resSent = '';

    const req = {
      method: 'POST',
      body: {
        message: {
          chat: { id: 123456 },
          text: 'status'
        }
      }
    } as any;

    const res = {
      status: (s: number) => { resStatus = s; return res; },
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resStatus).toBe(200);
    expect(resSent).toBe('OK');
    expect(mockFetch).toHaveBeenCalled();
    const fetchArgs = mockFetch.mock.calls[0];
    expect(fetchArgs[0]).toContain('sendMessage');
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.text).toContain('RESUMO DA CENTRAL');
  });

  it('feito: com tarefa one_time deve setar completed = true', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    const capturedUpdates: { table: string; payload: any; id: string }[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        update: (payload: any) => {
          return {
            eq: (col: string, val: string) => {
              capturedUpdates.push({ table, payload, id: val });
              return Promise.resolve({ data: payload, error: null });
            }
          };
        },
        then: (onfulfilled: any) => {
          if (table === 'maintenance') {
            return Promise.resolve({
              data: [
                { id: 't1', title: 'Limpar calha', task_type: 'one_time', completed: false, frequency_days: 30, frequency_unit: 'days', next_due_date: '2026-05-20' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'feito: calha' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    expect(capturedUpdates.length).toBe(1);
    expect(capturedUpdates[0].payload.completed).toBe(true);
    expect(capturedUpdates[0].payload.last_performed_date).toBeDefined();
    // Deve enviar mensagem de confirmação
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Limpar calha');
    expect(tgPayload.text).toContain('concluída');
  });

  it('feito: com tarefa recurring deve calcular next_due_date e manter completed = false', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    const capturedUpdates: { table: string; payload: any; id: string }[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        update: (payload: any) => {
          return {
            eq: (col: string, val: string) => {
              capturedUpdates.push({ table, payload, id: val });
              return Promise.resolve({ data: payload, error: null });
            }
          };
        },
        then: (onfulfilled: any) => {
          if (table === 'maintenance') {
            return Promise.resolve({
              data: [
                { id: 't2', title: 'Limpar ar-condicionado', task_type: 'recurring', completed: false, frequency_days: 180, frequency_unit: 'days', next_due_date: '2026-06-30' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'feito: ar-condicionado' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    expect(capturedUpdates.length).toBe(1);
    expect(capturedUpdates[0].payload.completed).toBe(false);
    expect(capturedUpdates[0].payload.next_due_date).toBeDefined();
    // next_due_date deve ser posterior à data base (2026-06-30 + 180 dias)
    expect(capturedUpdates[0].payload.next_due_date > '2026-06-30').toBe(true);
    // Deve enviar mensagem com a próxima data
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Próxima:');
  });

  it('feito: com texto que não bate com nenhuma tarefa deve responder "não encontrada"', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          // Retorna lista vazia de tarefas — nenhuma tarefa pendente
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'feito: tarefa inexistente' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Nenhuma tarefa pendente');
    expect(tgPayload.text).toContain('tarefa inexistente');
  });

  it('del: arroz com match deve deletar o item', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    const capturedDeletes: string[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => {
          if (table === 'inventory' && args[0] === 'id') {
            capturedDeletes.push(args[1]);
          }
          return builder;
        },
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        delete: () => {
          return {
            eq: (col: string, val: string) => {
              if (table === 'inventory' && col === 'id') {
                capturedDeletes.push(val);
              }
              return Promise.resolve({ error: null });
            }
          };
        },
        then: (onfulfilled: any) => {
          if (table === 'inventory') {
            return Promise.resolve({
              data: [
                { id: 'i-arroz', name: 'Arroz Integral', current_qty: 2, min_threshold: 5, category: 'Alimentos' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'del: arroz integral' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    expect(capturedDeletes).toContain('i-arroz');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Arroz Integral');
    expect(tgPayload.text).toContain('removido do estoque');
  });

  it('del: arroz sem match deve avisar que nao encontrou', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          if (table === 'inventory') {
            return Promise.resolve({
              data: [
                { id: 'i-feijao', name: 'Feijão', current_qty: 2, min_threshold: 5, category: 'Alimentos' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'del: arroz' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Nenhum item encontrado com esse nome');
  });

  it('lista com itens em falta deve retornar agrupado com emojis', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          if (table === 'inventory') {
            return Promise.resolve({
              data: [
                { id: 'i1', name: 'Arroz', current_qty: 0, min_threshold: 2, category: 'Alimentos' },
                { id: 'i2', name: 'Feijão', current_qty: 1, min_threshold: 3, category: 'Alimentos' },
                { id: 'i3', name: 'Sabão', current_qty: 0, min_threshold: 1, category: 'Higiene' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'lista' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Lista de compras');
    expect(tgPayload.text).toContain('🍎 *ALIMENTOS*');
    expect(tgPayload.text).toContain('• Arroz');
    expect(tgPayload.text).toContain('• Feijão');
    expect(tgPayload.text).toContain('🧴 *HIGIENE*');
    expect(tgPayload.text).toContain('• Sabão');
  });

  it('lista sem itens em falta deve retornar mensagem amigavel', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          if (table === 'inventory') {
            return Promise.resolve({
              data: [
                { id: 'i1', name: 'Arroz', current_qty: 5, min_threshold: 2, category: 'Alimentos' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'lista' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Nenhum item faltando no momento');
  });

  it('comprei com sucesso deve atualizar quantidade e min_threshold se necessario', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    const capturedUpdates: any[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        update: (payload: any) => {
          capturedUpdates.push(payload);
          return {
            eq: () => Promise.resolve({ error: null })
          };
        },
        then: (onfulfilled: any) => {
          if (table === 'inventory') {
            return Promise.resolve({
              data: [
                { id: 'i1', name: 'Sabão em pó', current_qty: 0, min_threshold: 5, category: 'Limpeza' }
              ],
              error: null
            }).then(onfulfilled);
          }
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'comprei: sabão em pó 2' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    expect(capturedUpdates.length).toBe(1);
    expect(capturedUpdates[0].current_qty).toBe(2);
    expect(capturedUpdates[0].min_threshold).toBe(2);
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Sabão em pó atualizado');
    expect(tgPayload.text).toContain('2 unidades em estoque');
  });

  it('comprei com item inexistente deve retornar erro', async () => {
    const { createClient: mockCreateClient } = await import('@supabase/supabase-js');
    const mockSupabase = mockCreateClient() as any;

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        eq: (...args: any[]) => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        single: () => {
          if (table === 'telegram_authorized_chats') {
            return Promise.resolve({ data: { household_id: 'house-123', user_name: 'Nickolas' }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Not found') });
        },
        then: (onfulfilled: any) => {
          return Promise.resolve({ data: [], error: null }).then(onfulfilled);
        }
      };
      return builder;
    });

    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'comprei: arroz 2' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Nenhum item encontrado');
  });

  it('comprei com quantidade invalida ou ausente deve retornar formato de uso correto', async () => {
    const req = {
      method: 'POST',
      body: { message: { chat: { id: 123456 }, text: 'comprei: arroz abc' } }
    } as any;

    let resSent = '';
    const res = {
      status: (s: number) => res,
      send: (s: string) => { resSent = s; return res; }
    } as any;

    await handler(req, res);

    expect(resSent).toBe('OK');
    const tgCall = mockFetch.mock.calls.find((c: any) => c[0].includes('sendMessage'));
    expect(tgCall).toBeDefined();
    const tgPayload = JSON.parse(tgCall![1].body);
    expect(tgPayload.text).toContain('Use o formato: comprei: arroz 2');
  });
});
