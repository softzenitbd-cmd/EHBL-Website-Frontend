import React from 'react';
import useStore from '../store/useStore';
import ehblLogo from '../assets/ehbl.jpeg';

const FALLBACK = {
  shop_name: 'EHBL AND POWER TOOLS SUPPLIERS',
  tagline: 'Hardware: Hand Tools, Power Tools, Sanitary, Building, Furniture items, Indian lock & China lock Suppliers.',
  address: 'Corporate Office: House # 37, (1st Floor) Road # 1/A, Block # 3, Gulshan-02, Baridhara R/A, Dhaka-1212.',
  site_office: 'Site Office: Jhenaidah',
  phone: '01744129480',
  whatsapp: '01744967226',
  email: 'ehbltoolsupplier@gmail.com',
};

const InvoiceHeader = ({ compact = false }) => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  const numbers = [shop.phone, shop.whatsapp ? `${shop.whatsapp} (WhatsApp)` : '']
    .filter(Boolean)
    .join(', ');
  const contactLine = [numbers, shop.email ? `Email: ${shop.email}` : ''].filter(Boolean).join(' | ');

  return (
    <div style={{ textAlign: 'center', paddingTop: compact ? '0.2rem' : '0.75rem', marginBottom: compact ? '0.45rem' : '0.95rem', color: '#000000', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? '0.85rem' : '1.25rem', marginBottom: compact ? '3px' : '6px' }}>
        <img 
          src={ehblLogo} 
          alt="EHBL Logo" 
          style={{ height: compact ? '54px' : '76px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
        />
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: '0 0 2px 0', fontSize: compact ? '1.35rem' : '1.65rem', fontWeight: '950', WebkitTextStroke: '0.4px #000000', letterSpacing: '0.5px', color: '#000000', textTransform: 'uppercase', lineHeight: 1.15 }}>
            {shop.shop_name}
          </h1>
          <p style={{ margin: 0, fontSize: compact ? '0.88rem' : '1.02rem', fontWeight: '750', color: '#000000', maxWidth: '640px', lineHeight: 1.3 }}>
            {shop.tagline || 'Hardware: Hand Tools, Power Tools, Sanitary, Building, Furniture items, Indian lock & China lock Suppliers.'}
          </p>
        </div>
      </div>
      <p style={{ margin: compact ? '2px 0 1px 0' : '4px 0 2px 0', fontSize: compact ? '0.84rem' : '0.94rem', fontWeight: '750', color: '#000000', lineHeight: 1.25 }}>
        {shop.address}
      </p>
      <p style={{ margin: compact ? '2px 0 1px 0' : '3px 0 2px 0', fontSize: compact ? '0.74rem' : '0.82rem', fontWeight: '800', color: '#000000', letterSpacing: '0.2px', lineHeight: 1.25 }}>
        <span>{shop.site_office || 'Site Office: Jhenaidah'}</span>
        <span style={{ margin: '0 6px', fontWeight: '400' }}>|</span>
        <span>Phone: {contactLine}</span>
      </p>
      <div style={{ borderBottom: '2px solid #000000', margin: compact ? '4px 0 2px 0' : '6px 0 3px 0' }}></div>
    </div>
  );
};

export default InvoiceHeader;
