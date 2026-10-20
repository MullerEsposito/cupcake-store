import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './presentation/App';
import { createStorefrontApi } from './infrastructure/storefront-api';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from 'styled-components';
import { theme } from './presentation/styles/theme';
import { GlobalStyle } from './presentation/styles/global';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz não encontrado.');
const api = createStorefrontApi();
createRoot(root).render(<StrictMode><ThemeProvider theme={theme}><GlobalStyle /><BrowserRouter><App api={api} /></BrowserRouter></ThemeProvider></StrictMode>);
