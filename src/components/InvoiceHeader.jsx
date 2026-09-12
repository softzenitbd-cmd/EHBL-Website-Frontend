import React from 'react';
import useStore from '../store/useStore';
import ehblLogo from '../assets/ehbl.jpeg';

const FALLBACK = {
  shop_name: 'EHBL AND POWER TOOLS SUPPLIERS',
  tagline: 'Hardware: Hand Tools, Power Tools, Sanitary, Building, Furniture items, Indian lock & China lock Suppliers.',
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
    <div style={{ textAlign: 'center', paddingTop: '1.5rem', marginBottom: '1.25rem', color: '#000000', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '6px' }}>
        <img 
          src={ehblLogo} 
          alt="EHBL Logo" 
          style={{ height: '82px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
        />
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: '0 0 3px 0', fontSize: '1.75rem', fontWeight: '950', WebkitTextStroke: '0.45px #000000', letterSpacing: '0.5px', color: '#000000', textTransform: 'uppercase', lineHeight: 1.15 }}>
            {shop.shop_name}
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#000000', maxWidth: '640px', lineHeight: 1.35 }}>
            Hardware: Hand Tools, Power Tools, Sanitary, Building, Furniture items, Indian lock &amp; China lock Suppliers.
          </p>
        </div>
      </div>
      <p style={{ margin: '5px 0 2px 0', fontSize: '0.88rem', fontWeight: '700', color: '#000000' }}>
        {shop.address}
      </p>
      <p style={{ margin: '4px 0 2px 0', fontSize: '1.08rem', fontWeight: '900', color: '#000000', letterSpacing: '0.3px', lineHeight: 1.3 }}>
        Phone: {contactLine}
      </p>
      <div style={{ borderBottom: '2.5px solid #000000', margin: '8px 0 4px 0' }}></div>
    </div>
  );
};

export default InvoiceHeader;
