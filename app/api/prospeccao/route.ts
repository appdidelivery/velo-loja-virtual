import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { queryTerm, action } = body;

        if (action !== 'prospeccao_serper' || !queryTerm) {
            return NextResponse.json({ success: false, error: 'Parâmetros inválidos.' }, { status: 400 });
        }

        // Chave da API do Serper (Google Search)
        const apiKey = process.env.SERPER_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ 
                success: false, 
                error: 'Chave da API do Serper não encontrada no arquivo .env.local' 
            }, { status: 500 });
        }

        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: queryTerm,
                gl: 'br', // Busca no Brasil
                hl: 'pt-br' // Idioma Português
            })
        });

        const data = await response.json();

        // Se o Serper não retornar locais, devolvemos array vazio
        if (!data.places) {
            return NextResponse.json({ success: true, leads: [] });
        }

        return NextResponse.json({
            success: true,
            leads: data.places
        });

    } catch (error: any) {
        console.error("Erro na API de Prospecção:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}