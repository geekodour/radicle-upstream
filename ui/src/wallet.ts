import { Readable } from "svelte/store";
import Web3 from "web3";
import WebsocketProvider from "web3-providers-ws";
import * as svelteStore from "svelte/store";

export enum Status {
  Connected = "CONNECTED",
  Connecting = "CONNECTING",
  NotConnected = "NOT_CONNECTED",
}

export type State =
  | { status: Status.NotConnected; error?: Error }
  | { status: Status.Connecting }
  | { status: Status.Connected; connected: Connected };

export interface Connected {
  account: {
    address: string;
    balance: string;
  };
}

export interface Wallet extends Readable<State> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  web3: Web3;
}

export function build(): Wallet {
  const stateStore = svelteStore.writable<State>({
    status: Status.NotConnected,
  });

  const provider = new WebsocketProvider("ws://localhost:8545");
  const web3 = new Web3(provider);

  initEthereumDebug(provider);

  // Connect to a wallet using walletconnect
  async function connect() {
    if (svelteStore.get(stateStore).status !== Status.NotConnected) {
      throw new Error("Already connected");
    }
  }

  async function initialize() {
    try {
      stateStore.set({ status: Status.Connecting });

      const accountAddresses = await web3.eth.getAccounts();
      const accountAddress = accountAddresses[0];
      if (!accountAddress) {
        throw Error("Wallet does not provide an account");
      }
      web3.eth.defaultAccount = accountAddress;
      const balance = await web3.eth.getBalance(accountAddress);
      const connected = {
        account: {
          address: accountAddress,
          balance: balance,
        },
      };
      stateStore.set({ status: Status.Connected, connected });
    } catch (error) {
      stateStore.set({ status: Status.NotConnected, error });
      throw error;
    }
  }

  initialize();

  return {
    subscribe: stateStore.subscribe,
    connect,
    async disconnect() {
      console.warn("Not implemented");
      return undefined;
    },
    web3,
  };
}

declare global {
  interface Window {
    ethereumDebug: any;
  }
}

function initEthereumDebug(provider: WebsocketProvider) {
  window.ethereumDebug = {
    // Tell the Ethereum development node to mine the given number of
    // blocks.
    async mineBlocks(blocks = 1) {
      while (blocks) {
        blocks -= 1;
        await mineBlock(provider);
      }
    },
  };
}

// Tell the Ethereum development node to mine a block.
async function mineBlock(provider: WebsocketProvider) {
  return new Promise((resolve, reject) => {
    provider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
      },
      (error, response) => {
        if (error) {
          reject(error);
        } else if (response && response.error) {
          // Types are incorrect
          const error = (response.error as unknown) as { message: string };
          throw new Error(error.message);
        } else {
          resolve();
        }
      }
    );
  });
}