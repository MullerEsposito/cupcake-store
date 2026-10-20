const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPrice = (value: string | number) => formatter.format(Number(value));
