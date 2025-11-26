import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Global reference to current mock client
const mockClient: MockMultichainClient = {
  getSession: vi.fn(),
  createSession: vi.fn(),
  invokeMethod: vi.fn(),
  onNotification: vi.fn(),
};

// Mock the multichain API client completely
vi.mock('@metamask/multichain-api-client', () => ({
  getDefaultTransport: vi.fn(() => mockTransport),
  getMultichainClient: vi.fn(() => mockClient),
}));

// Mock global window object to prevent window.postMessage issues
global.window = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  open: vi.fn(),
} as any;

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as any;

// Mock the abstract adapter
vi.mock('@tronweb3/tronwallet-abstract-adapter', () => ({
  Adapter: class MockAdapter {
    constructor() {
      this._state = 'disconnected';
      this.name = MetaMaskAdapterName;
    }
    _state: string;
    name: string;
    get state() {
      return this._state;
    }
    set state(value: string) {
      this._state = value;
    }
    emit = vi.fn();
    on = vi.fn();
    off = vi.fn();
  },
  WalletReadyState: {
    NotFound: 'NotFound',
    Loading: 'Loading',
    Found: 'Found',
  },
  AdapterState: {
    Loading: 'Loading',
    NotFound: 'NotFound',
    Found: 'Found',
    Connected: 'Connected',
    Disconnect: 'Disconnect',
    Disconnected: 'Disconnected',
  },
  NetworkType: {
    Mainnet: 'Mainnet',
    Shasta: 'Shasta',
    Nile: 'Nile',
  },
  WalletConnectionError: class extends Error {},
  WalletDisconnectedError: class extends Error {
    constructor(message = 'Wallet not connected') {
      super(message);
      this.name = 'WalletDisconnectedError';
    }
  },
  WalletGetNetworkError: class extends Error {},
  WalletNotFoundError: class extends Error {},
  WalletSignMessageError: class extends Error {},
  WalletSignTransactionError: class extends Error {},
  isInBrowser: vi.fn(() => true),
}));

import { MetaMaskAdapter, MetaMaskAdapterName } from '../src/adapter';
import { Scope } from '../src/types';
import {
  type MockMultichainClient,
  TEST_ADDRESSES,
  TEST_MESSAGES,
  TEST_SCOPES,
  TEST_SESSIONS,
  TEST_TRANSACTIONS,
  mockTransport,
} from '../tests/mocks';

