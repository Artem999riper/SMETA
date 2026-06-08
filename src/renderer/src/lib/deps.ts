// Robust dynamic-import interop for CommonJS/ESM libraries.
// `xlsx` ships named exports with no `default`, while `jspdf` exposes both a
// named `jsPDF` and a default. These helpers normalize the differences so the
// rest of the app doesn't crash on `undefined`.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as XLSXType from 'xlsx'

export async function loadXlsx(): Promise<typeof XLSXType> {
  const mod: any = await import('xlsx')
  return (mod.default ?? mod) as typeof XLSXType
}

export async function loadJsPdf(): Promise<any> {
  const mod: any = await import('jspdf')
  return mod.jsPDF ?? mod.default ?? mod
}

export async function loadAutoTable(): Promise<any> {
  const mod: any = await import('jspdf-autotable')
  return mod.default ?? mod
}
