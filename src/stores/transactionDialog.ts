import { defineStore } from 'pinia'
import type { Transaction } from '../types/api'

export const useTransactionDialogStore = defineStore('transactionDialog', {
  state: () => ({
    open: false,
    editing: null as Transaction | null,
    initialWalletId: null as number | null,
  }),

  actions: {
    openCreate(initialWalletId: number | null = null): void {
      this.editing = null
      this.initialWalletId = initialWalletId
      this.open = true
    },

    openEdit(transaction: Transaction): void {
      this.editing = transaction
      this.initialWalletId = null
      this.open = true
    },

    close(): void {
      this.open = false
      this.editing = null
      this.initialWalletId = null
    },
  },
})