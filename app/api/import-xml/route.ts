import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { xmlUrl } = await req.json();

    if (!xmlUrl) {
      return NextResponse.json({ error: 'URL do XML não fornecida.' }, { status: 400 });
    }

    // 1. O servidor do Next.js faz o fetch "por baixo dos panos"
    // Nenhum bloqueio de CORS afeta requisições Server-to-Server!
    const response = await fetch(xmlUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/xml, application/xml'
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao ler o arquivo XML. O servidor retornou o status: ${response.status}`);
    }

    const xmlText = await response.text();

    if (!xmlText || (!xmlText.includes("<?xml") && !xmlText.includes("<rss") && !xmlText.includes("<feed"))) {
      throw new Error("O link fornecido não retornou um formato XML/RSS válido.");
    }

    // 2. Devolve o texto XML puro para o Painel Admin processar e salvar no Firebase
    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error("Erro interno ao buscar XML:", error);
    return NextResponse.json({ error: error.message || 'Erro ao processar a importação.' }, { status: 500 });
  }
}