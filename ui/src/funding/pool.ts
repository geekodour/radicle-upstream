import { writable } from "svelte/store";
import { PoolFactory } from "radicle-contracts/build/contract-bindings/ethers/PoolFactory";
import { Pool as PoolContract } from "radicle-contracts/contract-bindings/ethers/Pool";
import * as validation from "../validation";

import { Wallet } from "../wallet";
import * as remote from "../remote";
import { BigNumberish } from "ethers";

export const store = writable<Pool | null>(null);

export interface Pool {
  data: remote.Store<PoolData>;

  // Update the contribution amount per block. Returns once the
  // transaction has been included in the chain.
  updateAmountPerBlock(amountPerBlock: string): Promise<void>;

  // Update the list of receiver addresses. Returns once the
  // transaction has been included in the chain.
  updateReceiverAddresses(addresses: string[]): Promise<void>;

  // Adds funds to the pool. Returns once the transaction has been
  // included in the chain.
  topUp(value: number): Promise<void>;
  // Collect funds the user has received up to now from givers and
  // transfer them to the users account.
  collect(): Promise<void>;
}

// The pool settings the user can change and save.
export interface PoolSettings {
  // The total amount to be disbursed to all receivers with each block.
  amountPerBlock: string;
  // The list of addresses that receive funds from the pool.
  receiverAddresses: string[];
}

// All the data representing a pool.
export interface PoolData {
  // The remaining balance of this pool.
  balance: number;
  // The total amount to be disbursed to all receivers with each block.
  amountPerBlock: string;
  // The list of addresses that receive funds from the pool.
  receiverAddresses: string[];
  // Funds that the user can collect from their givers.
  collectableFunds: number;
}

export function make(wallet: Wallet): Pool {
  const data = remote.createStore<PoolData>();
  const address = "0x0e22b57c7e69d1b62c9e4c88bb63b0357a905d1e";

  const poolContract: PoolContract = PoolFactory.connect(
    address,
    wallet.signer
  );

  loadPoolData();

  async function loadPoolData() {
    try {
      const balance = await poolContract.withdrawable();
      const collectableFunds = await poolContract.collectable();
      const amountPerBlock = await poolContract.getAmountPerBlock();
      const receivers = await poolContract.getAllReceivers();
      const receiverAddresses = receivers.map(r => r.receiver);

      data.success({
        // Handle potential overflow using BN.js
        balance: Number(balance),
        amountPerBlock: amountPerBlock.toString(),
        receiverAddresses,
        // Handle potential overflow using BN.js
        collectableFunds: Number(collectableFunds),
      });
    } catch (error) {
      data.error(error);
    }
  }

  async function updateAmountPerBlock(
    amountPerBlock: BigNumberish
  ): Promise<void> {
    // TODO only update the settings that need changes. In particular
    // only update members that have been added or removed
    await poolContract
      .setAmountPerBlock(amountPerBlock)
      .then(tx => tx.wait())
      .finally(loadPoolData);
  }

  async function updateReceiverAddresses(addresses: string[]): Promise<void> {
    // TODO only update the settings that need changes. In particular
    // only update members that have been added or removed
    const txs = addresses.map(address =>
      poolContract.setReceiver(address, 1).then(tx => tx.wait())
    );

    // TODO check transaction status
    await Promise.all(txs).finally(loadPoolData);
  }

  async function topUp(value: number): Promise<void> {
    const tx = await poolContract.topUp({
      gasLimit: 200 * 1000,
      value,
    });
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${receipt.transactionHash}`);
    }
    loadPoolData();
  }

  async function collect(): Promise<void> {
    const tx = await poolContract.collect();
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error(`Transaction reverted: ${receipt.transactionHash}`);
    }
    loadPoolData();
  }

  return {
    data,
    updateAmountPerBlock,
    updateReceiverAddresses,
    topUp,
    collect,
  };
}

/**
 * Stores
 */
export const membersStore = writable("");
export const amountStore = writable("");

/**
 *
 * Validations
 *
 */

// Patterns
const COMMA_SEPARATED_LIST = /(^[-\w\s]+(?:,[-\w\s]*)*$)?/;

const contraints = {
  // The contraints for a valid input list of members.
  members: {
    format: {
      pattern: COMMA_SEPARATED_LIST,
      message: `Should be a comma-separated list of addresses`,
    },
  },

  // The contraints for a valid amount input.
  amount: {
    presence: {
      message: "The amount is required",
      allowEmpty: false,
    },
    numericality: {
      strict: true,
      greaterThan: 0,
    },
  },
};

export const membersValidationStore: validation.ValidationStore = validation.createValidationStore(
  contraints.members
);

export const amountValidationStore: validation.ValidationStore = validation.createValidationStore(
  contraints.amount
);