import { ref } from 'vue'

const dataVersion = ref(0)

export function notifyDataChanged(): void {
  dataVersion.value += 1
}

export function useDataVersion() {
  return { dataVersion }
}