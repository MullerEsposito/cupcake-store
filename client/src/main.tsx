import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './presentation/App';
import { createStorefrontApi } from './infrastructure/storefront-api';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz não encontrado.');
const api = createStorefrontApi();
createRoot(root).render(<StrictMode><App api={api} /></StrictMode>);
