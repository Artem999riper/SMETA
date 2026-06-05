import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Справочники
  spravochniki: {
    list: () => ipcRenderer.invoke('spravochniki:list'),
    get: (id: number) => ipcRenderer.invoke('spravochniki:get', id),
    create: (data: unknown) => ipcRenderer.invoke('spravochniki:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('spravochniki:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('spravochniki:delete', id),
  },
  glavy: {
    list: (spravochnikId: number) => ipcRenderer.invoke('glavy:list', spravochnikId),
    create: (data: unknown) => ipcRenderer.invoke('glavy:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('glavy:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('glavy:delete', id),
  },
  tablicy: {
    list: (glavaId: number) => ipcRenderer.invoke('tablicy:list', glavaId),
    create: (data: unknown) => ipcRenderer.invoke('tablicy:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('tablicy:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tablicy:delete', id),
  },
  pozicii: {
    list: (tablicaId: number) => ipcRenderer.invoke('pozicii:list', tablicaId),
    search: (query: string) => ipcRenderer.invoke('pozicii:search', query),
    create: (data: unknown) => ipcRenderer.invoke('pozicii:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('pozicii:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('pozicii:delete', id),
  },
  koefficienty: {
    list: () => ipcRenderer.invoke('koefficienty:list'),
    create: (data: unknown) => ipcRenderer.invoke('koefficienty:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('koefficienty:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('koefficienty:delete', id),
  },
  indeksy: {
    list: () => ipcRenderer.invoke('indeksy:list'),
    create: (data: unknown) => ipcRenderer.invoke('indeksy:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('indeksy:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('indeksy:delete', id),
  },
  // Проекты и сметы
  proekty: {
    list: () => ipcRenderer.invoke('proekty:list'),
    create: (data: unknown) => ipcRenderer.invoke('proekty:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('proekty:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('proekty:delete', id),
  },
  smety: {
    listByProekt: (proektId: number) => ipcRenderer.invoke('smety:listByProekt', proektId),
    get: (id: number) => ipcRenderer.invoke('smety:get', id),
    create: (data: unknown) => ipcRenderer.invoke('smety:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('smety:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('smety:delete', id),
  },
  smetaPozicii: {
    list: (smetaId: number) => ipcRenderer.invoke('smeta_pozicii:list', smetaId),
    add: (data: unknown) => ipcRenderer.invoke('smeta_pozicii:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('smeta_pozicii:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('smeta_pozicii:delete', id),
    reorder: (smetaId: number, orderedIds: number[]) => ipcRenderer.invoke('smeta_pozicii:reorder', smetaId, orderedIds),
  },
  poziciyaKoefficienty: {
    set: (smetaPoziciyaId: number, koeffIds: number[]) => ipcRenderer.invoke('poziciya_koefficienty:set', smetaPoziciyaId, koeffIds),
  },
  // Импорт
  import: {
    openFileDialog: () => ipcRenderer.invoke('import:openFileDialog'),
    readFile: (filePath: string) => ipcRenderer.invoke('import:readFile', filePath),
    savePozicii: (data: unknown) => ipcRenderer.invoke('import:savePozicii', data),
    writeFile: (filePath: string, base64Data: string) => ipcRenderer.invoke('import:writeFile', filePath, base64Data),
  },
  // Экспорт
  export: {
    saveDialog: (defaultName: string, type: 'xlsx' | 'pdf') => ipcRenderer.invoke('export:saveDialog', defaultName, type),
    writeFile: (filePath: string, base64Data: string) => ipcRenderer.invoke('export:writeFile', filePath, base64Data),
    getSmetaData: (smetaId: number) => ipcRenderer.invoke('export:getSmetaData', smetaId),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
