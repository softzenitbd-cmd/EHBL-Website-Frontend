import React from 'react';
import useStore from '../store/useStore';

// Printed on every invoice. Falls back to the letterhead currently committed
// here so the header still prints correctly before the profile loads, or if the
// server is unreachable.
const FALLBACK = {
  shop_name: 'EHBL AND POWER TOOLS SUPPLIERS.',
  tagline: 'Hardware: Hand Tools, Machine Tools, Sanitary, Building, Furniture items,\nIndian lock, China lock, Chemical Materials Manufacturer, Importer Suppliers.',
  address: 'Corporate Office : House # 37. (1st Floor) Road # 1/A, Block # 3, Gulshan - 02, Baridhara R/A, Dhaka -1212.',
  phone: '01744129480',
  whatsapp: '01744967226',
  email: 'ehbltoolsupplier@gmail.com',
};

const InvoiceHeader = () => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  const taglineLines = String(shop.tagline || '').split('\n').filter(Boolean);
  const numbers = [shop.phone, shop.whatsapp ? `${shop.whatsapp} (WhatsApp)` : '']
    .filter(Boolean)
    .join(', ');
  const contactLine = [numbers, shop.email ? `Mail : ${shop.email}` : ''].filter(Boolean).join(' ');

  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', fontFamily: 'serif', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{shop.shop_name}</h2>
      </div>
      {taglineLines.map((line, idx) => (
        <p key={idx} style={{ margin: '0.2rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
          {line}
        </p>
      ))}
      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', marginTop: '5px' }}>
        {shop.address}
      </p>
      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem' }}>
        Phone : {contactLine}
      </p>
      <div style={{ borderBottom: '1px solid #000', margin: '10px 0 5px 0' }}></div>
    </div>
  );
};

export default InvoiceHeader;
