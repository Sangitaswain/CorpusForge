import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ChatMessage } from '../types/query';
import { useAskQuestion } from '../hooks/useQuery';
import ExampleQuestions from '../components/copilot/ExampleQuestions';
import MessageBubble from '../components/copilot/MessageBubble';
import QuestionInput from '../components/copilot/QuestionInput';
import StreamingDots from '../components/copilot/StreamingDots';

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const ask = useAskQuestion();
  const location = useLocation();
  const threadEndRef = useRef<HTMLDivElement>(null);
  const askedFromState = useRef(false);

  const handleSubmit = async (question: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: 'question', content: question, timestamp: new Date() },
    ]);
    // mutateAsync + try/catch: mutate()-level callbacks are skipped if the
    // observer unmounts mid-flight (e.g. StrictMode remount on the
    // graph → copilot navigation), which left the thread stuck on the loader
    try {
      const response = await ask.mutateAsync(question);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'answer', content: response.answer, response, timestamp: new Date() },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'answer',
          content: error instanceof Error ? error.message : 'Unable to get an answer. Please try again.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  // "Open in Copilot" from the graph passes a pre-filled question via location state
  useEffect(() => {
    const prefill = (location.state as { question?: string } | null)?.question;
    if (prefill && !askedFromState.current) {
      askedFromState.current = true;
      handleSubmit(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ask.isPending]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Ask Forge</h1>
          {messages.length === 0 && !ask.isPending ? (
            <ExampleQuestions onSelect={handleSubmit} />
          ) : (
            <div className="flex flex-col gap-4 mt-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onFollowUp={handleSubmit} />
              ))}
              {ask.isPending && (
                <div className="bg-bg-surface border border-border-default rounded-2xl rounded-tl-sm w-full px-5 py-4">
                  <StreamingDots />
                </div>
              )}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>
      </div>
      <QuestionInput onSubmit={handleSubmit} isLoading={ask.isPending} />
    </div>
  );
}
