import React from 'react';
import useStore from '../store/useStore';

// Printed on every invoice, so it falls back to the letterhead the shop has
// always used if the profile has not loaded yet.
const FALLBACK = {
  shop_name: 'EHBL AND POWER TOOLS SUPPLIERS.',
  tagline: 'Hardware: Hand Tools, Machine Tools, Sanitary, Building, Furniture items,\nIndian lock, China lock, Chemical Materials Manufacturer, Importer & Suppliers.',
  address: 'Corporate Office : House # 37. (1st Floor) Road # 1/A, Block # 3, Gulshan - 02, Baridhara R/A, Dhaka -1212.',
  phone: '01744129480',
  whatsapp: '01744967226',
  email: 'ehbltoolsupplier@gmail.com',
};

const InvoiceHeader = () => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  const taglineLines = String(shop.tagline || '').split('\n').filter(Boolean);
  const contactLine = [
    [shop.phone, shop.whatsapp].filter(Boolean).join(', '),
    shop.email ? `Mail : ${shop.email}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', fontFamily: 'serif', letterSpacing: '0.5px' }}>{shop.shop_name}</h2>
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
