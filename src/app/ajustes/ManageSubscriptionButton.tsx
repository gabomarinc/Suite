'use client';

import { useState } from 'react';
import { createPortalSession } from './actions';

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createPortalSession();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con Stripe");
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#0f172a',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.85rem',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        {loading ? 'Redireccionando...' : '💳 Administrar en Stripe'}
      </button>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
