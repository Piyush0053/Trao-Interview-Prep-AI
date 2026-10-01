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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`glass-card p-6 mb-5 flex gap-5 items-start group relative ${isDragging ? 'opacity-80 ring-2 ring-primary shadow-2xl scale-[1.02]' : ''}`}
    >
      <div className="flex flex-col items-center gap-1">
        <div 
          {...attributes} 
          {...listeners}
          className="p-1 rounded-md cursor-grab active:cursor-grabbing text-textMuted opacity-30 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button 
            type="button"
            onClick={() => onMove(question.id, 'up')}
            disabled={index === 0}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Move question up"
            title="Move up"
          >
            ↑
          </button>
          <button 
            type="button"
            onClick={() => onMove(question.id, 'down')}
            disabled={index === total - 1}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-textMuted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Move question down"
            title="Move down"
          >
            ↓
          </button>
        </div>
      </div>
      <div className="flex-grow space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-textMuted uppercase tracking-wider shadow-inner shadow-white/5">
              {question.category}
            </span>
            <span className="text-xs text-textMain font-medium flex items-center gap-1 bg-surfaceHighlight px-3 py-1 rounded-full border border-borderSubtle">
              Difficulty: <span className="text-primary">{question.difficulty}/3</span>
            </span>
          </div>
          <button 
            type="button"
            onClick={() => onDelete(question.id)}
            className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-textMuted hover:text-red-400 focus:outline-none transition-colors"
            aria-label="Delete question"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full">
          <EditableField 
            initialValue={question.prompt || ""}
            field="prompt"
            kitId=""
            onSave={(val) => onEdit(question.id, 'prompt', val)}
          />
        </div>
        <div className="p-4 rounded-xl bg-black/30 border border-borderSubtle shadow-inner">
          <span className="font-semibold text-textMain block mb-1.5 uppercase text-xs tracking-wider opacity-70">Answer Outline</span>
          <EditableField 
            initialValue={question.answer_outline || ""}
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
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      
      <div className="flex justify-end">
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Add Custom Question'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddQuestion} className="glass-card p-6 border border-primary/30 animate-fade-in space-y-4">
          <h3 className="text-lg font-bold">Add Manual Question</h3>
          <p className="text-sm text-textMuted mb-4">Custom questions are pinned and will not be lost when you regenerate the AI question bank.</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Category</label>
              <select 
                value={newQuestion.category}
                onChange={e => setNewQuestion({...newQuestion, category: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Difficulty (1-3)</label>
              <select 
                value={newQuestion.difficulty}
                onChange={e => setNewQuestion({...newQuestion, difficulty: parseInt(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value={1}>1 - Beginner</option>
                <option value={2}>2 - Intermediate</option>
                <option value={3}>3 - Advanced</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Question Prompt</label>
            <textarea 
              required
              value={newQuestion.prompt}
              onChange={e => setNewQuestion({...newQuestion, prompt: e.target.value})}
              placeholder="e.g. How does React's virtual DOM work?"
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-textMuted uppercase tracking-wider">Answer Outline / Key Points</label>
            <textarea 
              required
              value={newQuestion.answer_outline}
              onChange={e => setNewQuestion({...newQuestion, answer_outline: e.target.value})}
              placeholder="Key concepts to cover in the answer..."
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary">Save Question</button>
          </div>
        </form>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-white/5 mx-auto flex items-center justify-center mb-6">
            <BrainCircuit className="w-10 h-10 text-textMuted opacity-50" />
          </div>
          <p className="text-textMuted text-lg">No questions generated yet.</p>
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
