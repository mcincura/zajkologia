import React, { useState } from 'react';
import DisclaimerModal from './DisclaimerModal';
import { FaInstagram, FaFacebook, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    return (
      <footer
        style={{
          backgroundColor: "var(--color-dark)",
          color: "var(--color-white)",
          padding: "3rem 0",
          marginTop: "auto",
        }}
      >
        <div className="container" style={{ textAlign: "center" }}>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
              <a href="https://www.instagram.com/zajkologia" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <FaInstagram size={28} color="var(--color-secondary)" style={{ transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--color-secondary)'} />
              </a>
              <a href="mailto:kontakt@zajkologia.com" aria-label="Email">
                  <FaEnvelope size={28} color="var(--color-secondary)" style={{ transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--color-secondary)'} />
              </a>
              <a href="https://www.facebook.com/share/181hadDk7u/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <FaFacebook size={28} color="var(--color-secondary)" style={{ transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--color-secondary)'} />
              </a>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Zajkológia Blog. Všetky práva
            vyhradené.
          </p>
          <p style={{ marginTop: "0.5rem", opacity: 0.7, fontSize: "0.9rem" }}>
            Powered by hay, love and binkies.
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            <Link
              to="/obchodne-podmienky"
              style={{
                color: "var(--color-white)",
                textDecoration: "underline",
                marginRight: "1rem",
              }}
            >
              Obchodné podmienky
            </Link>
            <button
              onClick={() => setShowDisclaimer(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-white)",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="Právne upozornenie"
            >
              UPOZORNENIE
            </button>
          </p>
        </div>
        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
        />
      </footer>
    );
};

export default Footer;
