import React from 'react';
import useStore from '../store/useStore';
import ehblLogo from '../assets/ehbl.jpeg';

const FALLBACK = {
  shop_name: 'EHBL AND POWER TOOLS SUPPLIERS',
  tagline: 'Hardware: Hand Tools, Machine Tools, Sanitary, Building & Furniture fittings, Indian & China Locks, Chemical Materials Manufacturer, Importer & Suppliers.',
  address: 'Corporate Office: House # 37, (1st Floor) Road # 1/A, Block # 3, Gulshan-02, Baridhara R/A, Dhaka-1212.',
  phone: '01744129480',
  whatsapp: '01744967226',
  email: 'ehbltoolsupplier@gmail.com',
};

const InvoiceHeader = () => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  const numbers = [shop.phone, shop.whatsapp ? `${shop.whatsapp} (WhatsApp)` : '']
    .filter(Boolean)
    .join(', ');
  const contactLine = [numbers, shop.email ? `Email: ${shop.email}` : ''].filter(Boolean).join(' | ');

  return (
    <div style={{ textAlign: 'center', paddingTop: '2.75rem', marginBottom: '1.25rem', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '6px' }}>
        <img 
          src={ehblLogo} 
          alt="EHBL Logo" 
          style={{ height: '70px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
        />
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: '0 0 2px 0', fontSize: '1.4rem', fontWeight: '900', fontFamily: 'serif', letterSpacing: '0.5px', color: '#0f172a', textTransform: 'uppercase' }}>
            {shop.shop_name}
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: '#334155', maxWidth: '620px', lineHeight: 1.3 }}>
            {shop.tagline}
          </p>
        </div>
      </div>
      <p style={{ margin: '3px 0 2px 0', fontSize: '0.75rem', color: '#475569' }}>
        {shop.address}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: '#0f172a' }}>
        Phone: {contactLine}
      </p>
      <div style={{ borderBottom: '2px solid #0f172a', margin: '8px 0 4px 0' }}></div>
    </div>
  );
};

export default InvoiceHeader;
