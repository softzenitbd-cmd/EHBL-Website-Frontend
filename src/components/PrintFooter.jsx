import React from 'react';
import useStore from '../store/useStore';

// Falls back to the disclaimers currently committed here.
const FALLBACK = {
  footer_disclaimer_1: '#বিঃদ্রঃ চালান মোতাবেক অবশ্যই পণ্য বুঝে নিবেন। পণ্য বুঝে নেওয়ার পর কোন প্রকার অভিযোগ গ্রহণ যোগ্য নয়।',
  footer_disclaimer_2: '#বিদেশ থেকে আমদানিকৃত সকল প্রকারঃ হার্ডওয়্যার, টুলস, পাওয়ার টুলস, মেশিন টুলস, ফার্নিচার ফিটিংস, পেইন্টস আইটেম এবং সকল প্রকারঃ মেশিনের পার্টস সহ ইলেকট্রিক মালামাল ক্রয় করার জন্য আমাদের সাথে যোগাযোগ করবেন।',
  footer_phone: 'মোবাইল নম্বর: ০১৮৬৭ - ১২৬৬৭৫',
};

const PrintFooter = ({ compact = false }) => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  const rawPhone = String(shop.footer_phone || '০১৮৬৭ - ১২৬৬৭৫');
  const cleanPhone = rawPhone.replace(/^[:\s]+/, '').replace(/^মোবাইল\s*(নম্বর|নং)?\s*[:\s]*/, '');
  const phoneDisplay = `মোবাইল নম্বর: ${cleanPhone}`;

  return (
    <div className="common-print-footer" style={{ color: '#000000', marginTop: compact ? '6px' : '10px' }}>
      <p style={{ color: '#000000', margin: '0 0 2px 0', fontSize: compact ? '0.72rem' : '0.76rem', lineHeight: 1.3, fontWeight: '600' }}>{shop.footer_disclaimer_1}</p>
      <p style={{ color: '#000000', margin: '0 0 2px 0', fontSize: compact ? '0.72rem' : '0.76rem', lineHeight: 1.3, fontWeight: '600' }}>{shop.footer_disclaimer_2}</p>
      <p className="footer-phone" style={{ color: '#000000', fontWeight: '800', fontSize: compact ? '0.78rem' : '0.82rem', marginTop: '2px', marginBottom: 0 }}>{phoneDisplay}</p>
    </div>
  );
};

export default PrintFooter;
