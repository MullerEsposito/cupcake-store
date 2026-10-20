import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AddressInput, PostalAddress, StorefrontApi } from '../../../contracts/storefront';
import { errorMessage } from '../../error-message';
import { Container } from './styles';
import { brazilianStates } from '../../../contracts/brazilian-states';

const fields = [
  ['recipient', 'Destinatário', 150], ['postalCode', 'CEP', 9], ['street', 'Logradouro', 200], ['number', 'Número', 20],
  ['complement', 'Complemento (opcional)', 150], ['district', 'Bairro', 100]
] as const;
const empty: AddressInput = { recipient: '', postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' };
const automatic = ['street', 'district', 'city', 'state'] as const;

export function applyPostalAddress(current: AddressInput, snapshot: AddressInput, resolved: PostalAddress): AddressInput {
  const next = { ...current };
  for (const field of automatic) if (current[field] === snapshot[field]) next[field] = resolved[field];
  return next;
}

export function AddressForm({ api, busy, onSave }: {
  api: Pick<StorefrontApi, 'lookupPostalCode' | 'cities'>; busy: boolean; onSave(input: AddressInput): Promise<void>;
}) {
  const [input, setInput] = useState(empty);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [citiesAttempt, setCitiesAttempt] = useState(0);
  const values = useRef(input);
  values.current = input;
  const previous = useRef<PostalAddress | null>(null);
  const postalCode = input.postalCode.replace('-', '');
  useEffect(() => {
    setVerified('');
    setMessage('');
    setLoading(false);
    if (!/^\d{8}$/.test(postalCode)) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const snapshot = { ...values.current };
      api.lookupPostalCode(postalCode, controller.signal).then(address => {
        if (!active) return;
        previous.current = address;
        setInput(current => applyPostalAddress(current, snapshot, address));
        setVerified(postalCode);
        setMessage('CEP localizado. Confira os campos e informe o número. Entrega e frete gratuitos em todo o Brasil, apenas na simulação.');
      }).catch(error => {
        if (active) setMessage(errorMessage(error));
      }).finally(() => { if (active) setLoading(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [api, postalCode, attempt]);

  useEffect(() => {
    setCities([]);
    setCitiesError('');
    setCitiesLoading(false);
    if (!input.state) return;
    const controller = new AbortController();
    let active = true;
    setCitiesLoading(true);
    api.cities(input.state, controller.signal).then(options => {
      if (active) setCities(options);
    }).catch(error => { if (active) setCitiesError(errorMessage(error)); })
      .finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [api, input.state, citiesAttempt]);

  const matchingPostalCode = verified === postalCode && previous.current?.state === input.state
    && previous.current?.city === input.city;

  function change(field: keyof AddressInput, value: string) {
    setInput(current => {
      const next = { ...current, [field]: value };
      if (field === 'postalCode' && value.replace('-', '') !== current.postalCode.replace('-', '')) {
        for (const key of automatic) if (previous.current && current[key] === previous.current[key]) next[key] = '';
      }
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !/^\d{8}$/.test(postalCode) || !matchingPostalCode) return;
    await onSave(input);
  }
  return <Container onSubmit={event => { void submit(event); }} aria-busy={loading}>
    <fieldset disabled={busy}><legend>Novo endereço de entrega</legend>
      <p>Digite o CEP para consultar o ViaCEP. Nenhum nome ou número de residência é enviado ao serviço.</p>
      <div className="address-fields">{fields.map(([field, label, maximum]) => <label key={field}>{label}
        <input name={field} value={input[field] ?? ''} maxLength={maximum} required={field !== 'complement'}
          onChange={event => change(field, event.target.value)}
          inputMode={field === 'postalCode' ? 'numeric' : 'text'}
          pattern={field === 'postalCode' ? '[0-9]{5}-?[0-9]{3}' : undefined} />
      </label>)}
        <label>UF<select name="state" required value={input.state} onChange={event => {
          const state = event.target.value;
          setInput(current => ({ ...current, state, city: '' }));
        }}>
          <option value="">Selecione a UF</option>
          {brazilianStates.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
        </select></label>
        <label>Cidade<select name="city" required disabled={!input.state || citiesLoading} value={input.city}
          onChange={event => change('city', event.target.value)}>
          <option value="">{citiesLoading ? 'Carregando cidades…' : 'Selecione a cidade'}</option>
          {input.city && !cities.some(city => city.name === input.city)
            && <option value={input.city}>{input.city} (CEP)</option>}
          {previous.current?.state === input.state && previous.current.city !== input.city
            && !cities.some(city => city.name === previous.current?.city)
            && <option value={previous.current.city}>{previous.current.city} (CEP)</option>}
          {cities.map(city => <option key={city.id} value={city.name}>{city.name}</option>)}
        </select></label>
      </div>
      {citiesError && <p role="alert">{citiesError} <button className="detail-button" type="button"
        disabled={citiesLoading} onClick={() => setCitiesAttempt(value => value + 1)}>Recarregar cidades</button></p>}
      {verified && !matchingPostalCode && <p role="alert">Cidade e UF precisam corresponder ao CEP. Confira a seleção ou consulte o CEP novamente.</p>}
      <div className="lookup"><button className="button outline" type="button" disabled={loading || !/^\d{8}$/.test(postalCode)} onClick={() => setAttempt(value => value + 1)}>Consultar CEP novamente</button>
        <button className="button primary" type="submit" disabled={loading || !/^\d{8}$/.test(postalCode) || !matchingPostalCode}>Salvar endereço</button></div>
      <p role="status" aria-live="polite">{loading ? 'Consultando CEP…' : message}</p>
      <p className="hint">CEPs gerais podem não informar rua e bairro: complete-os manualmente. Se a consulta estiver indisponível, tente novamente para salvar; endereços já cadastrados continuam disponíveis.</p>
    </fieldset>
  </Container>;
}
