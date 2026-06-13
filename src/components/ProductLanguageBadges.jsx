import '../styles/products.css';

const LANGUAGE_META = {
  sk: {
    code: 'SK',
    label: 'Slovenčina',
  },
  cs: {
    code: 'CZ',
    label: 'Čeština',
  },
};

const renderFlag = (language) => {
  if (language === 'sk') {
    return (
      <span
        className="product-language-flag product-language-flag--sk"
        aria-hidden="true"
      >
        <svg
          className="product-language-flag-emblem"
          viewBox="0 0 24 30"
          focusable="false"
        >
          <path
            d="M4 2h16v12.2c0 6.9-5 10.8-8 13.1-3-2.3-8-6.2-8-13.1Z"
            fill="#ee404c"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M5 17.5c1.9-1.5 4.1-2.3 7-2.3 2.9 0 5.1 0.8 7 2.3v4.6c-1.9 1.9-4.2 3.7-7 5.8-2.8-2.1-5.1-3.9-7-5.8Z"
            fill="#1f5aa6"
          />
          <path
            d="M11 6.1h2v10.6h-2Z"
            fill="#fff"
          />
          <path
            d="M8.4 8.2h7.2v1.9H8.4Z"
            fill="#fff"
          />
          <path
            d="M8.9 11.3h6.2v1.8H8.9Z"
            fill="#fff"
          />
          <path
            d="M7.3 19.9c1.3-1.4 2.7-2 4.7-2 1.9 0 3.4 0.6 4.7 2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M6.1 22.8c1.8-1.8 3.6-2.7 5.9-2.7 2.2 0 4 0.9 5.9 2.7"
            fill="none"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M4.9 25.6c2.1-2 4.2-3 7.1-3 2.8 0 4.9 1 7.1 3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`product-language-flag product-language-flag--${language}`}
      aria-hidden="true"
    />
  );
};

const ProductLanguageBadges = ({ languages = [] }) => {
  const normalizedLanguages = languages
    .map((language) => String(language || '').trim().toLowerCase())
    .filter((language, index, array) => language in LANGUAGE_META && array.indexOf(language) === index);

  if (!normalizedLanguages.length) {
    return null;
  }

  return (
    <div
      className="product-language-list"
      aria-label={`Dostupné jazyky: ${normalizedLanguages.map((language) => LANGUAGE_META[language].label).join(', ')}`}
    >
      {normalizedLanguages.map((language) => {
        const meta = LANGUAGE_META[language];

        return (
          <span
            key={language}
            className="product-language-chip"
            title={meta.label}
          >
            {renderFlag(language)}
            <span className="product-language-code">{meta.code}</span>
          </span>
        );
      })}
    </div>
  );
};

export default ProductLanguageBadges;
