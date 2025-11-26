import { type Network, NetworkType, WalletGetNetworkError } from '@tronweb3/tronwallet-abstract-adapter';
import { TronScope } from './types';

/**
 * Converts a chain ID to its corresponding Tron scope.
 * @param chainId - The chain ID string.
 * @returns The corresponding TronScope.
 * @throws Error if the chain ID is unsupported.
 */
export function chainIdToScope(chainId: string): TronScope {
  switch (chainId) {
    case '0x2b6653dc': // Tron mainnet
      return TronScope.MAINNET;
    case '0xcd8690dc': // Tron nile testnet
      return TronScope.NILE;
    case '0x94a9059e': // Tron shasta testnet
      return TronScope.SHASTA;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}

/**
 * Converts a Tron scope to its corresponding chain ID.
 * @param scope - The TronScope.
 * @returns The corresponding chain ID string.
 * @throws Error if the scope is unsupported.
 */
export function scopeToChainId(scope: TronScope): string {
  switch (scope) {
    case TronScope.MAINNET:
      return '0x2b6653dc';
    case TronScope.NILE:
      return '0xcd8690dc';
    case TronScope.SHASTA:
      return '0x94a9059e';
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}

/**
 * Maps a Tron scope to its corresponding network configuration.
 * @param scope - The TronScope.
 * @returns The corresponding Network object.
 * @throws WalletGetNetworkError if the scope is unknown.
 */
export function getNetworkFromScope(scope: TronScope): Network {
  console.log('MetaMaskAdapter.#getNetworkFromScope called', { scope });
  switch (scope) {
    case TronScope.MAINNET:
      return {
        networkType: NetworkType.Mainnet,
        chainId: '0x2b6653dc',
        fullNode: '',
        solidityNode: '',
        eventServer: '',
      };
    case TronScope.SHASTA:
      return {
        networkType: NetworkType.Shasta,
        chainId: '0x94a9059e',
        fullNode: '',
        solidityNode: '',
        eventServer: '',
      };
    case TronScope.NILE:
      return {
        networkType: NetworkType.Nile,
        chainId: '0xcd8690dc',
        fullNode: '',
        solidityNode: '',
        eventServer: '',
      };
    default:
      throw new WalletGetNetworkError('Unknown scope');
  }
}

/**
 * Extracts the address from a CAIP account ID.
 * @param caipAccountId - The CAIP account ID string (e.g., 'tron:mainnet:address').
 * @returns The extracted address.
 * @throws Error if the CAIP account ID is invalid.
 */
export function getAddressFromCaipAccountId(caipAccountId: string): string {
  const [, , address] = caipAccountId.split(':');
  if (!address) {
    throw new Error(`Invalid CAIP account ID: ${caipAccountId}`);
  }
  return address;
}

export function isAccountChangedEvent(data: any): boolean {
  return data?.method === 'accountsChanged';
}
