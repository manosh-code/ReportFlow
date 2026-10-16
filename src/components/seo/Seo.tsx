import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  path?: string;
};

function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function Seo({
  title,
  description,
  image = "/hero.png",
  path = "/",
}: SeoProps) {
  useEffect(() => {
    document.title = title;
    const imageUrl = absoluteUrl(image);
    const canonicalUrl = absoluteUrl(path);
    const tags: Array<{ attr: "name" | "property"; key: string; content: string }> = [
      { attr: "name", key: "description", content: description },
      { attr: "property", key: "og:title", content: title },
      { attr: "property", key: "og:description", content: description },
      { attr: "property", key: "og:image", content: imageUrl },
      { attr: "property", key: "og:url", content: canonicalUrl },
      { attr: "property", key: "og:type", content: "website" },
      { attr: "name", key: "twitter:card", content: "summary_large_image" },
      { attr: "name", key: "twitter:title", content: title },
      { attr: "name", key: "twitter:description", content: description },
      { attr: "name", key: "twitter:image", content: imageUrl },
    ];
    tags.forEach(({ attr, key, content }) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    });
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, [title, description, image, path]);

  return null;
}
