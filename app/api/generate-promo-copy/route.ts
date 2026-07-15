import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { storeName, storeNiche, productName, productDesc, productPrice } = body;

        // A Velo usa nativamente o Gemini da Google
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Chave GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
        }

        // Prompt Velo Delivery - Focado em SEO Local e Conversão
        const promptText = `
Você é um especialista em Marketing Digital e Vendas focado em SEO Local (Google Meu Negócio).
Sua missão é escrever uma postagem altamente persuasiva e chamativa para a aba "Atualizações/Ofertas" do Google Meu Negócio da seguinte empresa:

- Nome da Loja: ${storeName}
- Segmento/Nicho: ${storeNiche}

Dados do Produto/Serviço em destaque:
- Produto: ${productName}
- Preço Promocional: R$ ${productPrice}
- Detalhes adicionais: ${productDesc || 'Nenhum detalhe extra fornecido.'}

Regras estritas para a criação do texto:
1. Comece com uma frase de impacto ou pergunta que gere desejo imediato.
2. Destaque os benefícios do produto e o preço de forma clara.
3. Use emojis estratégicos para chamar atenção, mas não polua o texto.
4. O texto deve ser curto, direto ao ponto e persuasivo (máximo 700 caracteres).
5. Termine OBRIGATORIAMENTE com uma Forte Chamada para Ação (CTA) convidando o cliente a clicar no botão abaixo, visitar a loja, ou pedir agora.
        `;

        // Chamada direta para a API do Google Gemini (usando o modelo rápido 1.5 flash)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro detalhado do Gemini:", data);
            throw new Error(data.error?.message || "Erro de conexão com o Google Gemini.");
        }

        // Extrai a resposta gerada pelo Gemini
        const generatedText = data.candidates[0].content.parts[0].text.trim();

        // O Frontend Velo espera a variável "instagram" (pois a lógica foi herdada do feed social)
        return NextResponse.json({ 
            success: true, 
            instagram: generatedText 
        });

    } catch (error: any) {
        console.error("Erro ao gerar copy IA (Gemini):", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}