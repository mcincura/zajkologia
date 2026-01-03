import React, { useState } from 'react';
import DisclaimerModal from './DisclaimerModal';

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
          <p>
            &copy; {new Date().getFullYear()} Zajkológia Blog. Všetky práva
            vyhradené.
          </p>
          <p style={{ marginTop: "0.5rem", opacity: 0.7, fontSize: "0.9rem" }}>
            Powered by hay, love and binkies.
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
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
