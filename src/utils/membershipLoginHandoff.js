export const parseMembershipLoginHandoff = (hash) => {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  if (params.get('membership-login') !== '1') return null;

  const email = String(params.get('email') || '').trim().toLowerCase();
  const code = String(params.get('code') || '').replace(/[^\d]/g, '').slice(0, 6);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return null;
  }
  return { email, code };
};
