import React from 'react';
import logoImg from '../assets/ehbl.jpeg';

const InvoiceHeader = () => {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', fontFamily: 'serif', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>EHBL AND POWER TOOLS SUPPLIERS.</h2>
      </div>
      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
        Hardware: Hand Tools, Machine Tools, Sanitary, Building, Furniture items,
      </p>
      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
        Indian lock, China lock, Chemical Materials Manufacturer, Importer Suppliers.
      </p>
      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', marginTop: '5px' }}>
        Corporate Office : House # 37. (1st Floor) Road # 1/A, Block # 3, Gulshan - 02, Baridhara R/A, Dhaka -1212.
      </p>
      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem' }}>
        Phone : 01744129480, 01744967226 (WhatsApp) Mail : ehbltoolsupplier@gmail.com
      </p>
      <div style={{ borderBottom: '1px solid #000', margin: '10px 0 5px 0' }}></div>
    </div>
  );
};

export default InvoiceHeader;