describe('MetaMaskAdapter', () => {
  let adapter: MetaMaskAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new MetaMaskAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct name and state', () => {
      expect(adapter.name).toBe(MetaMaskAdapterName);
      expect(adapter.state).toBe('Disconnect'); // Initial state is Disconnect
    });
  });

  describe('connect', () => {
    it('should throw error if MetaMask is not found', async () => {
      // Simulate MetaMask not being found by setting state to NotFound
      (adapter as any)._readyState = 'NotFound';
      (adapter as any)._state = 'NotFound';

      await expect(adapter.connect()).rejects.toThrow('Wallet not found');
      expect(adapter.state).toBe('NotFound');
    });

    it('should restore existing session if available', async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());

      await adapter.connect();

      expect(mockClient.getSession).toHaveBeenCalled();
      expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      expect((adapter as any)._scope).toBe(Scope.MAINNET);
      expect(adapter.state).toBe('Connected');
    });

    it('should create new session if no existing session', async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.EMPTY);
      mockClient.createSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());

      await adapter.connect();

      expect(mockClient.createSession).toHaveBeenCalledWith({
        optionalScopes: {
          [TEST_SCOPES.MAINNET]: {
            accounts: [],
            methods: ['signTransaction', 'signMessage'],
            notifications: ['accountsChanged', 'chainChanged'],
          },
        },
        sessionProperties: {
          tron_accountsChanged_notifications: true,
        },
      });
      expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      expect((adapter as any)._scope).toBe(Scope.MAINNET);
      expect(adapter.state).toBe('Connected');
    });

    it('should prioritize mainnet scope over others', async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MULTI_SCOPE);
      mockClient.onNotification.mockReturnValue(vi.fn());

      await adapter.connect();

      expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      expect((adapter as any)._scope).toBe(Scope.MAINNET);
    });

    it('should emit connect event on successful connection', async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());

      await adapter.connect();

      expect(adapter.emit).toHaveBeenCalledWith('connect', TEST_ADDRESSES.MAINNET);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());
      await adapter.connect();
    });

    it('should disconnect and clear state', async () => {
      await adapter.disconnect();

      expect(adapter.address).toBeNull();
      expect((adapter as any)._scope).toBeUndefined();
      expect(adapter.state).toBe('Disconnect');
      expect(adapter.emit).toHaveBeenCalledWith('disconnect');
    });
  });

  describe('signTransaction', () => {
    beforeEach(async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());
      await adapter.connect();
    });

    it('should sign transaction using multichain client', async () => {
      const signedTx = { signature: '0x123' };
      mockClient.invokeMethod.mockResolvedValue({ signedTransaction: signedTx });

      const result = await adapter.signTransaction(TEST_TRANSACTIONS.SIMPLE);

      expect(mockClient.invokeMethod).toHaveBeenCalledWith({
        scope: TEST_SCOPES.MAINNET,
        request: {
          method: 'signTransaction',
          params: {
            transaction: TEST_TRANSACTIONS.SIMPLE,
            privateKey: undefined,
          },
        },
      });
      expect(result).toBe(signedTx);
    });

    it('should throw error if not connected', async () => {
      await adapter.disconnect();

      await expect(adapter.signTransaction(TEST_TRANSACTIONS.SIMPLE)).rejects.toThrow('Wallet not connected');
    });
  });

  describe('signMessage', () => {
    beforeEach(async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());
      await adapter.connect();
    });

    it('should sign message using multichain client', async () => {
      const signature = '0x456';
      mockClient.invokeMethod.mockResolvedValue({ signature });

      const result = await adapter.signMessage(TEST_MESSAGES.SIMPLE);

      expect(mockClient.invokeMethod).toHaveBeenCalledWith({
        scope: TEST_SCOPES.MAINNET,
        request: {
          method: 'signMessage',
          params: {
            message: TEST_MESSAGES.SIMPLE,
            privateKey: undefined,
          },
        },
      });
      expect(result).toBe(signature);
    });

    it('should throw error if not connected', async () => {
      await adapter.disconnect();

      await expect(adapter.signMessage(TEST_MESSAGES.SIMPLE)).rejects.toThrow('Wallet not connected');
    });
  });

  describe('network', () => {
    beforeEach(async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());
      await adapter.connect();
    });

    it('should return current network based on scope', async () => {
      const network = await adapter.network();

      expect(network).toMatchObject({
        chainId: '0x2b6653dc',
        networkType: 'Mainnet',
      });
    });

    it('should throw error if not connected', async () => {
      await adapter.disconnect();

      await expect(adapter.network()).rejects.toThrow('Wallet not connected');
    });
  });

  describe('switchChain', () => {
    beforeEach(async () => {
      mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MAINNET_ONLY);
      mockClient.onNotification.mockReturnValue(vi.fn());
      await adapter.connect();
    });

    it('should switch to nile network', async () => {
      // Mock createSession to return a session with nile scope
      mockClient.createSession.mockResolvedValue({
        sessionScopes: {
          'tron:0xcd8690dc': {
            accounts: [`tron:0xcd8690dc:${TEST_ADDRESSES.MAINNET}`],
          },
        },
      });

      await adapter.switchChain('0xcd8690dc');

      expect(mockClient.createSession).toHaveBeenCalledWith({
        optionalScopes: {
          [Scope.NILE]: {
            accounts: [`${Scope.NILE}:${TEST_ADDRESSES.MAINNET}`],
            methods: ['signTransaction', 'signMessage'],
            notifications: ['accountsChanged', 'chainChanged'],
          },
        },
        sessionProperties: {
          tron_accountsChanged_notifications: true,
        },
      });
      expect((adapter as any)._scope).toBe(Scope.NILE);
      expect(adapter.emit).toHaveBeenCalledWith('chainChanged', '0xcd8690dc');
    });

    it('should throw error if not connected', async () => {
      await adapter.disconnect();

      await expect(adapter.switchChain('0xcd8690dc')).rejects.toThrow('Wallet not connected');
    });
  });

  describe('session management', () => {
    describe('tryRestoringSession', () => {
      it('should restore session with available scopes', async () => {
        mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MULTI_SCOPE);
        global.localStorage.getItem = vi.fn().mockReturnValue(null);

        await (adapter as any).tryRestoringSession();

        expect(mockClient.getSession).toHaveBeenCalled();
        expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
        expect((adapter as any)._scope).toBe(Scope.MAINNET);
      });

      it('should restore previously selected scope if available', async () => {
        mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MULTI_SCOPE);
        global.localStorage.getItem = vi.fn().mockReturnValue(Scope.NILE);

        await (adapter as any).tryRestoringSession();

        expect(mockClient.getSession).toHaveBeenCalled();
        expect(localStorage.getItem).toHaveBeenCalledWith('metamaskAdapterScope');
        expect(adapter.address).toBe(TEST_ADDRESSES.NILE);
        expect((adapter as any)._scope).toBe(Scope.NILE);
      });

      it('should fallback to mainnet if previously selected scope is not available', async () => {
        const sessionWithMainnetOnly = {
          sessionScopes: {
            [Scope.MAINNET]: {
              accounts: [`${Scope.MAINNET}:${TEST_ADDRESSES.MAINNET}`],
            },
          },
        };
        mockClient.getSession.mockResolvedValue(sessionWithMainnetOnly);
        global.localStorage.getItem = vi.fn().mockReturnValue(Scope.NILE);

        await (adapter as any).tryRestoringSession();

        expect(mockClient.getSession).toHaveBeenCalled();
        expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
        expect((adapter as any)._scope).toBe(Scope.MAINNET);
      });

      it('should not set address if no accounts in scope', async () => {
        mockClient.getSession.mockResolvedValue({
          sessionScopes: {
            [TEST_SCOPES.MAINNET]: { accounts: [] },
          },
        });

        await (adapter as any).tryRestoringSession();

        expect(adapter.address).toBeNull();
      });
    });

    describe('updateSession', () => {
      it('should prioritize mainnet scope', () => {
        (adapter as any).updateSession(TEST_SESSIONS.MULTI_SCOPE);

        expect((adapter as any)._scope).toBe(Scope.MAINNET);
        expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      });

      it('should use selectedAddress when provided', () => {
        const session = TEST_SESSIONS.MULTI_SCOPE;
        const selectedAddress = TEST_ADDRESSES.NILE;

        (adapter as any).updateSession(session, undefined, selectedAddress);

        expect((adapter as any)._scope).toBe(Scope.MAINNET);
        expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      });

      it('should fallback to first address if no match', () => {
        const session = {
          sessionScopes: {
            [Scope.NILE]: {
              accounts: [`${Scope.NILE}:${TEST_ADDRESSES.NILE}`],
            },
          },
        };

        (adapter as any).updateSession(session);

        expect((adapter as any)._scope).toBe(Scope.NILE);
        expect(adapter.address).toBe(TEST_ADDRESSES.NILE);
      });
    });

    describe('handleAccountsChangedEvent', () => {
      beforeEach(() => {
        mockClient.getSession.mockResolvedValue(TEST_SESSIONS.MULTI_SCOPE);
      });

      it('should update address when accounts changed', async () => {
        const eventData = {
          method: 'accountsChanged',
          params: {
            notification: {
              params: [TEST_ADDRESSES.NILE],
            },
          },
        };

        await (adapter as any).handleAccountsChangedEvent(eventData);

        expect(adapter.address).toBe(TEST_ADDRESSES.MAINNET);
      });

      it('should ignore invalid events', () => {
        const originalAddress = adapter.address;
        const eventData = { invalid: true };

        (adapter as any).handleAccountsChangedEvent(eventData);

        expect(adapter.address).toBe(originalAddress);
      });
    });
  });

  describe('getInitialSelectedAddress', () => {
    it('should return address from accountsChanged event within timeout', async () => {
      const mockRemoveListener = vi.fn();
      mockClient.onNotification.mockImplementation((callback) => {
        // Simulate accountsChanged event
        setTimeout(() => {
          callback({
            method: 'accountsChanged',
            params: {
              notification: {
                params: [TEST_ADDRESSES.MAINNET],
              },
            },
          });
        }, 100);
        return mockRemoveListener;
      });

      const result = await (adapter as any).getInitialSelectedAddress();

      expect(result).toBe(TEST_ADDRESSES.MAINNET);
      expect(mockRemoveListener).toHaveBeenCalled();
    });

    it('should return undefined if no event within timeout', async () => {
      mockClient.onNotification.mockReturnValue(vi.fn());

      const result = await (adapter as any).getInitialSelectedAddress();

      expect(result).toBeUndefined();
    });
  });
});
