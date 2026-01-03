import React from 'react';

const DisclaimerModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h2 style={{ textAlign: 'center', width: '100%' }}>Právne upozornenie</h2>
          <div style={{ textAlign: 'justify', width: '100%' }}>
            <p style={{ fontSize: "0.95rem", marginBottom: "1rem", color: "#333" }}>
              Všetky informácie uvedené na tomto blogu vychádzajú zo skúseností,
              vedomostí a názorov nášho tímu, ako aj z verejne dostupných zdrojov.
              Snažíme sa poskytovať obsah, ktorý je čo najpresnejší a užitočný, no
              nenahrádza odborné vyšetrenie.
            </p>
            <p style={{ fontSize: "0.95rem", marginBottom: "1rem", color: "#333" }}>
              Informácie na blogu slúžia výlučne na edukačné účely a ako všeobecné
              odporúčania. Nenahrádzajú odbornú konzultáciu ani návštevu
              veterinárneho lekára.
            </p>
            <p style={{ fontSize: "0.95rem", marginBottom: "1rem", color: "#333" }}>
              Za zdravotný stav vašich zvieratiek nenesieme žiadnu zodpovednosť. V
              prípade akýchkoľvek zdravotných problémov alebo pochybností
              odporúčame obrátiť sa na kvalifikovaného veterinárneho špecialistu.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              background: "var(--color-dark)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              alignSelf: 'center',
            }}
          >
            Zavrieť
          </button>
        </div>
      </div>
    );
};

export default DisclaimerModal;
