/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: '**.greenhouse.io' },
      { protocol: 'https', hostname: '**.lever.co' },
    ],
  },
}

module.exports = nextConfig
