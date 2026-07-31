import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/club-coming-soon.css';

const ClubComingSoon = () => (
  <section className="club-coming-soon" aria-labelledby="club-coming-soon-title">
    <div className="club-coming-soon__card">
      <div className="club-coming-soon__copy">
        <p className="club-coming-soon__eyebrow">
          <Sparkles aria-hidden="true" size={18} strokeWidth={2} />
          Zajkológia Klub
        </p>

        <h1 id="club-coming-soon-title">Klub pre vás práve pripravujeme</h1>
        <p className="club-coming-soon__lead">
          Plníme ho článkami, videami, príručkami a ďalším obsahom pre spokojný
          život s králikmi.
        </p>

        <div className="club-coming-soon__notice" role="status">
          <strong>Členstvo ani platby zatiaľ nie sú spustené.</strong>
          <span>Keď bude klub pripravený, dozviete sa to na tejto stránke.</span>
        </div>

        <Link className="club-coming-soon__back" to="/">
          <ArrowLeft aria-hidden="true" size={19} strokeWidth={2.3} />
          Späť na hlavnú stránku
        </Link>
      </div>

      <div className="club-coming-soon__visual" aria-hidden="true">
        <span className="club-coming-soon__halo" />
        <img src="/club-rabbit-book.png" width="720" height="788" alt="" />
      </div>
    </div>
  </section>
);

export default ClubComingSoon;
