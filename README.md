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
import { MetamaskTronAdapter } from '@metamask/connect-tron';

const adapters = [
	new TronLinkAdapter(),
	new MetamaskTronAdapter(), // Add MetaMask adapter
];

// Use the adapters list as usual in your app
```

You can now use MetaMask as a TRON wallet in your application without any further changes.
