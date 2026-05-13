/** @type {import('next').NextConfig} */
const isGithubPages = process.env.DEPLOY_TARGET === 'gh-pages';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  output: 'export',
  // Netlify serves from root (/). Keep subpath only for GitHub Pages.
  basePath: isGithubPages ? '/snapshoot' : '',
  assetPrefix: isGithubPages ? '/snapshoot' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
