const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(value: string | number): string {
  const decimal = typeof value === 'number' ? value.toFixed(2) : value;
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(decimal)) return '—';
  const [whole, fraction = '00'] = decimal.split('.');
  return formatter.formatToParts(BigInt(whole))
    .map(part => part.type === 'fraction' ? fraction.padEnd(2, '0') : part.value).join('');
}
