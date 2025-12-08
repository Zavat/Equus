export interface SuggestedAppointment {
  proposed_date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface RouteStep {
  appointment_id: string;
  appointment_index: number;
  departure_time: string;
  arrival_time: string;
  work_duration_minutes: number;
  maps_url: string;
  customer_name?: string;
  customer_address?: string;
  num_horses?: number;
}

export interface OptimizedRoute {
  order: number[];
  total_estimated_minutes: number;
  steps: RouteStep[];
  message?: string;
}

export async function getSuggestedAppointment(
  farrierId: string,
  horseId: string
): Promise<SuggestedAppointment> {
  // Simple fallback suggestion
  const now = new Date();
  const suggestedDate = new Date(now);
  suggestedDate.setDate(suggestedDate.getDate() + 7);
  suggestedDate.setHours(9, 0, 0, 0);

  return {
    proposed_date: suggestedDate.toISOString(),
    start_time: '09:00',
    end_time: '10:00',
    reason: 'Appuntamento suggerito tra 7 giorni',
  };
}

export async function getOptimizedRoute(
  farrierId: string,
  date: string,
  anonKey: string
): Promise<OptimizedRoute> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/optimize-route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ farrierId, date }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to optimize route');
  }

  return response.json();
}
