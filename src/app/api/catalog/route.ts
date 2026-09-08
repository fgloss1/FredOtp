import { getCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Public price + inventory feed, handy for automating bulk verification flows. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = url.searchParams.get("country");
  const serviceSlug = url.searchParams.get("service");

  const catalog = await getCatalog();

  const country = countryCode
    ? catalog.countries.find((item) => item.code.toLowerCase() === countryCode.toLowerCase())
    : undefined;
  const service = serviceSlug
    ? catalog.services.find((item) => item.slug === serviceSlug.toLowerCase())
    : undefined;

  const offers = catalog.offers
    .filter((offer) => (country ? offer.countryId === country.id : true))
    .filter((offer) => (service ? offer.serviceId === service.id : true))
    .map((offer) => {
      const offerService = catalog.services.find((item) => item.id === offer.serviceId);
      const offerCountry = catalog.countries.find((item) => item.id === offer.countryId);
      return {
        service: offerService?.slug,
        serviceName: offerService?.name,
        country: offerCountry?.code,
        countryName: offerCountry?.name,
        dialCode: offerCountry?.dialCode,
        priceUsd: Number((offer.priceCents / 100).toFixed(2)),
        stock: offer.stock,
        successRate: offer.successRate,
      };
    });

  return Response.json({
    countries: catalog.countries.length,
    services: catalog.services.length,
    count: offers.length,
    offers,
  });
}
