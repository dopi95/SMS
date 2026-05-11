import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://portal.bluelight.edu.et', lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: 'https://portal.bluelight.edu.et/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ]
}
