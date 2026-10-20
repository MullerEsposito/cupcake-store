import type { PublicUser } from '../../contracts/storefront';

export function Header({ user, loading, cartCount, onLogin, onLogout }: {
  user: PublicUser | null; loading: boolean; cartCount: number; onLogin(): void; onLogout(): void;
}) {
  return <>
    <a className="skip" href="#catalogo">Ir para o catálogo</a>
    <div className="announcement">Feito com carinho, para os seus pequenos grandes momentos.</div>
    <header className="header wrap">
      <a className="brand" href="/" aria-label="CupCake Store, início">
        <span className="brand-icon">c.</span>
        <span>
          CupCake
          <span className="brand-small">STORE</span>
        </span>
      </a>
      <nav aria-label="Navegação principal">
        <a href="#catalogo">Nossos cupcakes</a>
        <a href="#sobre">Nossa essência</a>
      </nav>
      <div className="account">
        <a className="cart-shortcut" href="#carrinho">Carrinho ({cartCount})</a>
        {user && <a className="cart-shortcut" href="#pedidos">Meus pedidos</a>}
        {user?.role === 'ADMIN' && <a className="cart-shortcut" href="#administracao">Administração</a>}
        {user
          ? <><span id="greeting">Olá, {user.name.split(' ')[0]}!</span><button className="button outline" disabled={loading} onClick={onLogout}>Sair</button></>
          : <button className="button outline" disabled={loading} onClick={onLogin}>Entrar / Cadastrar</button>}
      </div>
    </header>
  </>;
}

export function Hero() {
  return <>
  <section className="hero wrap" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="eyebrow"><span />PEQUENAS DELÍCIAS. GRANDES MOMENTOS.</p>
      <h1 id="hero-title">Um carinho<br />em forma de <em>cupcake.</em></h1>
      <p className="hero-description">
        Sabores que abraçam, detalhes que encantam.
        <br />Encontre o seu favorito e deixe o dia mais doce.
      </p>
      <a className="button primary" href="#catalogo">
        Conhecer os sabores <span aria-hidden="true">↗</span></a><div className="hero-note"><span aria-hidden="true">✧</span> Preparados com cuidado, em cada detalhe.</div></div>
    <div className="hero-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><div className="art-label">uma pausa<br /><em>mais doce.</em></div><img src="/cupcake.svg" alt="Ilustração de um cupcake com cobertura rosa e uma cereja" width="480" height="480" /><div className="art-stamp">FEITO COM<br /><span>amor</span><br />E UM TOQUE DE DOÇURA</div></div>
  </section>
  <div className="benefits">
    <div className="wrap">
      <span>✧ Sabores que surpreendem</span>
      <span>♡ Cuidado em cada detalhe</span>
      <span>✦ Do seu jeito, no seu momento</span>
    </div>
  </div>
</>;
}

export function Footer() {
  return <>
    <section id="sobre" className="about wrap">
      <span className="about-mark" aria-hidden="true">♡</span>
      <div>
        <p className="eyebrow">NOSSA ESSÊNCIA</p>
        <h2>Mais do que um doce.<br />Um pequeno gesto de carinho.</h2>
        <p>
          A CupCake Store nasceu para transformar uma pausa na rotina em um momento especial. Descubra sabores e escolha o que combina com você.
        </p>
      </div>
    </section>
    <div className="project-note wrap">
      <strong>Protótipo acadêmico · PIT II</strong>
      <span>Sprint 4: acompanhamento de pedidos e painel administrativo. Pagamentos exclusivamente simulados.</span>
    </div>
    <footer className="wrap">
      <a className="brand footer-brand" href="/">CupCake Store</a>
      <span>Feito para adoçar seus dias.</span>
      <small>Projeto Integrador Transdisciplinar em SI</small>
    </footer>
  </>;
}
