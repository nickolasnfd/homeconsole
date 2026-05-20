import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/telegram-webhook';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = vi.fn((table) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
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
});
