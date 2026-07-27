import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { storeName, storeNiche, productName, productDesc, productPrice } = body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Chave GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
        }

        // 🚀 PROMPT E-E-A-T (Especialidade e Autoridade Local)
        const promptText = `Atue como um Especialista em SEO Local (E-E-A-T) e Copywriter de Alta Conversão.
Sua missão é criar uma postagem orgânica, autêntica e rica em detalhes para o Google Meu Negócio.
O texto NÃO PODE parecer gerado por IA (proibido usar clichês de robô como "mergulhe", "descubra", "eleve sua experiência", "jornada de sabor").

DADOS DA LOJA E PRODUTO:
- Loja: ${storeName}
- Nicho: ${storeNiche}
- Produto: ${productName}
- Preço: R$ ${productPrice ? Number(productPrice).toFixed(2) : 'Consultar'}
- Detalhes: ${productDesc || 'Sem detalhes extras.'}

REGRAS DE CONTEÚDO:
1. "postagem": Escreva 1 parágrafo (máximo de 350 caracteres). Aplique E-E-A-T: demonstre especialidade mencionando sutilmente a qualidade ou o estado ideal do produto (Ex: trincando de gelado, recém-preparado). Posicione a loja como a melhor opção da região.
2. "hashtags": 4 a 5 hashtags focadas no produto e no nicho.

Retorne APENAS um JSON válido.
Formato exigido:
{"postagem": "texto da postagem aqui", "hashtags": "#tag1 #tag2"}`;

        // 🚀 MOTOR DE AUTO-CURA (Roleta de Modelos Testados e Baratos)
        const modelsToTry = ['gemini-3.5-flash', 'gemini-3-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let aiData: any = null;
        let responseOk = false;

        for (const model of modelsToTry) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            aiData = await response.json();

            if (response.ok) {
                responseOk = true;
                console.log(`✅ Sucesso IA (Velo Varejo) com o modelo: ${model}`);
                break;
            }
        }

        if (!responseOk) {
            console.error("🚨 Erro detalhado do Gemini (Velo Varejo):", JSON.stringify(aiData, null, 2));
            throw new Error(aiData.error?.message || "O Google recusou a requisição em todos os modelos testados.");
        }

        const rawJsonText = aiData.candidates[0].content.parts[0].text.trim();
        
        // Limpador de formatação para evitar quebra do JSON
        const cleanJsonText = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanJsonText);

        // O Frontend Velo Varejo espera a variável "instagram" preenchida com o texto final.
        // A gente junta o texto + as hashtags magicamente aqui no backend!
        const finalCopy = `${parsedResult.postagem}\n\n${parsedResult.hashtags}`;

        return NextResponse.json({ 
            success: true, 
            instagram: finalCopy 
        });

    } catch (error: any) {
        console.error("🔴 Erro ao gerar copy IA (Gemini):", error);
        // Retornamos status 200 com success: false para o frontend exibir a mensagem no alert 
        // e não estourar a tela do navegador com erro 500.
        return NextResponse.json({ success: false, error: error.message });
    }
}