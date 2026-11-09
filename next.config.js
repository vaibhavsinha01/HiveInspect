/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/t/:id', destination: '/templates/:id', permanent: true }]
  },
}

export default nextConfig
