"use client";
import { useState } from "react";
import { BrainCircuit, GripVertical, Plus, X, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type QuestionType = {
  id: string;
  category?: string;
  difficulty?: number;
  prompt?: string;
  answer_outline?: string;
};

import EditableField from "./EditableField";

function SortableQuestionItem({ 
  question, index, total, onMove, onEdit, onDelete 
}: { 
  question: QuestionType, index: number, total: number, 
  onMove: (id: string, direction: 'up' | 'down') => void,
  onEdit: (id: string, field: string, value: string) => void,
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const catGradient: Record<string, string> = {
    technical:     'card-gradient-technical',
    behavioural:   'card-gradient-behavioural',
    'system-design': 'card-gradient-system-design',
    'company-fit': 'card-gradient-company-fit',
  };
  const diffBadge = question.difficulty === 3 ? 'badge-red' : question.difficulty === 2 ? 'badge-amber' : 'badge-green';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-gradient mb-4 group relative transition-all duration-200
        ${isDragging ? 'opacity-80 ring-2 ring-primary shadow-glow-cyan scale-[1.01]' : ''}`}
    >
      {/* Gradient header */}
      <div className={`card-gradient-header ${catGradient[question.category || ''] || 'card-gradient-technical'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-white/60 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
            aria-label="Drag to reorder"
            tabIndex={0}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">{question.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${diffBadge} text-[10px]`}>{question.difficulty}/3</span>
          {/* Arrow reorder buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onMove(question.id, 'up')}
              disabled={index === 0}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
              aria-label="Move up"
            >↑</button>
            <button
              type="button"
              onClick={() => onMove(question.id, 'down')}
              disabled={index === total - 1}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
              aria-label="Move down"
            >↓</button>
          </div>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="p-1.5 rounded bg-white/10 hover:bg-red-500/40 text-white/70 hover:text-white focus:outline-none transition-colors"
            aria-label="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="w-full">
          <EditableField
            initialValue={question.prompt || ''}
            field="prompt"
            kitId=""
            onSave={(val) => onEdit(question.id, 'prompt', val)}
          />
        </div>
        <div className="p-3 rounded-lg bg-surfaceHighlight border border-borderSubtle">
          <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1.5">Answer Outline</span>
          <EditableField
            initialValue={question.answer_outline || ''}
            field="answer_outline"
            kitId=""
            isTextArea
            onSave={(val) => onEdit(question.id, 'answer_outline', val)}
          />
        </div>
      </div>
    </div>
  );
}

export default function QuestionBoard({ initialQuestions, kitId }: { initialQuestions: QuestionType[], kitId: string }) {
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ category: 'technical', prompt: '', answer_outline: '', difficulty: 2 });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setQuestions((items: QuestionType[]) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Call API to persist reorder
        fetch(`/api/kits/${kitId}/questions/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: newItems.map(q => q.id) })
        }).catch(console.error);

        return newItems;
      });
    }
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    setQuestions((items: QuestionType[]) => {
      const index = items.findIndex(i => i.id === id);
      if (index < 0) return items;
      if (direction === 'up' && index === 0) return items;
      if (direction === 'down' && index === items.length - 1) return items;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newItems = arrayMove(items, index, newIndex);
      
      // Call API to persist reorder
      fetch(`/api/kits/${kitId}/questions/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newItems.map(q => q.id) })
      }).catch(console.error);

      return newItems;
    });
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.prompt || !newQuestion.answer_outline) return;

    try {
      const res = await fetch(`/api/kits/${kitId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setQuestions([data, ...questions]);
      setIsAdding(false);
      setNewQuestion({ category: 'technical', prompt: '', answer_outline: '', difficulty: 2 });
    } catch (err) {
      if (err instanceof Error) alert(`Failed to add question: ${err.message}`);
      else alert(`Failed to add question: ${String(err)}`);
    }
  };

  const handleEdit = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/kits/${kitId}/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!res.ok) throw new Error('Failed to update question');
      setQuestions((items: QuestionType[]) => 
        items.map(q => q.id === id ? { ...q, [field]: value } : q)
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update question');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/kits/${kitId}/questions/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete question');
      setQuestions((items: QuestionType[]) => items.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete question');
    }
  };

  return (
    <div className="w-full animate-fade-in space-y-4">

      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn-secondary text-xs py-2 gap-2"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAdding ? 'Cancel' : 'Add Custom Question'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddQuestion} className="panel border border-primary/25 animate-fade-in overflow-hidden">
          <div className="card-gradient-header card-gradient-technical flex items-center gap-2">
            <Plus className="w-4 h-4 text-white/80" />
            Add Custom Question
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-textSecondary">Custom questions are <strong className="text-primary">pinned</strong> and survive AI regeneration.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  value={newQuestion.category}
                  onChange={e => setNewQuestion({...newQuestion, category: e.target.value})}
                  className="input-select"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioural">Behavioural</option>
                  <option value="system-design">System Design</option>
                  <option value="company-fit">Company Fit</option>
                </select>
              </div>
              <div>
                <label className="label">Difficulty</label>
                <select
                  value={newQuestion.difficulty}
                  onChange={e => setNewQuestion({...newQuestion, difficulty: parseInt(e.target.value)})}
                  className="input-select"
                >
                  <option value={1}>1 — Beginner</option>
                  <option value={2}>2 — Intermediate</option>
                  <option value={3}>3 — Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Question Prompt</label>
              <textarea
                required
                value={newQuestion.prompt}
                onChange={e => setNewQuestion({...newQuestion, prompt: e.target.value})}
                placeholder="e.g. How does React's virtual DOM work?"
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="label">Answer Outline / Key Points</label>
              <textarea
                required
                value={newQuestion.answer_outline}
                onChange={e => setNewQuestion({...newQuestion, answer_outline: e.target.value})}
                placeholder="Key concepts to cover in the answer…"
                className="input-field min-h-[80px]"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary text-sm gap-2">
                <BrainCircuit className="w-4 h-4" /> Save Question
              </button>
            </div>
          </div>
        </form>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-surfaceHighlight mx-auto flex items-center justify-center mb-4 border border-borderStrong">
            <BrainCircuit className="w-7 h-7 text-textMuted/50" />
          </div>
          <p className="text-sm text-textMuted">No questions generated yet.</p>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={questions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {questions.map((q: QuestionType, i: number) => (
              <SortableQuestionItem 
                key={q.id} 
                question={q} 
                index={i} 
                total={questions.length} 
                onMove={handleMove} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
