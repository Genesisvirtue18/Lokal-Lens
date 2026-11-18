// Photos hosted on Cloudinary can be resized and converted (WebP/AVIF) by their CDN just by editing the URL. That keeps pages light
// without using up our own image-optimisation quota. Other hosts are returned untouched.
export function optimizedImage(url, width = 640) {
  if (typeof url !== "string") return url;
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker) || /\/upload\/[^/]*(w_|f_auto|q_auto)/.test(url)) return url;
  return url.replace(marker, `${marker}f_auto,q_auto,c_limit,w_${width}/`);
}
