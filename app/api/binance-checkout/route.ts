import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import crypto from "crypto";

// Função utilitária para gerar strings randômicas (nonce) exigidas pela Binance
function generateNonce(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    // 1. Recebe os dados do body
    const body = await request.json();
    const { storeId, orderId, totalAmount, currency = "BRL" } = body;

    if (!storeId || !orderId || !totalAmount) {
      return NextResponse.json(
        { success: false, error: "Parâmetros obrigatórios ausentes (storeId, orderId, totalAmount)." },
        { status: 400 }
      );
    }

    // 2 e 3. Busca no Firestore as credenciais exclusivas do lojista
    const storeRef = doc(db, "stores", storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return NextResponse.json({ success: false, error: "Loja não encontrada." }, { status: 404 });
    }

    const storeData = storeSnap.data();
    const binanceApiKey = storeData?.binanceApiKey;
    const binanceSecretKey = storeData?.binanceSecretKey;

    if (!binanceApiKey || !binanceSecretKey) {
      return NextResponse.json(
        { success: false, error: "Credenciais da Binance não configuradas para esta loja." },
        { status: 400 }
      );
    }

    // Preparar o payload para a API da Binance
    const reqBody = {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo: orderId,
      orderAmount: Number(totalAmount).toFixed(2), // Binance exige formato decimal estrito
      currency: currency,
      goods: {
        goodsType: "02", // 02 representa bens virtuais/serviços, ajuste conforme necessidade
        goodsCategory: "Z000", // Categoria genérica
        referenceGoodsId: orderId,
        goodsName: `Pedido ${orderId}`,
        goodsDetail: `Pagamento do pedido ${orderId} na loja ${storeId}`,
      },
    };

    const jsonPayload = JSON.stringify(reqBody);

    // 4. Gera a assinatura HMAC-SHA512
    const timestamp = Date.now().toString();
    const nonce = generateNonce();
    
    // O formato exigido pela Binance para assinar é: timestamp + "\n" + nonce + "\n" + body + "\n"
    const payloadToSign = `${timestamp}\n${nonce}\n${jsonPayload}\n`;

    const signature = crypto
      .createHmac("sha512", binanceSecretKey)
      .update(payloadToSign)
      .digest("hex")
      .toUpperCase();

    // 5. Faz o POST para a API oficial da Binance Pay
    const binanceResponse = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": binanceApiKey,
        "BinancePay-Signature": signature,
      },
      body: jsonPayload,
    });

    const binanceData = await binanceResponse.json();

    if (binanceData.status !== "SUCCESS") {
      console.error("🔴 Erro na API da Binance:", binanceData);
      return NextResponse.json(
        { success: false, error: "Falha ao gerar cobrança na Binance.", details: binanceData },
        { status: 400 }
      );
    }

    // 6. Retorna para o frontend as URLs geradas
    return NextResponse.json({
      success: true,
      checkoutUrl: binanceData.data.universalUrl || binanceData.data.checkoutUrl,
      qrcodeLink: binanceData.data.qrcodeLink,
    });

  } catch (error: any) {
    console.error("🔴 Erro crítico na rota de checkout Binance:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao processar o checkout." },
      { status: 500 }
    );
  }
}