"use client";
import { useState } from "react";
import { BookOpen, Plus, X, Trash2 } from "lucide-react";
import EditableField from "./EditableField";

type FlashcardType = {
  id: string;
  front: string;
  back: string;
  requirement_ids?: string[];
};

export default function FlashcardBoard({ initialFlashcards, kitId }: { initialFlashcards: FlashcardType[], kitId: string }) {
  const [flashcards, setFlashcards] = useState(initialFlashcards || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.front || !newCard.back) return;

    try {
      const res = await fetch(`/api/kits/${kitId}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setFlashcards([data, ...flashcards]);
      setIsAdding(false);
      setNewCard({ front: '', back: '' });
    } catch (err) {
      if (err instanceof Error) alert(`Failed to add flashcard: ${err.message}`);
      else alert(`Failed to add flashcard: ${String(err)}`);
    }
  };

  const handleEdit = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/kits/${kitId}/flashcards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!res.ok) throw new Error('Failed to update flashcard');
      setFlashcards((items: FlashcardType[]) => 
        items.map(f => f.id === id ? { ...f, [field]: value } : f)
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update flashcard');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      const res = await fetch(`/api/kits/${kitId}/flashcards/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete flashcard');
      setFlashcards((items: FlashcardType[]) => items.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete flashcard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6 mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Manage Flashcards</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Add Custom Flashcard'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddFlashcard} className="glass-card p-6 border border-primary/30 animate-fade-in space-y-4">
          <h3 className="text-lg font-bold">Add Manual Flashcard</h3>
          <p className="text-sm text-textMuted mb-4">Custom flashcards are pinned and will not be lost when you regenerate the AI flashcard deck.</p>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Front (Question)</label>
            <textarea 
              required
              value={newCard.front}
              onChange={e => setNewCard({...newCard, front: e.target.value})}
              placeholder="e.g. What is a closure in JavaScript?"
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Back (Answer)</label>
            <textarea 
              required
              value={newCard.back}
              onChange={e => setNewCard({...newCard, back: e.target.value})}
              placeholder="A closure is..."
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary">Save Flashcard</button>
          </div>
        </form>
      )}

      {flashcards.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-white/5 mx-auto flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-textMuted opacity-50" />
          </div>
          <p className="text-textMuted text-lg">No flashcards available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flashcards.map((f: FlashcardType) => (
            <div key={f.id} className="glass-card p-6 flex gap-4 items-start relative group">
              <div className="flex-grow space-y-4">
                <div className="w-full">
                  <span className="font-semibold text-textMain block mb-1.5 uppercase text-xs tracking-wider opacity-70">Front</span>
                  <EditableField 
                    initialValue={f.front || ""}
                    field="front"
                    kitId=""
                    isTextArea
                    onSave={(val) => handleEdit(f.id, 'front', val)}
                  />
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-borderSubtle shadow-inner w-full">
                  <span className="font-semibold text-textMain block mb-1.5 uppercase text-xs tracking-wider opacity-70">Back</span>
                  <EditableField 
                    initialValue={f.back || ""}
                    field="back"
                    kitId=""
                    isTextArea
                    onSave={(val) => handleEdit(f.id, 'back', val)}
                  />
                </div>
              </div>
              <div className="shrink-0 flex items-start pt-2">
                <button 
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-textMuted hover:text-red-400 focus:outline-none transition-colors opacity-50 group-hover:opacity-100"
                  aria-label="Delete flashcard"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
