import Script from 'next/script'

interface StructuredDataProps {
  data: Record<string, any>
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

interface OrganizationSchemaProps {
  name?: string
  url?: string
  logo?: string
  description?: string
}

export function OrganizationSchema({ 
  name = "QuizZerd",
  url = "https://quizzerd.com",
  logo = "https://quizzerd.com/logo.png",
  description = "The next generation education platform for creating, managing, and taking exams"
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo: `${url}${logo}`,
    description,
    sameAs: [
      // Add social media links when available
    ]
  }

  return <StructuredData data={schema} />
}

interface WebSiteSchemaProps {
  name?: string
  url?: string
  description?: string
}

export function WebSiteSchema({
  name = "QuizZerd",
  url = "https://quizzerd.com",
  description = "The next generation education platform"
}: WebSiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/exam?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return <StructuredData data={schema} />
}

interface SoftwareApplicationSchemaProps {
  name?: string
  applicationCategory?: string
  operatingSystem?: string
  offers?: {
    price?: string
    priceCurrency?: string
  }
}

export function SoftwareApplicationSchema({
  name = "QuizZerd",
  applicationCategory = "EducationalApplication",
  operatingSystem = "Web",
  offers
}: SoftwareApplicationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory,
    operatingSystem,
    ...(offers && { offers: { "@type": "Offer", ...offers } })
  }

  return <StructuredData data={schema} />
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string
    url: string
  }>
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }

  return <StructuredData data={schema} />
}

