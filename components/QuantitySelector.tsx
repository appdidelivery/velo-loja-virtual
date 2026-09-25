'use client';

import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

type Props = {
  productName: string;
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
};

export default function QuantitySelector({ productName, quantity, max, onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-1 shrink-0" onClick={event => event.stopPropagation()}>
      <label htmlFor={id} className="text-[10px] font-bold text-slate-500">Quantidade</label>
      <div className="flex items-center rounded-lg border border-gray-200 bg-white text-slate-800 overflow-hidden">
        <button type="button" aria-label={`Diminuir quantidade de ${productName}`} disabled={quantity <= 0}
          onClick={() => { setDraft(null); onChange(quantity - 1); }}
          className="w-9 h-10 flex items-center justify-center bg-gray-50 disabled:opacity-40">
          <Minus size={14} />
        </button>
        <input id={id} type="text" inputMode="numeric" pattern="[0-9]*"
          aria-label={`Quantidade de ${productName}`} disabled={max === 0}
          value={draft ?? String(quantity)}
          onFocus={event => event.target.select()}
          onChange={event => {
            const value = event.target.value;
            if (value === '') { setDraft(''); return; }
            if (!/^\d+$/.test(value)) return;
            const number = Number(value);
            if (!Number.isSafeInteger(number)) return;
            const bounded = Math.min(number, max);
            setDraft(String(bounded));
            onChange(bounded);
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
          className="w-12 h-10 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500 disabled:opacity-40"
        />
        <button type="button" aria-label={`Aumentar quantidade de ${productName}`} disabled={quantity >= max}
          onClick={() => { setDraft(null); onChange(quantity + 1); }}
          className="w-9 h-10 flex items-center justify-center bg-gray-50 disabled:opacity-40">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
