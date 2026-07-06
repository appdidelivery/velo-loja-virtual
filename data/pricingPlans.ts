// data/pricingPlans.ts

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  isRecommended?: boolean;
  buttonText: string;
  buttonVariant: 'outline' | 'primary' | 'dark';
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'gratis',
    name: 'Grátis',
    price: 0,
    period: '/mês',
    description: 'O essencial para começar a vender online e aparecer no Google.',
    features: [
      'Cadastro Velo (Catálogo Básico)',
      'Integração Google Meu Negócio',
      'Até 50 produtos cadastrados',
      'Recebimento de pedidos via WhatsApp',
      'Layout otimizado para celular'
    ],
    buttonText: 'Plano Atual',
    buttonVariant: 'outline',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99.90,
    period: '/mês',
    description: 'Para lojas em crescimento que precisam de pagamentos online.',
    features: [
      'Tudo do plano Grátis',
      'Integração com Mercado Pago (Pix/Cartão)',
      'Produtos ilimitados',
      'Importação de XML (Google Merchant)',
      'Suporte via e-mail'
    ],
    buttonText: 'Assinar Pro',
    buttonVariant: 'dark',
  },
  {
    id: 'business',
    name: 'Business',
    price: 199.90,
    period: '/mês',
    description: 'A solução completa para decolar suas vendas com ferramentas avançadas.',
    features: [
      'Tudo do plano Pro',
      'Atendimento Meta API (WhatsApp Oficial)',
      'Carrinho abandonado (Recuperação)',
      'Múltiplos usuários e permissões',
      'Suporte prioritário via WhatsApp',
      'PDV (Modo Garçom)'
    ],
    isRecommended: true,
    buttonText: 'Assinar Business',
    buttonVariant: 'primary',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299.90,
    period: '/mês',
    description: 'Controle total, dados avançados e fiscalização para grandes operações.',
    features: [
      'Tudo do plano Business',
      'Emissão Fiscal (NF-e / NFC-e)',
      'Relatórios Avançados (Integração GA4)',
      'API Aberta para integrações externas',
      'Gerente de conta dedicado',
      'SLA de 99.9% de uptime'
    ],
    buttonText: 'Falar com Consultor',
    buttonVariant: 'dark',
  }
];