export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const parseLocalDate = (d: string) => new Date(d.includes("T") ? d : `${d}T00:00:00`);

export const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = parseLocalDate(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export const daysUntil = (d?: string | null) => {
  if (!d) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (base: string, days: number) => {
  const d = parseLocalDate(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const addMonthsISO = (base: string, months: number) => {
  const d = parseLocalDate(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const addFrequencyISO = (
  base: string,
  amount: number,
  unit: "days" | "months"
) => (unit === "months" ? addMonthsISO(base, amount) : addDaysISO(base, amount));