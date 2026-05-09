/* eslint-disable react/no-danger */

const BASE = "https://www.neklikni.cz";

const ORGANIZATION = {
  "@type": "Organization",
  name: "NeKlikni.cz",
  url: BASE,
  logo: `${BASE}/icon-512.png`,
  sameAs: [],
};

export function HomeSchema() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        url: BASE,
        name: "NeKlikni.cz",
        description: "AI bodyguard pro tvůj klidný internet — prověř SMS, e-mail nebo odkaz dřív, než klikneš.",
        inLanguage: "cs-CZ",
        publisher: ORGANIZATION,
      },
      {
        "@type": "SoftwareApplication",
        name: "NeKlikni.cz",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "CZK",
          lowPrice: "0",
          highPrice: "199",
          offerCount: 4,
        },
        url: BASE,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function PricingSchema(faq: { q: string; a: string }[]) {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Domů",   item: BASE },
          { "@type": "ListItem", position: 2, name: "Ceník", item: `${BASE}/pricing` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "Product",
        name: "NeKlikni.cz – AI ochrana před phishingem",
        description: "Předplatné AI analýzy podezřelých zpráv, SMS a odkazů.",
        brand: ORGANIZATION,
        offers: [
          {
            "@type": "Offer", name: "JEDNORÁZOVÁ", price: "49",  priceCurrency: "CZK",
            url: `${BASE}/pricing`, availability: "https://schema.org/InStock",
          },
          {
            "@type": "Offer", name: "BASIC", price: "99",  priceCurrency: "CZK",
            url: `${BASE}/pricing`, availability: "https://schema.org/InStock",
            priceSpecification: { "@type": "UnitPriceSpecification", price: "99", priceCurrency: "CZK", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } },
          },
          {
            "@type": "Offer", name: "PRO", price: "199", priceCurrency: "CZK",
            url: `${BASE}/pricing`, availability: "https://schema.org/InStock",
            priceSpecification: { "@type": "UnitPriceSpecification", price: "199", priceCurrency: "CZK", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
