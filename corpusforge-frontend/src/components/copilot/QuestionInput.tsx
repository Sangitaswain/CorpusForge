import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2, Send } from 'lucide-react';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
}

const MAX_CHARS = 500;

export default function QuestionInput({ onSubmit, isLoading }: QuestionInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submit = () => {
    const question = value.trim();
    if (!question || question.length > MAX_CHARS || isLoading) return;
    onSubmit(question);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const overLimit = value.length > MAX_CHARS;

  return (
    <div className="fixed bottom-0 inset-x-0 z-10 sm:static bg-bg-void border-t border-border-default px-4 sm:px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask anything about your plant documents..."
            // text-md (16px) specifically, not text-sm/text-base (13px/15px in this
            // project's custom scale) — iOS Safari auto-zooms the whole page on focus for
            // any input under 16px, which would visibly hijack the mobile Ask Forge demo.
            className="flex-1 bg-bg-surface border border-border-default rounded-xl px-4 py-3 text-md text-text-primary placeholder:text-text-muted resize-none min-h-[44px] max-h-[200px] overflow-y-auto focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/20 transition-fast"
          />
          <button
            onClick={submit}
            disabled={isLoading || !value.trim() || overLimit}
            aria-label="Send question"
            className="bg-accent-orange hover:bg-accent-orange-bright rounded-lg p-2.5 disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center transition-fast"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="text-white" />}
          </button>
        </div>
        {overLimit && (
          <p className="text-xs text-red-400 mt-1">Questions must be 500 characters or fewer ({value.length}/500).</p>
        )}
      </div>
    </div>
  );
}
