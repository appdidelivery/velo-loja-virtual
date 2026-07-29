import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
// Importa a sua conexão do Firebase que já existe no projeto
import { db } from "../../../services/firebase";

export async function POST(request: Request) {
  try {
    // 1. Recebe os dados enviados pelo Front-end (AdminDashboard)
    const body = await request.json();
    const { valor, descricao, tenantId, customerEmail } = body;

    if (!valor || !descricao || !tenantId) {
      return NextResponse.json(
        { error: "Os parâmetros 'valor', 'descricao' e 'tenantId' são obrigatórios." },
        { status: 400 }
      );
    }

    // 2. Busca o token do Mercado Pago salvo no documento do Lojista (Tenant)
    const tenantRef = doc(db, "tenants", tenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const tenantData = tenantSnap.data();
    
    // Busca onde o token foi salvo (respeitando a estrutura do seu AdminDashboard)
    const accessToken = tenantData?.integrations?.mercadopago?.accessToken || tenantData?.mpAccessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Este lojista não possui um Token do Mercado Pago configurado." },
        { status: 400 }
      );
    }

    // 3. Inicializa o Mercado Pago com o token do lojista específico
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken, 
      options: { timeout: 10000 } 
    });
    
    const payment = new Payment(client);

    // 4. Monta o payload de cobrança PIX
    const paymentData = {
      transaction_amount: Number(valor),
      description: descricao,
      payment_method_id: "pix",
      payer: {
        email: customerEmail || "comprador.pdv@velodelivery.com.br"
      }
    };

    // 5. Envia para o Mercado Pago
    const mpResponse = await payment.create({ body: paymentData });

    // 6. Salva a transação no seu Firebase para controle financeiro
    const transactionId = String(mpResponse.id);
    const transactionRef = doc(db, "transactions", transactionId);

    await setDoc(transactionRef, {
      id: transactionId,
      tenantId: tenantId,
      valor: Number(valor),
      descricao: descricao,
      status: "pending",
      mpStatus: mpResponse.status,
      paymentMethod: "pix",
      createdAt: serverTimestamp() // Usa a data do servidor do Firebase
    });

    // 7. Extrai os dados do QR Code gerado
    const qrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64;
    const pixEmv = mpResponse.point_of_interaction?.transaction_data?.qr_code;

    if (!qrCodeBase64 || !pixEmv) {
      throw new Error("Mercado Pago não retornou os dados do QR Code.");
    }

    // 8. Devolve sucesso para a tela do Frente de Caixa
    return NextResponse.json({
      success: true,
      transactionId: transactionId,
      qrCodeBase64: qrCodeBase64,
      pixEmv: pixEmv,
      message: "PIX gerado com sucesso."
    });

  } catch (error: any) {
    console.error("[VeloPay] Erro na rota PIX:", error);
    return NextResponse.json(
      { error: "Falha interna ao gerar PIX", details: error.message },
      { status: 500 }
    );
  }
}