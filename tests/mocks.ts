import { vi } from 'vitest';

// Mock types for the multichain client
export interface MockMultichainClient {
  getSession: ReturnType<typeof vi.fn>;
  createSession: ReturnType<typeof vi.fn>;
  invokeMethod: ReturnType<typeof vi.fn>;
  onNotification: ReturnType<typeof vi.fn>;
  removeAllListeners?: ReturnType<typeof vi.fn>;
}

// Mock transport - simulate a basic transport interface
export const mockTransport = {
  send: vi.fn().mockResolvedValue(undefined),
  onMessage: vi.fn(),
  removeAllListeners: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockResolvedValue(true),
  // Add any other methods that might be called
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  postMessage: vi.fn(),
};

// Mock multichain client factory
export const createMockMultichainClient = (): MockMultichainClient => ({
  getSession: vi.fn().mockResolvedValue({}),
  createSession: vi.fn().mockResolvedValue({}),
  invokeMethod: vi.fn().mockResolvedValue({}),
  onNotification: vi.fn().mockReturnValue(vi.fn()), // Return a mock cleanup function
  removeAllListeners: vi.fn(),
});

// Mock the getDefaultTransport function
export const mockGetDefaultTransport = vi.fn(() => mockTransport);

// Mock the getMultichainClient function
export const mockGetMultichainClient = vi.fn(() => createMockMultichainClient());

// Setup function to mock the entire multichain-api-client module
export const setupMultichainApiClientMocks = () => {
  vi.mock('@metamask/multichain-api-client', () => ({
    getDefaultTransport: mockGetDefaultTransport,
    getMultichainClient: vi.fn(() => createMockMultichainClient()),
  }));
};

// Mock TronWeb types
export const mockTronWeb = {
  trx: {
    sign: vi.fn(),
    broadcast: vi.fn(),
  },
  address: {
    fromHex: vi.fn(),
    toHex: vi.fn(),
  },
};

// Mock TronLink adapter for comparison
export const mockTronLinkAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signMessage: vi.fn(),
  getNetwork: vi.fn(),
  switchChain: vi.fn(),
};

// Test data constants
export const TEST_ADDRESSES = {
  MAINNET: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9',
  NILE: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
  SHASTA: 'TG3iMSj5MeM4pJtBhX1HMjKjK8E2vKUHz',
};

export const TEST_SCOPES = {
  MAINNET: 'tron:728126428',
  NILE: 'tron:3448148188',
  SHASTA: 'tron:2494104990',
};

export const TEST_CHAIN_IDS = {
  MAINNET: '0x2b6653dc',
  NILE: '0xcd8690dc',
  SHASTA: '0x94a9059e',
};

export const TEST_SESSIONS = {
  EMPTY: {},
  MAINNET_ONLY: {
    sessionScopes: {
      [TEST_SCOPES.MAINNET]: {
        accounts: [`${TEST_SCOPES.MAINNET}:${TEST_ADDRESSES.MAINNET}`],
      },
    },
  },
  MULTI_SCOPE: {
    sessionScopes: {
      [TEST_SCOPES.MAINNET]: {
        accounts: [`${TEST_SCOPES.MAINNET}:${TEST_ADDRESSES.MAINNET}`],
      },
      [TEST_SCOPES.NILE]: {
        accounts: [`${TEST_SCOPES.NILE}:${TEST_ADDRESSES.NILE}`],
      },
    },
  },
};

export const TEST_TRANSACTIONS = {
  SIMPLE: {
    visible: false,
    txID: 'test-tx-id',
    raw_data: {
      contract: [
        {
          parameter: {
            value: {
              amount: 1000000,
              owner_address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9',
              to_address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
            },
            type_url: 'type.googleapis.com/protocol.TransferContract',
          },
          type: 'TransferContract',
        },
      ],
      ref_block_bytes: '0000',
      ref_block_hash: '0000000000000000',
      expiration: 1700000000000,
      timestamp: 1690000000000,
    },
    raw_data_hex: 'test-raw-data-hex',
  } as any, // Using any to bypass strict typing for mock
};

export const TEST_MESSAGES = {
  SIMPLE: 'Hello, World!',
  HEX: '0x48656c6c6f2c20576f726c6421',
};
