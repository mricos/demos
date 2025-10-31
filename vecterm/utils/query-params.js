// ==========================================
// QUERY PARAMETER UTILITIES
// ==========================================

export function getQueryParams() {
  const params = {};
  window.location.search
    .slice(1)
    .split('&')
    .forEach(part => {
      if (!part) return;
      const [key, val] = part.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });
  return params;
}
