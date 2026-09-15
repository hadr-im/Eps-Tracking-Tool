// useAddComment (mutation for POST /eps/:id/comments)
// Invalidates ['comments', epId] on success so the panel refreshes immediately

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postComment } from '../services/commentService';
import type { AddCommentPayload } from '../types/comment';
import { toast } from 'sonner';

interface AddCommentArgs {
  epId: string;
  payload: AddCommentPayload;
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ epId, payload }: AddCommentArgs) => postComment(epId, payload),
    onSuccess: (_data, { epId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', epId] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });
}

