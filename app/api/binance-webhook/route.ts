import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. Lendo os headers obrigatórios da Binance (em minúsculo pois o Next.js os converte)
    const timestamp = request.headers.get("binancepay-timestamp");
    const nonce = request.headers.get("binancepay-nonce");
    const signature = request.headers.get("binancepay-signature");

    // Lemos o raw text primeiro, pois a assinatura deve ser feita sobre o payload exato recebido
    const rawBody = await request.text();

    if (!timestamp || !nonce || !signature || !rawBody) {
      console.error("🔴 Webhook Binance: Headers ou body ausentes.");
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "Missing headers" }, { status: 400 });
    }

    // Parseando o body para extrair os dados lógicos
    const parsedBody = JSON.parse(rawBody);
    
    // Na estrutura da Binance, os detalhes ficam dentro de bizId ou data
    // O merchantTradeNo é o nosso orderId original
    const orderId = parsedBody.data?.merchantTradeNo || parsedBody.bizId; 
    const paymentStatus = parsedBody.bizStatus;

    if (!orderId) {
      console.error("🔴 Webhook Binance: ID do pedido não encontrado no payload.");
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid payload" }, { status: 400 });
    }

    // Para validar a assinatura, precisamos da Secret Key da loja.
    // Primeiro buscamos o pedido para descobrir qual é a loja dona desse pedido.
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      console.error(`🔴 Webhook Binance: Pedido ${orderId} não encontrado no Firestore.`);
      // Retornamos SUCCESS para a Binance parar de insistir, já que o erro é do nosso lado
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "" });
    }

    const orderData = orderSnap.data();
    const storeId = orderData.storeId;

    if (!storeId) {
      console.error(`🔴 Webhook Binance: Pedido ${orderId} não possui storeId atrelado.`);
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "" });
    }

    // Buscando a Secret Key da Loja
    const storeRef = doc(db, "stores", storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      console.error(`🔴 Webhook Binance: Loja ${storeId} não encontrada.`);
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "" });
    }

    const binanceSecretKey = storeSnap.data().binanceSecretKey;

    if (!binanceSecretKey) {
      console.error(`🔴 Webhook Binance: Loja ${storeId} não possui binanceSecretKey configurada.`);
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "" });
    }

    // 3. Valida a assinatura HMAC-SHA512
    const payloadToSign = `${timestamp}\n${nonce}\n${rawBody}\n`;
    
    const expectedSignature = crypto
      .createHmac("sha512", binanceSecretKey)
      .update(payloadToSign)
      .digest("hex")
      .toUpperCase();

    if (signature !== expectedSignature) {
      console.error("🔴 Webhook Binance: Assinatura inválida. Tentativa de fraude detectada.");
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid signature" }, { status: 401 });
    }

    // 4. Se a assinatura é válida e o status for sucesso, atualiza o Firestore
    // Na v2 da Binance Pay, pagamentos concluidos costumam vir como "PAY_SUCCESS"
    if (paymentStatus === "PAY_SUCCESS" || paymentStatus === "SUCCESS") {
      await updateDoc(orderRef, {
        status: "paid",
        paymentMethod: "binance_pay",
        paidAt: new Date().toISOString(),
      });
      console.log(`🟢 Webhook Binance: Pedido ${orderId} marcado como pago com sucesso.`);
    } else {
      console.log(`🟡 Webhook Binance: Pedido ${orderId} recebido com status: ${paymentStatus}`);
    }

    // 5. Retorna o formato exigido para a Binance parar de enviar tentativas
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "" });

  } catch (error: any) {
    console.error("🔴 Erro crítico no Webhook da Binance:", error);
    // Retornamos 500 ou 400 mas sempre informando a Binance caso possamos.
    // Em caso de erro grave, retornar FAIL faz a Binance reenviar o webhook mais tarde.
    return NextResponse.json({ returnCode: "FAIL", returnMessage: "Internal Server Error" }, { status: 500 });
  }
}