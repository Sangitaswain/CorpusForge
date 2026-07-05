import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteDocument, getDocumentStatus, listDocuments, uploadDocument } from '../api/documents';

export function useDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: listDocuments });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Polls a processing document every 3s; stops and refreshes the list when it settles. */
export function useDocumentStatus(id: string, processing: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['document-status', id],
    queryFn: async () => {
      const status = await getDocumentStatus(id);
      if (status.status === 'done' || status.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
      return status;
    },
    enabled: processing,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'done' || s === 'failed' ? false : 3000;
    },
  });
}
