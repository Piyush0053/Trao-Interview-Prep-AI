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
      <div className="group relative pr-8">
        <div className="text-textSecondary leading-relaxed whitespace-pre-wrap text-sm">
          {value || <span className="italic opacity-40 text-textMuted">Empty — click pencil to edit</span>}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="absolute right-0 top-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-surfaceHighlight transition-all text-textMuted hover:text-primary"
          aria-label="Edit field"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in space-y-3">
      {isTextArea ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field min-h-[120px] resize-y w-full text-sm leading-relaxed"
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field w-full text-sm"
        />
      )}

      <div className="flex items-center justify-end gap-2">
        {status === "error" && (
          <span className="text-red-400 text-xs mr-auto font-medium flex items-center gap-1">
            Failed to save
          </span>
        )}
        {status === "saved" && (
          <span className="text-green-400 text-xs mr-auto flex items-center gap-1 font-medium">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        <button
          onClick={handleCancel}
          disabled={status === "saving"}
          className="btn-ghost px-3 py-1.5 text-xs gap-1"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="btn-primary px-4 py-1.5 text-xs gap-1.5"
        >
          {status === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
    </div>
  );
}
