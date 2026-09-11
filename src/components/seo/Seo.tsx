import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  path?: string;
};

export function Seo({
  title,
  description,
  image = "/hero.png",
  path = "/",
}: SeoProps) {
  useEffect(() => {
    document.title = title;
    const pairs: Array<[string, string]> = [
      ["name", "description"],
      ["property", "og:title"],
      ["property", "og:description"],
      ["property", "og:image"],
      ["name", "twitter:card"],
      ["name", "twitter:image"],
    ];
    const values = [
      description,
      title,
      description,
      image,
      "summary_large_image",
      image,
    ];
    pairs.forEach(([attr, key], index) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", values[index]);
    });
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", path);
  }, [title, description, image, path]);

  return null;
}
