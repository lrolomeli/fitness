import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';

const MODULE_LABELS = {
  items: 'Item',
};

const INPUT =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60';

export default function ItemsSection({ module }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const label = MODULE_LABELS[module] || 'Elemento';

  useEffect(() => {
    let alive = true;
    setItems(null);
    setTitle('');
    setNotes('');
    setError('');
    api
      .get(`/api/items?module=${module}`)
      .then((data) => {
        if (alive) setItems(data);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [module]);

  const add = async (e) => {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.post('/api/items', {
        module,
        title: title.trim(),
        data: { notes: notes.trim() },
      });
      setItems((prev) => [created, ...(prev || [])]);
      setTitle('');
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id) => {
    setError('');
    try {
      await api.delete(`/api/items/${id}`);
      setItems((prev) => (prev || []).filter((it) => it.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <Card title={`Nuevo ${label.toLowerCase()}`}>
        <form className="flex flex-col gap-2.5" onSubmit={add}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            placeholder={`Título del ${label.toLowerCase()}`}
            className={INPUT}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
            rows={2}
            placeholder="Notas (opcional)"
            className={`${INPUT} resize-none`}
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Agregar
          </button>
        </form>
      </Card>

      <Card title={module}>
        {error && (
          <Banner variant="err" className="mb-3">
            {error}
          </Banner>
        )}

        {items === null ? (
          <Spinner label="Cargando…" />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/45">
            Aún no hay nada por aquí. Agrega lo primero.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm text-white">{it.title}</p>
                  {it.data?.notes && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-white/50">
                      {it.data.notes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="shrink-0 rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/20"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
