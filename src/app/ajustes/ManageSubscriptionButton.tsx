'use client';

import { useState } from 'react';

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se pudo obtener la URL de administración");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con Stripe.");
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.25rem' }}>
      {error && (
        <div style={{ color: '#991b1b', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          ⚠️ {error}
        </div>
      )}
      <button
        onClick={handleManage}
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
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {loading ? 'Cargando...' : '💳 Administrar en Stripe'}
      </button>
    </div>
  );
}
