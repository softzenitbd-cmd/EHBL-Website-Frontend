/**
 * Converts a numeric amount to English words (South Asian numbering: Crore, Lakh, Thousand, Hundred)
 * e.g. 2680 -> "Two Thousand Six Hundred Eighty Taka Only"
 */
export const numberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '';
  const parsed = Number(num);
  if (parsed === 0) return 'Zero Taka Only';
  if (parsed < 0) return 'Minus ' + numberToWords(-parsed);

  const intPart = Math.floor(parsed);
  const decimalPart = Math.round((parsed - intPart) * 100);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertBelowThousand = (val) => {
    let str = '';
    if (val >= 100) {
      str += ones[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + ones[val % 10] : '');
    } else if (val > 0) {
      str += ones[val];
    }
    return str.trim();
  };

  const convertNumber = (val) => {
    if (val === 0) return 'Zero';
    let remainder = val;
    let words = '';

    const crore = Math.floor(remainder / 10000000);
    remainder %= 10000000;

    const lakh = Math.floor(remainder / 100000);
    remainder %= 100000;

    const thousand = Math.floor(remainder / 1000);
    remainder %= 1000;

    const hundreds = remainder;

    if (crore > 0) {
      words += convertBelowThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      words += convertBelowThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      words += convertBelowThousand(thousand) + ' Thousand ';
    }
    if (hundreds > 0) {
      words += convertBelowThousand(hundreds);
    }
    return words.trim();
  };

  let result = intPart > 0 ? convertNumber(intPart) + ' Taka' : '';

  if (decimalPart > 0) {
    result += (result ? ' and ' : '') + convertBelowThousand(decimalPart) + ' Paisa';
  }

  return result ? result + ' Only' : 'Zero Taka Only';
};

export default numberToWords;
