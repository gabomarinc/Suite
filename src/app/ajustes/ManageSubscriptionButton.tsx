import { PortalLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default function ManageSubscriptionButton() {
  return (
    <div style={{ marginTop: '1.25rem' }}>
      <PortalLink
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          background: '#0f172a',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.85rem',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none'
        }}
      >
        💳 Administrar en Stripe
      </PortalLink>
    </div>
  );
}
