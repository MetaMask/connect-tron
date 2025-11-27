import {
  type CaipAccountId,
  type MultichainApiClient,
  type Transport,
  getDefaultTransport,
  getMultichainClient,
} from '@metamask/multichain-api-client';
import type { TronAddress } from '@metamask/multichain-api-client/dist/types/scopes/tron.types.cjs';
import {
  Adapter,
  AdapterState,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletReadyState,
  WalletSignMessageError,
  WalletSignTransactionError,
  isInBrowser,
} from '@tronweb3/tronwallet-abstract-adapter';
import type { AdapterName, Network, SignedTransaction, Transaction } from '@tronweb3/tronwallet-abstract-adapter';
import tronweb from 'tronweb';
import { metamaskIcon } from './icon';
import { Scope } from './types';
import {
  chainIdToScope,
  getAddressFromCaipAccountId,
  isAccountChangedEvent,
  scopeToChainId,
  scopeToNetworkType,
} from './utils';

/**
 * The adapter name for MetaMask.
 */
export const MetaMaskAdapterName = 'MetaMask' as AdapterName<'MetaMask'>;

/**
 * Adapter for connecting to MetaMask wallet for Tron blockchain interactions.
 */
export class MetaMaskAdapter extends Adapter {
  name = MetaMaskAdapterName;
  url = 'https://metamask.io';
  icon = metamaskIcon;

  private _readyState: WalletReadyState = WalletReadyState.Loading;
  private _state: AdapterState = AdapterState.Disconnect; // So the library will connect once the user selects the wallet (Avoid 2 click)
  private _connecting = false;
  private _address: string | null = null;
  private _scope: Scope | undefined;
  private selectedAddressOnPageLoadPromise: Promise<string | undefined> | undefined;
  private removeAccountsChangedListener: (() => void) | undefined;
  private transport: Transport;
  private client: MultichainApiClient;

  /**
   * Creates an instance of MetaMaskAdapter.
   * @param config - Configuration options for the adapter.
   */
  constructor() {
    console.log('MetaMaskAdapter.constructor called');
    super();
    this.transport = getDefaultTransport();
    this.client = getMultichainClient({ transport: this.transport });
    this.setAddress(null);
    this.selectedAddressOnPageLoadPromise = this.getInitialSelectedAddress();

    if (!isInBrowser()) {
      this._readyState = WalletReadyState.NotFound;
      this.setState(AdapterState.NotFound);
      return;
    }

    setTimeout(async () => {
      await this.checkWallet();
    }, this.transport.warmupTimeout);
  }

  /** Gets the current connected address. */
  get address() {
    console.log('MetaMaskAdapter.address getter called');
    return this._address;
  }

  /** Gets the current state of the adapter. */
  get state() {
    console.log('MetaMaskAdapter.state getter called');
    return this._state;
  }

  /** Gets the ready state of the wallet. */
  get readyState() {
    console.log('MetaMaskAdapter.readyState getter called');
    return this._readyState;
  }

  /** Gets whether the adapter is currently connecting. */
  get connecting() {
    console.log('MetaMaskAdapter.connecting getter called');
    return this._connecting;
  }

