import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Velo Loja Virtual | Crie seu Catálogo Grátis',
  description: 'Plataforma SaaS completa para lojistas. Catálogo digital, PDV, robô de WhatsApp, IA de vendas e integração com o Google Meu Negócio. Comece sem taxa de comissão.',
  keywords: ['criar loja virtual', 'catálogo digital', 'Atendimento no whatsapp', 'pdv online', 'sistema para restaurante', 'sistema para loja', 'robô whatsapp'],
  authors: [{ name: 'Velo Loja' }],
  metadataBase: new URL('https://veloloja.com.br'),
  openGraph: {
    type: 'website',
    url: 'https://veloloja.com.br',
    title: 'Velo Loja Virtual | O Futuro do seu atendimento e gestao de negócio',
    description: 'Pare de pagar taxas abusivas. Tenha sua loja própria com WhatsApp automatizado e IA integrada.',
    siteName: 'Velo Loja Virtual',
    images: [{
      url: '/velo loja virtual logo.png',
      width: 800,
      height: 600,
      alt: 'Velo Loja Virtual Dashboard',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velo Loja Virtual',
    description: 'Crie sua loja grátis e venda no piloto automático.',
    images: ['/velo loja virtual logo.png'],
  },
  icons: {
    icon: '/velo loja virtual logo.png',
    shortcut: '/velo loja virtual logo.png',
    apple: '/velo loja virtual logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}