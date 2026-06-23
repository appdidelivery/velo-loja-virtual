import AdminDashboard from '../../components/AdminDashboard';

export const metadata = {
  title: 'Painel do Lojista | Velo Varejo SaaS',
  description: 'Gerencie seu catálogo, pedidos e atendimento do WhatsApp.',
};

export default function AdminPage() {
  return (
    <main>
      <AdminDashboard />
    </main>
  );
}