  /**
   * Connects to the MetaMask wallet.
   * @returns A promise that resolves when connected.
   */
  async connect(): Promise<void> {
    console.log('MetaMaskAdapter.connect called');
    try {
      if (this.connected || this.connecting) {
        return;
      }
      if (this._readyState !== WalletReadyState.Found) {
        throw new WalletConnectionError('Wallet not found or not ready');
      }
      await this.checkWallet();
      this._connecting = true;
      try {
        // Try restoring session
        await this.tryRestoringSession();
        // Otherwise create a session on Mainnet by default
        if (!this.address) {
          await this.createSession(Scope.MAINNET);
        }
        // In case user didn't select any Tron scope/account, return
        if (!this.address) {
          return;
        }
        this.startAccountsChangedListener();
        this.setState(AdapterState.Connected);
        this.emit('connect', this.address);
      } catch (error: any) {
        throw new WalletConnectionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  /**
   * Disconnects from the MetaMask wallet.
   * @returns A promise that resolves when disconnected.
   */
  async disconnect(): Promise<void> {
    console.log('MetaMaskAdapter.disconnect called');
    this.stopAccountsChangedListener();
    if (this.state !== AdapterState.Connected) {
      return;
    }
    this.setAddress(null);
    this.setScope(undefined);
    this.setState(AdapterState.Disconnect);
    this.emit('disconnect');
  }

  /**
   * Signs a transaction using the MetaMask wallet.
   * @param transaction - The transaction to sign.
   * @param privateKey - Optional private key (not recommended for production).
   * @returns A promise that resolves to the signed transaction.
   */
  async signTransaction(transaction: Transaction, privateKey?: string): Promise<SignedTransaction> {
    console.log('MetaMaskAdapter.signTransaction called', { transaction, privateKey });
    try {
      if (!this._scope) {
        throw new WalletDisconnectedError('Wallet not connected');
      }

      const txPb = tronweb.utils.transaction.txJsonToPb(transaction);
      const base64Transaction = Buffer.from(txPb.serializeBinary()).toString('base64');
      const result = await this.client.invokeMethod({
        scope: this._scope,
        request: {
          method: 'signTransaction',
          params: { transaction: base64Transaction, address: this._address! as TronAddress },
        },
      });

      return {
        ...transaction,
        signature: [result.signature],
      };
    } catch (error: any) {
      if (error instanceof Error || (typeof error === 'object' && error.message)) {
        throw new WalletSignTransactionError(error.message, error);
      }
      if (typeof error === 'string') {
        throw new WalletSignTransactionError(error, new Error(error));
      }
      throw new WalletSignTransactionError('Unknown error', error);
    }
  }

  /**
   * Signs a message using the MetaMask wallet.
   * @param message - The message to sign.
   * @param privateKey - Optional private key (not recommended for production).
   * @returns A promise that resolves to the signature.
   */
  async signMessage(message: string, privateKey?: string): Promise<string> {
    console.log('MetaMaskAdapter.signMessage called', { message, privateKey });
    try {
      if (!this._scope) {
        throw new WalletDisconnectedError('Wallet not connected');
      }

      const base64Message = Buffer.from(message).toString('base64');
      const result = await this.client.invokeMethod({
        scope: this._scope,
        request: {
          method: 'signMessage',
          params: { message: base64Message, address: this._address! as TronAddress },
        },
      });
      return result.signature;
    } catch (error: any) {
      if (error instanceof Error || (typeof error === 'object' && error.message)) {
        throw new WalletSignMessageError(error.message, error);
      }
      if (typeof error === 'string') {
        throw new WalletSignMessageError(error, new Error(error));
      }
      throw new WalletSignMessageError('Unknown error', error);
    }
  }

  /**
   * Switches the chain for the MetaMask wallet.
   * @param chainId - The chain ID to switch to.
   */
  async switchChain(chainId: string): Promise<void> {
    console.log('MetaMaskAdapter.switchChain called', { chainId });
    if (!this._scope) {
      throw new WalletDisconnectedError('Wallet not connected');
    }

    const newScope = chainIdToScope(chainId);
    if (newScope === this._scope) {
      return;
    }

    let session = await this.client.getSession();
    const sessionAccounts = session?.sessionScopes[newScope]?.accounts;
    if (sessionAccounts?.includes(`${newScope}:${this._address}`)) {
      this.setScope(newScope);
    } else {
      // Create session for the new scope
      await this.createSession(newScope, this.address ? [this.address] : undefined);
      session = await this.client.getSession();
      const sessionAccounts = session?.sessionScopes[newScope]?.accounts;
      if (!sessionAccounts?.includes(`${newScope}:${this._address}`)) {
        throw new WalletConnectionError('Failed to switch chain');
      }
      this.setScope(newScope);
    }
  }

  /**
   * Get network information used by MetaMask.
   * @returns {Network} Current network information.
   */
  async network(): Promise<Network> {
    console.log('MetaMaskAdapter.network called');
    try {
      if (this.state !== AdapterState.Connected || !this._scope) {
        throw new WalletDisconnectedError('Wallet not connected');
      }

      const chainId = scopeToChainId(this._scope);
      const networkType = scopeToNetworkType(this._scope);

      return {
        networkType,
        chainId,
        fullNode: '',
        solidityNode: '',
        eventServer: '',
      };
    } catch (e: any) {
      this.emit('error', e);
      throw e;
    }
  }

  /**
   * Listen for up to 2 seconds to the accountsChanged event emitted on page load.
   * @returns If any, the initial selected address.
   */
  protected getInitialSelectedAddress(): Promise<string | undefined> {
    console.log('MetaMaskAdapter.getInitialSelectedAddress called');
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(undefined);
      }, 2000);
      const handleAccountChange = (data: any) => {
        if (isAccountChangedEvent(data)) {
          const address = data?.params?.notification?.params?.[0];
          if (address) {
            clearTimeout(timeout);
            this.stopAccountsChangedListener();
            resolve(address);
          }
        }
      };
      this.startAccountsChangedListener(handleAccountChange);
    });
  }

  /**
   * Checks if the MetaMask wallet is available in the browser.
   * @returns A promise that resolves to true if the wallet is found.
   */
  private async checkWallet(): Promise<boolean> {
    console.log('MetaMaskAdapter.checkWallet called');
    const isConnected = await this.transport.isConnected();
    this._readyState = isConnected ? WalletReadyState.Found : WalletReadyState.NotFound;
    this.emit('readyStateChanged', this.readyState);
    return isConnected;
  }

  /**
   * Tries to restore an existing session.
   */
  private async tryRestoringSession(): Promise<void> {
    console.log('MetaMaskAdapter.tryRestoringSession called');
    try {
      const existingSession = await this.client.getSession();
      if (!existingSession) {
        return;
      }
      // Get the address from accountChanged emitted on page load, if any
      const address = await this.selectedAddressOnPageLoadPromise;
      const scope = this.restoreScope();
      this.updateSession(existingSession, scope, address);
    } catch (error) {
      console.warn('Error restoring session', error);
    }
  }

  /**
   * Creates a session for the specified scope.
   * @param scope - The TronScope to create the session for.
   * @param addresses - Optional list of addresses to include in the session.
   */
  private async createSession(scope: Scope, addresses?: string[]): Promise<void> {
    console.log('MetaMaskAdapter.createSession called', { scope, addresses });
    const session = await this.client.createSession({
      optionalScopes: {
        [scope]: {
          accounts: (addresses ? addresses.map((addr) => `${scope}:${addr}`) : []) as CaipAccountId[],
          methods: ['signTransaction', 'signMessage'],
          notifications: ['accountsChanged', 'chainChanged'],
        },
      },
      sessionProperties: {
        tron_accountsChanged_notifications: true,
      },
    });
    this.updateSession(session);
  }

  /**
   * Updates the session and the address to connect to.
   * This method handles the logic for selecting the appropriate Tron network scope
   * and address to connect to based on the following priority:
   * 1. First tries to find an available scope in order: previously selected scope > mainnet > shasta > nile
   * 2. For address selection:
   *    - First tries to use the selectedAddress param, most likely coming from
   *      the accountsChanged event
   *    - Falls back to the previously saved address if it exists in the scope
   *    - Finally defaults to the first address in the scope
   *
   * @param session - The session data containing available scopes and accounts
   * @param selectedAddress - The address that was selected by the user, if any
   */
  private updateSession(session: any, selectedScope?: Scope, selectedAddress?: string) {
    console.log('MetaMaskAdapter.updateSession called', { session, selectedScope, selectedAddress });
    // Get session scopes
    const sessionScopes = new Set(Object.keys(session?.sessionScopes ?? {}));

    // If a scope was previously selected, try to use it or find the first available scope in priority order: mainnet > shasta > nile
    const scopePriorityOrder = (selectedScope ? [selectedScope] : []).concat([Scope.MAINNET, Scope.SHASTA, Scope.NILE]);
    const scope = scopePriorityOrder.find((scope) => sessionScopes.has(scope));

    // If no scope is available, don't disconnect so that we can create/update a new session
    if (!scope) {
      this.setAddress(null);
      return;
    }
    const scopeAccounts = session?.sessionScopes[scope]?.accounts;
    // In case the Tron scope is available but without any accounts
    // Could happen if the user already created a session using ethereum injected provider for example or the SDK
    // Don't disconnect so that we can create/update a new session
    if (!scopeAccounts?.[0]) {
      this.setAddress(null);
      return;
    }
    let addressToConnect;
    // Try to use selectedAddress
    if (selectedAddress && scopeAccounts.includes(`${scope}:${selectedAddress}`)) {
      addressToConnect = selectedAddress;
    }
    // Otherwise try to use the previously saved address in this._address
    else if (this._address && scopeAccounts.includes(`${scope}:${this._address}`)) {
      addressToConnect = this._address;
    }
    // Otherwise select first address
    else {
      addressToConnect = getAddressFromCaipAccountId(scopeAccounts[0]);
    }
    // Update the address and scope
    this.setAddress(addressToConnect);
    this.setScope(scope);
  }

  /**
   * Starts listening to the accountsChanged event.
   * @param handler Optional custom handler for the event.
   */
  private startAccountsChangedListener(handler?: (data: any) => void) {
    console.log('MetaMaskAdapter.startAccountsChangedListener called');
    this.removeAccountsChangedListener = this.client.onNotification(
      handler ?? this.handleAccountsChangedEvent.bind(this),
    );
  }

  /**
   * Stops listening to the accountsChanged event.
   */
  private stopAccountsChangedListener() {
    console.log('MetaMaskAdapter.stopAccountsChangedListener called');
    this.removeAccountsChangedListener?.();
    this.removeAccountsChangedListener = undefined;
  }

  /**
   * Handles the accountsChanged event.
   * @param data - The event data
   */
  private async handleAccountsChangedEvent(data: any) {
    console.log('MetaMaskAdapter.handleAccountsChangedEvent called', { data });
    if (!isAccountChangedEvent(data)) {
      return;
    }
    const addressToSelect = data?.params?.notification?.params?.[0];
    if (!addressToSelect) {
      // Disconnect if no address selected
      await this.disconnect();
      return;
    }
    const session = await this.client.getSession();
    this.updateSession(session, this._scope, addressToSelect);
    // Emit accountsChanged if address changed
    if (this._address !== addressToSelect) {
      this.emit('accountsChanged', addressToSelect, this._address || '');
    }
  }

  /**
   * Sets the current address.
   * @param address - The address to set, or null if disconnected.
   */
  private setAddress(address: string | null) {
    console.log('MetaMaskAdapter.setAddress called', { address });
    this._address = address;
  }

  /**
   * Sets the adapter state and emits a state change event if necessary.
   * @param state - The new adapter state.
   */
  private setState(state: AdapterState) {
    console.log('MetaMaskAdapter.setState called', { state });
    const preState = this.state;
    if (state !== preState) {
      this._state = state;
      this.emit('stateChanged', state);
    }
  }

  /**
   * Sets the current scope.
   * @param scope - The new scope.
   */
  private setScope(scope?: Scope) {
    localStorage.setItem('metamaskAdapterScope', scope ?? '');
    this._scope = scope;

    if (!this._scope) {
      return;
    }

    const newChainId = scopeToChainId(this._scope);
    this.emit('chainChanged', { chainId: newChainId });
  }

  /**
   * Restores the scope from local storage.
   * @returns The restored scope, or undefined if not found.
   */
  private restoreScope(): Scope | undefined {
    const scope = localStorage.getItem('metamaskAdapterScope');
    return scope ? (scope as Scope) : undefined;
  }
}
