export function viteBasePath(): string {
  const base = process.env.GITHUB_PAGES_BASE?.trim();

  if (!base || base === '/') return '/';
  return base.endsWith('/') ? base : `${base}/`;
}
