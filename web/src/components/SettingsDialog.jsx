import { useEffect, useState } from 'react';
import Dialog from './ui/Dialog';
import { Field, Input, Select, Button } from './ui/primitives';
import * as speech from '../lib/speech';

export default function SettingsDialog({ open, onClose, cfg, onSave }) {
  const [form, setForm] = useState(cfg);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (open) setForm(cfg);
  }, [open, cfg]);

  useEffect(() => {
    speech.ensureVoicesLoaded().then((v) => setVoices(speech.listVoiceOptions(v)));
  }, []);

  const hiVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('hi'));
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave({
      gradeLevel: parseInt(form.gradeLevel, 10) || 7,
      recognitionLang: form.recognitionLang,
      voiceHi: form.voiceHi,
      voiceEn: form.voiceEn,
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <Button variant="primary" className="w-full" onClick={handleSave}>
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-surface-600 bg-surface-900/60 p-3 text-xs leading-relaxed text-slate-400">
          Loqwi's AI runs through our own backend, which holds the Gemini API key server-side — your browser never sees
          it. These settings only affect how the assistant sounds and which grade level it targets.
        </p>

        <Field label="Grade level (class)">
          <Input
            type="number"
            min={3}
            max={12}
            value={form.gradeLevel}
            onChange={(e) => update('gradeLevel', e.target.value)}
          />
        </Field>

        <Field label="Recognition language" hint="Hindi (hi-IN) handles Hinglish code-switching best.">
          <Select value={form.recognitionLang} onChange={(e) => update('recognitionLang', e.target.value)}>
            <option value="hi-IN">Hindi (hi-IN) — best for Hinglish</option>
            <option value="en-IN">English India (en-IN)</option>
          </Select>
        </Field>

        <Field label="Hindi voice">
          <Select value={form.voiceHi} onChange={(e) => update('voiceHi', e.target.value)}>
            <option value="">Auto</option>
            {hiVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="English voice">
          <Select value={form.voiceEn} onChange={(e) => update('voiceEn', e.target.value)}>
            <option value="">Auto</option>
            {enVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
