import type { Metadata } from "next";

export const SITE_NAME = "nuclearsafety.net";

type PageMetadataOptions = {
  /** Open Graph description, when it should differ from the page description. */
  ogDescription?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
};

/**
 * Builds a page's metadata. Next.js shallow-merges `openGraph` and `twitter`
 * per segment, so every page restates the shared fields here.
 */
export function pageMetadata(
  title: string,
  description: string,
  { ogDescription, twitterCard = "summary_large_image", noIndex = false }: PageMetadataOptions = {},
): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    description,
    openGraph: { title: fullTitle, description: ogDescription ?? description, type: "website" },
    twitter: { card: twitterCard },
    ...(noIndex ? { robots: { index: false } } : {}),
  };
}

export const unavailableMetadata = (what: "Course" | "Learner"): Metadata => ({
  title: `${what} unavailable | ${SITE_NAME}`,
  robots: { index: false },
});
