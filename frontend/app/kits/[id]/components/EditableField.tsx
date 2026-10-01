"use client";
import { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface EditableFieldProps {
  initialValue: string;
  field?: string;
  kitId?: string;
  isTextArea?: boolean;
  onSave?: (newValue: string) => Promise<void> | void;
}

export default function EditableField({ initialValue, isTextArea, onSave }: EditableFieldProps) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    setStatus("saving");
    try {
      if (onSave) {
        await onSave(value);
      } else {
        // Fallback delay if no onSave handler provided
        await new Promise(resolve => setTimeout(resolve, 600)); 
      }
      
      setStatus("saved");
      setTimeout(() => {
        setStatus("idle");
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to save field:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="group relative pr-10">
        <div className="text-textMuted leading-relaxed whitespace-pre-wrap text-lg">
          {value || <span className="italic opacity-50">Empty</span>}
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute right-0 top-0 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-textMuted hover:text-white"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in space-y-4">
      {isTextArea ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field min-h-[150px] resize-y w-full font-sans leading-relaxed text-lg"
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field w-full font-sans text-lg"
        />
      )}
      
      <div className="flex items-center justify-end gap-3">
        {status === "error" && <span className="text-red-400 text-sm mr-auto font-medium">Failed to save</span>}
        {status === "saved" && <span className="text-green-400 text-sm mr-auto flex items-center gap-1 font-medium"><Check className="w-4 h-4" /> Saved</span>}
        
        <button 
          onClick={handleCancel}
          disabled={status === "saving"}
          className="btn-ghost px-4 py-2 text-sm flex items-center gap-1.5"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={status === "saving"}
          className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
        >
          {status === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
