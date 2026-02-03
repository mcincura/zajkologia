import React from 'react';

const FaqSection = ({ faqItems }) => {
    if (!faqItems || faqItems.length === 0) return null;

    return (
        <section style={{
            marginTop: '3rem',
            marginBottom: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--color-light)',
        }}>
            <h2 style={{
                color: 'var(--color-primary)',
                fontSize: '1.75rem',
                fontWeight: 800,
                marginBottom: '1.5rem',
            }}>
                Často kladené otázky
            </h2>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}>
                {faqItems.map((faq, index) => (
                    <div
                        key={index}
                        style={{
                            background: 'var(--color-white)',
                            borderRadius: 'var(--radius)',
                            padding: '1.25rem 1.5rem',
                            boxShadow: 'var(--shadow)',
                            border: '1px solid var(--color-light)',
                        }}
                    >
                        <h3 style={{
                            color: 'var(--color-dark)',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid var(--color-light)',
                            lineHeight: 1.4,
                        }}>
                            {faq.question}
                        </h3>
                        <p style={{
                            color: 'var(--color-text)',
                            fontSize: '1rem',
                            lineHeight: 1.7,
                            margin: 0,
                        }}>
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FaqSection;
