import type { RpcMethod } from '@metamask/multichain-api-client';
import type { SignedTransaction, Transaction } from 'tronweb/lib/esm/types/Transaction';

/**
 * Defines the RPC methods and events for Tron blockchain interactions.
 */
export type TronRpc = {
  methods: {
    signMessage: RpcMethod<{ message: string; privateKey?: string }, { signature: string }>;
    signTransaction: RpcMethod<
      { transaction: Transaction; privateKey?: string },
      { signedTransaction: SignedTransaction }
    >;
  };
  events: [];
};

/**
 * Enum of supported Tron network scopes in CAIP-2 format.
 */
export enum TronScope {
  MAINNET = 'tron:mainnet',
  SHASTA = 'tron:shasta',
  NILE = 'tron:nile',
}

/**
 * Type representing a Tron chain identifier.
 */
export type TronChain = `${TronScope}`;
/**
 * Interface representing a Tron account with address and scope.
 */
export interface TronAccount {
  address: string;
  scope: TronScope;
}
