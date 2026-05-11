import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/login', disallow: ['/student', '/teacher'] },
    sitemap: 'https://portal.bluelight.edu.et/sitemap.xml',
  }
}
