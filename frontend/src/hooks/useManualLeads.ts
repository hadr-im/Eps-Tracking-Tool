// Hooks for the manual leads page.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import {
  fetchManualLeads,
  createManualLead,
  lookupExpaPerson,
} from '../services/manualLeadService';
import type { ManualLeadPayload } from '../types/manualLead';

// The backend's messages are specific ("EP 123 is already in the system",
// "No EXPA person found with ID 123") and worth showing verbatim.
function messageFrom(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

export function useManualLeads() {
  return useQuery({
    queryKey: ['manual-leads'],
    queryFn: fetchManualLeads,
  });
}

export function useCreateManualLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ManualLeadPayload) => createManualLead(payload),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['manual-leads'] });
      toast.success(`${lead.fullName} added`);
    },
    onError: (err) => {
      toast.error(messageFrom(err, "Couldn't add this lead. Please try again."));
    },
  });
}

/*
  EXPA lookup is a mutation rather than a query: it runs when the user presses
  the button, not when the component renders, and nothing about it should be
  cached — a second look at the same id should hit EXPA again.
*/
export function useExpaLookup() {
  return useMutation({
    mutationFn: (expaId: string) => lookupExpaPerson(expaId),
    onError: (err) => {
      toast.error(messageFrom(err, "Couldn't reach EXPA. Please try again."));
    },
  });
}
