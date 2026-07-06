// data/templatesConfig.ts

export type HeroLayout = 'centered' | 'left-aligned' | 'split';
export type GridConfig = 'list' | 'grid' | 'masonry';
export type TemplateCategory = 'servicos' | 'varejo';

export interface TemplateConfig {
  id: string;
  templateName: string;
  category: TemplateCategory;
  primaryColor: string;
  fontFamily: string;
  heroLayout: HeroLayout;
  gridConfig: GridConfig;
  previewImage: string;
  heroImage: string;
  defaultContent: {
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    reviewMock: string;
    announcementBar: string; // <-- NOVO: Tarja de topo
    miniBanners: string[]; // <-- NOVO: Imagens promocionais
  };
}

export const TEMPLATES: TemplateConfig[] = [
  // ================= CATEGORIA: SERVIÇOS =================
  {
    id: 'barbearia_pro',
    templateName: 'Barbearia Clássica',
    category: 'servicos',
    primaryColor: '#b91c1c', 
    fontFamily: '"Oswald", sans-serif',
    heroLayout: 'centered',
    gridConfig: 'list',
    previewImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Estilo e Tradição',
      heroSubtitle: 'Agende seu corte ou barba com os melhores profissionais.',
      ctaText: 'Agendar Serviço',
      reviewMock: '"Melhor corte da cidade. Ambiente incrível!" - Carlos E.',
      announcementBar: '✂️ PRIMEIRA VEZ? GANHE 15% OFF NO CORTE',
      miniBanners: [
        'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'salao_beleza',
    templateName: 'Salão Elegance',
    category: 'servicos',
    primaryColor: '#db2777', 
    fontFamily: '"Playfair Display", serif',
    heroLayout: 'centered',
    gridConfig: 'grid',
    previewImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1521590832167-7bfc17484d20?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Realce sua Beleza',
      heroSubtitle: 'Tratamentos exclusivos para cabelo, unhas e estética.',
      ctaText: 'Agendar Horário',
      reviewMock: '"Profissionais maravilhosas, saí me sentindo uma rainha!" - Juliana M.',
      announcementBar: '💅 PACOTE NOIVA COM 20% DE DESCONTO',
      miniBanners: [
        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'mecanica_express',
    templateName: 'Mecânica Express',
    category: 'servicos',
    primaryColor: '#ea580c', 
    fontFamily: '"Montserrat", sans-serif',
    heroLayout: 'left-aligned',
    gridConfig: 'list',
    previewImage: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1632823462943-6c84c1f964dc?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Seu carro em boas mãos',
      heroSubtitle: 'Revisão, troca de óleo e mecânica geral.',
      ctaText: 'Pedir Orçamento',
      reviewMock: '"Única oficina que confio. Preço justo e rápido." - Roberto S.',
      announcementBar: '🚗 REVISÃO DE FÉRIAS EM 12X SEM JUROS',
      miniBanners: [
        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'impermeabilizacao',
    templateName: 'Limpeza a Seco',
    category: 'servicos',
    primaryColor: '#0284c7', 
    fontFamily: '"Inter", sans-serif',
    heroLayout: 'centered',
    gridConfig: 'list',
    previewImage: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Sofá Protegido',
      heroSubtitle: 'Limpeza a seco e impermeabilização a domicílio.',
      ctaText: 'Agendar Visita',
      reviewMock: '"Meu sofá parece que acabou de sair da loja." - Fernanda L.',
      announcementBar: '💧 COMBO SOFÁ + TAPETE COM FRETE GRÁTIS',
      miniBanners: [
        'https://images.unsplash.com/photo-1550226891-ef816aed4a98?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1563450974535-7762692244c0?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'mao_de_obra',
    templateName: 'Reparos e Obras',
    category: 'servicos',
    primaryColor: '#ca8a04', 
    fontFamily: '"Roboto", sans-serif',
    heroLayout: 'left-aligned',
    gridConfig: 'list',
    previewImage: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1504307651254-35680f356f90?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Marido de Aluguel',
      heroSubtitle: 'Elétrica, encanamento e instalações em geral.',
      ctaText: 'Chamar Profissional',
      reviewMock: '"Resolveu meu problema do chuveiro em 20 min." - Paulo T.',
      announcementBar: '🛠️ ATENDIMENTO EMERGENCIAL 24 HORAS',
      miniBanners: [
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },

  // ================= CATEGORIA: VAREJO =================
  {
    id: 'celulares_tech',
    templateName: 'Tech Store',
    category: 'varejo',
    primaryColor: '#4f46e5', 
    fontFamily: '"Inter", sans-serif',
    heroLayout: 'centered',
    gridConfig: 'grid',
    previewImage: 'https://images.unsplash.com/photo-1605236453806-6ff36852877e?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'A Última Geração',
      heroSubtitle: 'Smartphones e assistência técnica especializada.',
      ctaText: 'Comprar Agora',
      reviewMock: '"Comprei meu iPhone aqui, melhor preço e garantia." - Lucas P.',
      announcementBar: '📱 IPHONE 15 PRO MAX COM 10% OFF NO PIX',
      miniBanners: [
        'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'loja_camisas',
    templateName: 'Boutique (Camisas)',
    category: 'varejo',
    primaryColor: '#111827', 
    fontFamily: '"Montserrat", sans-serif',
    heroLayout: 'centered',
    gridConfig: 'masonry', 
    previewImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Nova Coleção',
      heroSubtitle: 'Camisas exclusivas com caimento perfeito.',
      ctaText: 'Adicionar à Sacola',
      reviewMock: '"A qualidade do tecido é surreal." - Marcos R.',
      announcementBar: '👔 FRETE GRÁTIS PARA COMPRAS ACIMA DE R$ 299',
      miniBanners: [
        'https://images.unsplash.com/photo-1489987707023-affa2e881182?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1550614000-4b95dd2454a8?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'loja_tenis',
    templateName: 'Sneakers Kicks',
    category: 'varejo',
    primaryColor: '#dc2626', 
    fontFamily: '"Oswald", sans-serif',
    heroLayout: 'left-aligned',
    gridConfig: 'grid',
    previewImage: 'https://images.unsplash.com/photo-1552346154-21d32810baa3?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Pise com Atitude',
      heroSubtitle: 'Os sneakers mais desejados e exclusivos.',
      ctaText: 'Garantir o Meu',
      reviewMock: '"Tênis 100% original, loja braba!" - Tiago N.',
      announcementBar: '🔥 ÚLTIMOS PARES COM PREÇO DE OUTLET',
      miniBanners: [
        'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'moda_feminina',
    templateName: 'Moda Feminina',
    category: 'varejo',
    primaryColor: '#f43f5e', 
    fontFamily: '"Playfair Display", serif',
    heroLayout: 'centered',
    gridConfig: 'masonry', 
    previewImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Descubra sua Essência',
      heroSubtitle: 'Peças únicas que combinam extremo conforto.',
      ctaText: 'Eu Quero',
      reviewMock: '"As roupas têm um caimento maravilhoso!" - Camila F.',
      announcementBar: '👗 USE O CUPOM BEMVINDA E GANHE 10% OFF',
      miniBanners: [
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80'
      ]
    }
  },
  {
    id: 'conveniencia_padrao',
    templateName: 'Conveniência Padrão',
    category: 'varejo',
    primaryColor: '#059669', 
    fontFamily: '"Roboto", sans-serif',
    heroLayout: 'left-aligned',
    gridConfig: 'list',
    previewImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80',
    heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    defaultContent: {
      heroTitle: 'Sua Bebida Gelada',
      heroSubtitle: 'Snacks, cervejas e itens de urgência.',
      ctaText: 'Adicionar',
      reviewMock: '"Entrega muito rápida e cerveja trincando." - Felipe A.',
      announcementBar: '🧊 GELO E CARVÃO COM ENTREGA EM 15 MINUTOS',
      miniBanners: [
        'https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1563514984242-69f8c6eb98c3?auto=format&fit=crop&w=600&q=80'
      ]
    }
  }
];