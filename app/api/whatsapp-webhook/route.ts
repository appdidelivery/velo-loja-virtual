// CÓDIGO NOVO
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';

// Token de verificação da Meta. No painel de Desenvolvedor do Facebook você configura isso.
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'velo_webhook_secret';

// Rota GET: Usada EXCLUSIVAMENTE pela Meta (Facebook) para validar o Webhook no momento da configuração
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado pela Meta com sucesso!');
        return new NextResponse(challenge, { status: 200 });
    }
    
    return new NextResponse('Forbidden', { status: 403 });
}

// Rota POST: Recebe as mensagens enviadas pelos clientes (ou dono da loja) para o número oficial
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Verifica se é de fato um evento vindo do WhatsApp Business
        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not a WhatsApp event', { status: 404 });
        }

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        // Se realmente tiver uma mensagem dentro do pacote
        if (messages && messages.length > 0) {
            const message = messages[0];
            const fromPhone = message.from; // Número de quem enviou (Ex: 5511999999999)
            const messageText = message.text?.body;

            if (fromPhone && messageText) {
                console.log(`💬 Mensagem recebida de ${fromPhone}: ${messageText}`);

                // SPRINT 2: IDENTIFICAÇÃO DE PERMISSÃO (TENANT)
                // Vamos consultar no Firebase qual loja pertence a este número (Matriz de Permissões)
                const tenantsRef = collection(db, 'tenants');
                const adminQuery = query(tenantsRef, where('adminPhones', 'array-contains', fromPhone));
                const querySnapshot = await getDocs(adminQuery);

                if (querySnapshot.empty) {
                    // Proteção Sênior contra vazamentos: Se o número não for admin de nenhuma loja, ignoramos SILENCIOSAMENTE.
                    console.log(`🔒 Ignorado: O número ${fromPhone} não tem permissões de Admin em nenhum Tenant.`);
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                // Bingo! O número é um Admin autorizado. Vamos extrair o ID da Loja (TenantId) e os dados.
                const tenantDoc = querySnapshot.docs[0];
                const tenantId = tenantDoc.id;
                const tenantData = tenantDoc.data();

                console.log(`✅ Acesso Liberado: O número ${fromPhone} pertence ao Tenant [${tenantId}]. Iniciando injeção de IA...`);

                // AQUI ENTRARÁ O SPRINT 3 e 4 (A Chamada da LLM com as Tools)
                
            }
        }

        // Importante: A Meta exige que sempre retornemos 200 rapidamente, senão eles ficam re-tentando enviar a mesma requisição sem parar.
        return new NextResponse('EVENT_RECEIVED', { status: 200 });

    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        // Mesmo no erro, respondemos 200 para a Meta parar de enviar spam de retentativas
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
}