import { useEffect } from 'react';
import { useLocation } from 'react-router';

const pageTitles: Record<string, string> = { '/': 'Início', '/produtos': 'Nossos cupcakes', '/carrinho': 'Meu carrinho', '/sobre': 'Nossa essência', '/entrar': 'Minha conta', '/checkout': 'Finalizar pedido', '/pedidos': 'Meus pedidos', '/administracao': 'Administração' };

export function PageNavigation() {
  const location = useLocation();
  useEffect(() => {
    document.title = (pageTitles[location.pathname] ?? (location.pathname.startsWith('/pedidos/') ? 'Resumo do pedido' : location.pathname.startsWith('/produtos/') ? 'Detalhes do produto' : 'Página não encontrada')) + ' · CupCake Store';
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  }, [location.pathname]);
  return null;
}
