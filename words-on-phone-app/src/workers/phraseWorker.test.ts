import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to flush micro-tasks
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe('PhraseWorker', () => {
  let addEventListenerSpy: any;
  let postMessageSpy: any;
  let messageHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await vi.resetModules();

    // ─── Mock global crypto ────────────────────────────────────────────────
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid')
    });

    // ─── Stub IndexedDB so async storage calls resolve immediately ────────
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        const req: any = {
          onsuccess: undefined,
          onerror: undefined,
          result: {
            objectStoreNames: [],
            createObjectStore: vi.fn(),
            transaction: vi.fn(() => ({
              objectStore: vi.fn(() => ({
                get: vi.fn(() => {
                  const gr: any = {};
                  setTimeout(() => gr.onsuccess && gr.onsuccess({ target: { result: undefined } }), 0);
                  return gr;
                }),
                put: vi.fn(() => {
                  const pr: any = {};
                  setTimeout(() => pr.onsuccess && pr.onsuccess({}), 0);
                  return pr;
                })
              }))
            }))
          }
        };
        // fire success on next tick
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: req.result } }), 0);
        return req;
      })
    });

    // ─── Mock fetch to avoid real network ─────────────────────────────────
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ));

    // ─── Mock self (WorkerGlobalScope) ────────────────────────────────────
    messageHandler = undefined;
    postMessageSpy = vi.fn();
    addEventListenerSpy = vi.fn((type: string, handler: any) => {
      if (type === 'message') {
        messageHandler = handler;
      }
    });

    vi.stubGlobal('self', {
      addEventListener: addEventListenerSpy,
      postMessage: postMessageSpy,
      location: { hostname: 'localhost', port: '5173' }
    });

    // Some libraries (jsdom) rely on window.postMessage having 2 params – stub to avoid errors
    vi.stubGlobal('postMessage', vi.fn((msg, target) => {}));

    // Import the worker (side-effect: sets up listeners and logs)
    // @ts-ignore file is JS module
    await import('./phraseWorker');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers core event listeners', () => {
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('handles START message', async () => {
    const handler = (addEventListenerSpy.mock.calls as any[][]).find(call => call[0] === 'message')?.[1];
    expect(handler).toBeDefined();
    handler({ data: { type: 'START' } });
    await flushPromises();
    expect(postMessageSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'WORKER_STARTED' }));
  });

  it('handles STATUS message', async () => {
    const handler = (addEventListenerSpy.mock.calls as any[][]).find(call => call[0] === 'message')?.[1];
    expect(handler).toBeDefined();
    expect(() => {
      handler({ data: { type: 'STATUS' } });
    }).not.toThrow();
    await flushPromises();
  });

  it('handles unknown message types gracefully', () => {
    const handler = (addEventListenerSpy.mock.calls as any[][]).find(call => call[0] === 'message')?.[1];
    expect(handler).toBeDefined();
    expect(() => handler({ data: { type: 'UNKNOWN_TYPE' } })).not.toThrow();
  });
}); 