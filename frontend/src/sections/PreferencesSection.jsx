import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import SegmentedControl from '../components/ui/SegmentedControl';
import { api } from '../lib/api';
import { INPUT, LABEL, BTN, BTN_DANGER } from '../lib/ui';

const TYPE_OPTIONS = [
  { value: 'favorite', label: 'Favorito' },
  { value: 'banned', label: 'Vetado' },
  { value: 'restriction', label: 'Restricción' },
];

const TYPE_LABELS = {
  favorite: 'Favoritos',
  banned: 'Vetados (nunca proponer)',
  restriction: 'Restricciones',
};

export default function PreferencesSection({ onChanged }) {
  const [items, setItems] = useState(null);
  const [type, setType] = useState('favorite');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setItems(await api.get('/api/preferences'));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/preferences', { type, value: value.trim(), notes: notes.trim() });
      setValue('');
      setNotes('');
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await api.delete(`/api/preferences/${id}`);
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <Card title="Agregar preferencia">
        <form className="flex flex-col gap-2.5" onSubmit={add}>
          {error && <Banner variant="err">{error}</Banner>}
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} wrap />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej. pollo, brócoli, sin lactosa…"
            className={INPUT}
            disabled={busy}
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className={INPUT}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !value.trim()} className={BTN}>
            Agregar
          </button>
        </form>
      </Card>

      {items === null ? (
        <Spinner />
      ) : (
        ['favorite', 'banned', 'restriction'].map((group) => {
          const groupItems = items.filter((it) => it.type === group);
          return (
            <Card key={group} title={`${TYPE_LABELS[group]} (${groupItems.length})`}>
              {groupItems.length === 0 ? (
                <p className="py-3 text-center text-sm text-white/45">Sin registros.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {groupItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm text-white">{it.value}</p>
                        {it.notes && <p className="text-xs text-white/45">{it.notes}</p>}
                      </div>
                      <button type="button" onClick={() => remove(it.id)} className={BTN_DANGER}>
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
