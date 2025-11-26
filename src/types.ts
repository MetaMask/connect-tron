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
export enum Scope {
  MAINNET = 'tron:0x2b6653dc',
  SHASTA = 'tron:0x94a9059e',
  NILE = 'tron:0xcd8690dc',
}
