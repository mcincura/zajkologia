import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { aboutContent } from '../data/about';
import '../styles/about.css';

const About = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container about-hero__inner">
          <div className="about-hero__copy">
            <p className="about-eyebrow">{aboutContent.eyebrow}</p>
            <h1>{aboutContent.title}</h1>
            <p className="about-hero__lead">{aboutContent.lead}</p>
            <p>{aboutContent.intro}</p>
            <div className="about-actions">
              <Link className="about-button about-button--primary" to="/?category=Produkty">
                Pozrieť príručky
                <ArrowRight size={17} strokeWidth={2.4} />
              </Link>
              <a className="about-button about-button--ghost" href="mailto:kontakt@zajkologia.com">
                <Mail size={16} strokeWidth={2.2} />
                Napísať mi
              </a>
            </div>
          </div>

          <div className="about-hero__portrait" aria-label="Zajkológia">
            <img src="/zajo.png" alt="Logo Zajkológia" loading="eager" decoding="async" />
          </div>
        </div>
      </section>

      <div className="container about-page__content">
        <section className="about-story" aria-label="Príbeh Zajkológie">
          <div className="about-story__text">
            <p>{aboutContent.mission}</p>
            <p>{aboutContent.approach}</p>
            <p>{aboutContent.closing}</p>
          </div>
        </section>

        <section className="about-values" aria-labelledby="about-values-title">
          <div>
            <p className="about-eyebrow">Na čom mi záleží</p>
            <h2 id="about-values-title">Hodnoty Zajkológie</h2>
          </div>
          <div className="about-values__list">
            {aboutContent.values.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
        </section>

        <section className="about-process" aria-labelledby="about-process-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">Ako tvorím obsah</p>
            <h2 id="about-process-title">Odborne, zrozumiteľne a prakticky</h2>
          </div>

          <div className="about-process__grid">
            {aboutContent.process.map((item, index) => {
              const icons = [BookOpen, ShieldCheck, HeartHandshake];
              const Icon = icons[index] || CheckCircle2;
              return (
                <article className="about-process__item" key={item.title}>
                  <Icon size={22} strokeWidth={2.2} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-credential" aria-labelledby="about-credential-title">
          <div className="about-credential__icon" aria-hidden="true">
            <GraduationCap size={28} strokeWidth={2.1} />
          </div>
          <div>
            <p className="about-eyebrow">Vzdelávanie</p>
            <h2 id="about-credential-title">Rabbit Care, Behaviour and Welfare Diploma Course</h2>
            <p>{aboutContent.diploma}</p>
          </div>
        </section>

        <section className="about-certificate" aria-labelledby="about-certificate-title">
          <div className="about-certificate__copy">
            <div className="about-credential__icon" aria-hidden="true">
              <Award size={28} strokeWidth={2.1} />
            </div>
            <div>
              <p className="about-eyebrow">Certifikát</p>
              <h2 id="about-certificate-title">{aboutContent.certificate.title}</h2>
              <p>
                Certifikát od {aboutContent.certificate.issuer} s hodnotením{' '}
                <strong>{aboutContent.certificate.result}</strong>, vydaný {aboutContent.certificate.date}.
              </p>
              <a
                className="about-button about-button--primary"
                href={aboutContent.certificate.pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                Zobraziť certifikát
                <ExternalLink size={16} strokeWidth={2.3} />
              </a>
            </div>
          </div>
          <a
            className="about-certificate__preview"
            href={aboutContent.certificate.pdfUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Zobraziť certifikát ${aboutContent.certificate.title}`}
          >
            <img
              src={aboutContent.certificate.previewImage}
              alt={`Certifikát ${aboutContent.certificate.title}`}
              loading="lazy"
              decoding="async"
            />
          </a>
        </section>

        <section className="about-note" aria-label="Veterinárne upozornenie">
          <ShieldCheck size={22} strokeWidth={2.1} />
          <p>{aboutContent.disclaimer}</p>
        </section>
      </div>
    </div>
  );
};

export default About;
