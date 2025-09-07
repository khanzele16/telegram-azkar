export function getLocalDateFromUTC(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toISOString().slice(0, 10);
}