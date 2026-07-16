import { SitePage } from "@/components/site-page";

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <SitePage route={`/${slug.join("/")}`} />;
}
