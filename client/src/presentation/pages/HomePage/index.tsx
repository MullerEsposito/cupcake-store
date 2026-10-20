import { Link } from 'react-router';
import { Container } from './styles';

export function HomePage() {
  return <Container>
  <section className="hero wrap" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="eyebrow"><span />PEQUENAS DELÍCIAS. GRANDES MOMENTOS.</p>
      <h1 id="hero-title">Um carinho<br />em forma de <em>cupcake.</em></h1>
      <p className="hero-description">
        Sabores que abraçam, detalhes que encantam.
        <br />Encontre o seu favorito e deixe o dia mais doce.
      </p>
      <Link className="button primary" to="/produtos">
        Conhecer os sabores <span aria-hidden="true">↗</span></Link><div className="hero-note"><span aria-hidden="true">✧</span> Preparados com cuidado, em cada detalhe.</div></div>
    <div className="hero-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><div className="art-label">uma pausa<br /><em>mais doce.</em></div><img src="/cupcake.svg" alt="Ilustração de um cupcake com cobertura rosa e uma cereja" width="480" height="480" /><div className="art-stamp">FEITO COM<br /><span>amor</span><br />E UM TOQUE DE DOÇURA</div></div>
  </section>
  <div className="benefits">
    <div className="wrap">
      <span>✧ Sabores que surpreendem</span>
      <span>♡ Cuidado em cada detalhe</span>
      <span>✦ Do seu jeito, no seu momento</span>
    </div>
  </div>
</Container>;
}
