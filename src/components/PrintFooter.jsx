import React from 'react';
import useStore from '../store/useStore';

// Falls back to the disclaimers the shop has always printed.
const FALLBACK = {
  footer_disclaimer_1: '#বিঃদ্রঃ চালান মোতাবেক অবশ্যই পণ্য বুঝে নিবেন। পণ্য বুঝে নেওয়ার পর কোন প্রকার অভিযোগ গ্রহণ যোগ্য নয়।',
  footer_disclaimer_2: '#বিদেশ থেকে আমদানিকৃত সকল প্রকারঃ হার্ডওয়্যার, টুলস, পাওয়ার টুলস, মেশিন টুলস, ফার্নিচার ফিটিংস, পেইন্টস আইটেম এবং সকল প্রকারঃ মেশিনের পার্টস সহ ইলেকট্রিক মালামাল ক্রয় করার জন্য আমাদের সাথে যোগাযোগ করবেন।',
  footer_phone: ':০১৮৬৭ - ১২৬৬৭৫',
};

const PrintFooter = () => {
  const shopProfile = useStore((state) => state.shopProfile);
  const shop = { ...FALLBACK, ...(shopProfile || {}) };

  return (
    <div className="common-print-footer">
      <p>{shop.footer_disclaimer_1}</p>
      <p>{shop.footer_disclaimer_2}</p>
      <p className="footer-phone">{shop.footer_phone}</p>
    </div>
  );
};

export default PrintFooter;
