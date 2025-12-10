import Script from 'next/script'

interface StructuredDataProps {
  data: Record<string, any>
}

/**
 * Component that renders structured data (JSON-LD) for SEO purposes
 * @param {StructuredDataProps} props - Component props
 * @param {Record<string, any>} props.data - Structured data object to render as JSON-LD
 * @returns {JSX.Element} Script tag containing structured data
 */
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

/**
 * Component that generates Organization schema.org structured data
 * @param {OrganizationSchemaProps} props - Component props
 * @param {string} [props.name="QuizZerd"] - Organization name
 * @param {string} [props.url="https://quizzerd.com"] - Organization website URL
 * @param {string} [props.logo="https://quizzerd.com/logo.png"] - Path to organization logo
 * @param {string} [props.description="The next generation education platform for creating, managing, and taking exams"] - Organization description
 * @returns {JSX.Element} StructuredData component with Organization schema
 */
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

/**
 * Component that generates WebSite schema.org structured data with search action
 * @param {WebSiteSchemaProps} props - Component props
 * @param {string} [props.name="QuizZerd"] - Website name
 * @param {string} [props.url="https://quizzerd.com"] - Website URL
 * @param {string} [props.description="The next generation education platform"] - Website description
 * @returns {JSX.Element} StructuredData component with WebSite schema
 */
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

/**
 * Component that generates SoftwareApplication schema.org structured data
 * @param {SoftwareApplicationSchemaProps} props - Component props
 * @param {string} [props.name="QuizZerd"] - Application name
 * @param {string} [props.applicationCategory="EducationalApplication"] - Category of the application
 * @param {string} [props.operatingSystem="Web"] - Operating system the application runs on
 * @param {{price?: string; priceCurrency?: string}} [props.offers] - Optional pricing information
 * @returns {JSX.Element} StructuredData component with SoftwareApplication schema
 */
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

/**
 * Component that generates BreadcrumbList schema.org structured data
 * @param {BreadcrumbSchemaProps} props - Component props
 * @param {Array<{name: string; url: string}>} props.items - Array of breadcrumb items with name and URL
 * @returns {JSX.Element} StructuredData component with BreadcrumbList schema
 */
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

