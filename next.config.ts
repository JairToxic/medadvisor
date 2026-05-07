import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // pdfkit incluye archivos .afm de fuentes que Turbopack no empaqueta;
  // marcarlo como external evita que se bundlee y deja que use sus rutas reales.
  serverExternalPackages: ["pdfkit"],
};

export default config;
