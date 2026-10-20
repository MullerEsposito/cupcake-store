import { Link } from 'react-router';
import { Container } from './styles';

export function AboutPage() {
  return <Container><section className="about wrap" aria-labelledby="about-title">
    <span className="about-mark" aria-hidden="true">♡</span>
    <div><p className="eyebrow">NOSSA ESSÊNCIA</p><h1 id="about-title">Mais do que um doce.<br />Um pequeno gesto de carinho.</h1>
      <p>A CupCake Store nasceu para transformar uma pausa na rotina em um momento especial. Descubra sabores e escolha o que combina com você.</p>
      <p>Este é um projeto acadêmico do PIT II. Compras, pagamentos, estornos e entregas são demonstrações, sem movimentação financeira real.</p>
      <Link className="button primary" to="/produtos">Escolher meu cupcake</Link>
    </div>
  </section></Container>;
}
