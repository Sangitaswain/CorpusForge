import { useEffect, useState } from 'react';
import type { ChatMessage } from '../../types/query';
import MessageBubble from '../copilot/MessageBubble';
import StreamingDots from '../copilot/StreamingDots';
import { useRevealOnScroll } from './useRevealOnScroll';

// Real product component, real (previously verified) response data — not a mockup drawn to
// look like the product. If MessageBubble changes, this showcase changes with it for free.
const QUESTION: ChatMessage = {
  id: 'showcase-q',
  type: 'question',
  content: 'What grease should have been used on P-101, and who serviced it last?',
  timestamp: new Date(),
};

const ANSWER: ChatMessage = {
  id: 'showcase-a',
  type: 'answer',
  content:
    'SOP-07 and the OEM manual specify Chevron SRI-2 synthetic grease for P-101. The last ' +
    'service before the failure was Work Order WO-2022-0710 on 10 July 2022, performed by ABC ' +
    'Engineering Services Pvt Ltd (technician Rajesh Nair) — five days before the bearing seized.',
  timestamp: new Date(),
  response: {
    answer: '',
    confidence: 'High',
    citations: [
      { document_id: '46025b90-549e-4f9b-afb7-9f657f03f97e', filename: 'INC-2022-07_P101_Bearing_Failure.txt', page_number: 1 },
    ],
    used_graph: true,
    follow_ups: ['Has ABC Engineering Services caused other failures?'],
  },
};

type Stage = 'question' | 'thinking' | 'answer';

export default function CopilotShowcase() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [stage, setStage] = useState<Stage>('question');

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setStage('thinking'), 500);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (stage !== 'thinking') return;
    const t = setTimeout(() => setStage('answer'), 1100);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div ref={ref} className="max-w-2xl mx-auto flex flex-col gap-3 min-h-[220px]">
      <div className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <MessageBubble message={QUESTION} onFollowUp={() => {}} />
      </div>
      {stage === 'thinking' && (
        <div className="pl-1">
          <StreamingDots />
        </div>
      )}
      {stage === 'answer' && <MessageBubble message={ANSWER} onFollowUp={() => {}} />}
    </div>
  );
}
