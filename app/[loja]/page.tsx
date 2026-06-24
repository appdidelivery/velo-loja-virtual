import CustomerCatalog from '@/components/CustomerCatalog';

export default function LojaDinamica({ params }: { params: { loja: string } }) {
  // A variável params.loja pega exatamente o que está na URL.
  // Exemplo: se o cliente acessar localhost:3000/mamedes, params.loja será "mamedes"
  
  // Na vida real, o seu banco de dados terá tenantId = "mamedes"
  
  return (
    <main>
      <CustomerCatalog tenantId={params.loja} />
    </main>
  );
}