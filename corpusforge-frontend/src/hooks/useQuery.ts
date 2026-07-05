import { useMutation } from '@tanstack/react-query';
import { postQuery } from '../api/query';

export function useAskQuestion() {
  return useMutation({ mutationFn: postQuery });
}
