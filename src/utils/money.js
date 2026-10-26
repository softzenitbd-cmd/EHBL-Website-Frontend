/**
 * Invoice totals are whole taka: .01-.49 rounds down, .50-.99 rounds up.
 * Same rule as the server's round_taka, so the screen and the stored total agree.
 */
export const roundTaka = (amount) => {
  const paisa = Math.round(Number(amount || 0) * 100); // drop float noise first
  return Math.floor((paisa + 50) / 100);
};
