import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  robots?: "index, follow" | "noindex, nofollow";
  keywords?: string;
};

const SITE_URL = "https://haobox.cloud";
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

export function Seo({
  title,
  description,
  canonicalPath = "/",
  image = DEFAULT_IMAGE,
  robots = "index, follow",
  keywords,
}: SeoProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("name", "author", "HaoBox");
    if (keywords) setMeta("name", "keywords", keywords);

    setLink("canonical", canonicalUrl);

    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "HaoBox");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:alt", "HaoBox logo");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
  }, [canonicalPath, description, image, keywords, robots, title]);

  return null;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}
