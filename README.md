# MetaMask Connect tron

This TypeScript module is maintained in the style of the MetaMask team.

## Installation

`yarn add @metamask/connect-tron`

or

`npm install @metamask/connect-tron`

or

`bun add @metamask/connect-tron`


## Adding to an existing app using tronwallet-adapter

If your application already uses [tronwallet-adapter](https://github.com/tronweb3/tronwallet-adapter), you can simply add this adapter to your existing list of adapters.

This adapter follows the default tronwallet adapter interface, so there is nothing specific to configure.

### Integration example

```ts
import { TronLinkAdapter } from 'tronwallet-adapter';
import { MetaMaskAdapter } from '@metamask/connect-tron';

const adapters = [
	new TronLinkAdapter(),
	new MetaMaskAdapter(), // Add MetaMask adapter
];

// Use the adapters list as usual in your app
```

You can now use MetaMask as a TRON wallet in your application without any further changes.

## Demo

```typescript
import { MetaMaskAdapter } from '@metamask/connect-tron';
import TronWeb from 'tronweb';

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': 'your api key' },
});

const adapter = new MetaMaskAdapter();
await adapter.connect();

// then you can get address
console.log(adapter.address);

// create a send TRX transaction
const unSignedTransaction = await tronWeb.transactionBuilder.sendTrx(targetAddress, 100, adapter.address);
// using adapter to sign the transaction
const signedTransaction = await adapter.signTransaction(unSignedTransaction);
// broadcast the transaction
await tronWeb.trx.sendRawTransaction(signedTransaction);
```

## Documentation

### API

The `MetaMaskAdapter` implements the standard TronWallet Adapter interface with the following properties and methods:

#### Properties

- `name`: The adapter name (`'MetaMask'`)
- `url`: MetaMask website URL
- `icon`: Base64 encoded icon data URL
- `readyState`: Current wallet ready state (`Loading`, `Found`, or `NotFound`)
- `state`: Current adapter state (`Disconnect` or `Connected`)
- `address`: Connected wallet address (or `null` if not connected)
- `connecting`: Boolean indicating if connection is in progress
- `connected`: Boolean indicating if wallet is connected (computed property)

#### Methods

##### `connect(options?: Record<string, unknown>): Promise<void>`
Connects to the MetaMask wallet.

```typescript
await adapter.connect();
```

##### `disconnect(): Promise<void>`
Disconnects from the wallet.

```typescript
await adapter.disconnect();
```

##### `signMessage(message: string): Promise<string>`
Signs a message with the connected wallet.

```typescript
const signature = await adapter.signMessage('Hello, TRON!');
```

##### `signTransaction(transaction: Transaction): Promise<SignedTransaction>`
Signs a transaction with the connected wallet.

```typescript
const signedTx = await adapter.signTransaction(unsignedTransaction);
```

##### `switchChain(chainId: string): Promise<void>`
Switches to a different blockchain network.

```typescript
await adapter.switchChain('0x2b6653dc'); // Mainnet
```

#### Not Supported

- `multiSign()`: Multi-signature operations are not supported by this adapter.

### Events

The adapter emits the following events:

- `connect`: Emitted when wallet is connected
- `disconnect`: Emitted when wallet is disconnected
- `accountsChanged`: Emitted when the active account changes
- `chainChanged`: Emitted when the network/chain changes
- `readyStateChanged`: Emitted when the wallet's ready state changes
- `stateChanged`: Emitted when the adapter state changes
- `error`: Emitted when an error occurs


