import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = body.path;

    if (!path) {
      return NextResponse.json({ message: 'O caminho (path) é obrigatório' }, { status: 400 });
    }

    // Limpa o cache da Vercel para a URL específica da loja (ex: /mamedes)
    revalidatePath(path, 'page');

    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(), 
      message: `Cache limpo com sucesso para: ${path}` 
    });
  } catch (err: any) {
    return NextResponse.json({ 
      message: 'Erro ao limpar o cache', 
      error: err.message 
    }, { status: 500 });
  }
}