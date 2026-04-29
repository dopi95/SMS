import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://bluelight.edu.et'
  const now  = new Date()

  return [
    { url: base,                        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/about/our-story`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about/school-fees`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/facilities`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
