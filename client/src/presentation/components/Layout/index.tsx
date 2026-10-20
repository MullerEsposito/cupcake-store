import type { PublicUser } from '../../../contracts/storefront';
import { Link, NavLink } from 'react-router';
import { Container, FooterContainer } from './styles';

export function Header({ user, loading, cartCount, onLogout }: {
  user: PublicUser | null; loading: boolean; cartCount: number; onLogout(): void;
}) {
  return <Container>
    <a className="skip" href="#conteudo">Ir para o conteúdo</a>
    <div className="announcement">Feito com carinho, para os seus pequenos grandes momentos.</div>
    <header className="header wrap">
      <Link className="brand" to="/" aria-label="CupCake Store, início"><span className="brand-icon">c.</span><span>CupCake<span className="brand-small">STORE</span></span></Link>
      <nav aria-label="Navegação principal">
        <NavLink to="/" end>Início</NavLink><NavLink to="/produtos">Nossos cupcakes</NavLink><NavLink to="/sobre">Nossa essência</NavLink>
      </nav>
      <div className="account">
        <NavLink className="cart-shortcut" to="/carrinho">Carrinho ({cartCount})</NavLink>
        {user && <NavLink to="/pedidos">Meus pedidos</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/administracao">Administração</NavLink>}
        {user ? <><span id="greeting">Olá, {user.name.split(' ')[0]}!</span><button className="button outline" disabled={loading} onClick={onLogout}>Sair</button></>
          : <Link className="button outline" to="/entrar">Entrar / Cadastrar</Link>}
      </div>
    </header>
  </Container>;
}

export function Footer() {
  return <FooterContainer><div className="project-note wrap"><strong>Protótipo acadêmico · PIT II</strong><span>Pagamentos, estornos e entregas exclusivamente simulados. Nenhuma cobrança real.</span></div>
    <footer className="wrap"><Link className="brand" to="/">CupCake Store</Link><Link to="/sobre">Feito para adoçar seus dias.</Link><small>Projeto Integrador Transdisciplinar em SI</small></footer>
  </FooterContainer>;
}
