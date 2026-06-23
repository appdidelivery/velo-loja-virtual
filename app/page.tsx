import CustomerCatalog from '../components/CustomerCatalog';

export const metadata = {
  title: 'Catálogo Digital | Velo Varejo',
  description: 'Faça seu pedido diretamente pelo nosso site de forma rápida e segura.',
};

export default function HomePage() {
  return (
    <main>
      <CustomerCatalog />
    </main>
  );
}