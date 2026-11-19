/** pourcentage lisible : « 4,63 % », « < 0,01 % », « 100 % » */
export function pourcent(p: number, langue: string): string {
  if (p > 1 - 1e-9) return "100 %";
  const x = p * 100;
  if (x === 0) return "0 %";
  if (x < 0.01) return `< ${(0.01).toLocaleString(langue)} %`;
  if (x > 99.99 && x < 100) return `> ${(99.99).toLocaleString(langue)} %`;
  const chiffres = x >= 10 ? 1 : 2;
  return `${x.toLocaleString(langue, { minimumFractionDigits: chiffres, maximumFractionDigits: chiffres })} %`;
}

export const nombre = (x: number, langue: string, d = 2) =>
  x.toLocaleString(langue, { minimumFractionDigits: 0, maximumFractionDigits: d });
