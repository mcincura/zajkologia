import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { products } from '../data/products';

const ProductDetails = () => {
  const { slug } = useParams();
  const location = useLocation();
  const backTo = location.state?.from || '/';

  const product = useMemo(
    () => products.find((item) => item.slug === slug),
    [slug]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Produkt nebol nájdený 🥕</h2>
        <Link
          to={backTo}
          style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
        >
          Späť na produkty
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <Link
        to={backTo}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "1.5rem",
          marginLeft: "0.25rem",
          marginBottom: "2rem",
          color: "#666",
        }}
      >
        <ArrowLeft size={20} /> Späť na produkty
      </Link>

      <article style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2.5rem",
            alignItems: "flex-start",
            marginBottom: "2.5rem",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: "280px" }}>
            <img
              src="https://i.ibb.co/mVF09RwP/Zajac-po-n-kr-lik-dom-ci.png"
              alt={product.name}
              style={{
                width: "100%",
                objectFit: "cover",
                borderRadius: "var(--radius)",
                aspectRatio: "4 / 3",
                boxShadow: "var(--shadow)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginTop: "1.25rem",
              }}
            >
              <span
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#6b4c3b",
                }}
              >
                {product.price}
              </span>
              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#fdf6f6",
                  color: "#6b4c3b",
                  padding: "0.85rem 1.75rem",
                  borderRadius: "999px",
                  fontWeight: 800,
                  textDecoration: "none",
                  border: "2px solid #eccfc3",
                  boxShadow: "0 10px 18px rgba(107, 76, 59, 0.12)",
                }}
              >
                <ShoppingCart size={18} /> Kúpiť
              </a>
            </div>
          </div>

          <div style={{ flex: "1 1 360px", minWidth: "260px" }}>
            {/*<span
              style={{
                backgroundColor: "#fdf6f6",
                color: "#6b4c3b",
                padding: "0.25rem 0.75rem",
                borderRadius: "50px",
                fontSize: "0.9rem",
                fontWeight: "600",
                display: "inline-block",
                marginBottom: "1rem",
              }}
            >
              Produkt
            </span>*/}
            <h1 style={{ marginBottom: "0.5rem", fontSize: "1.8rem" }}>
              {product.name}
            </h1>

            <div
              style={{
                display: "inline-block",
                backgroundColor: "#fdf6f6",
                color: "#6b4c3b",
                paddingBlock: "0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "0.9rem",
              }}
            >
              Po zaplatení dostanete príručku vo forme PDF na email
            </div>

            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              {product.description}
            </p>
            <h2 style={{ marginBottom: "0.75rem", fontSize: "1.4rem" }}>
              Čo v ňom nájdeš?
            </h2>
            <ul
              style={{
                color: "#4b2a00",
                lineHeight: "1.8",
                paddingLeft: "1.25rem",
              }}
            >
              <li>• Je králik pre mňa vhodný?</li>
              <li>• Povahové rozdiely medzi pohlaviami</li>
              <li>• Bývanie a správne vybavenie</li>
              <li>• Strava</li>
              <li>• Správanie a komunikácia králika</li>
              <li>• Zdravie a veterinárna starostlivosť</li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  );
};

export default ProductDetails;
