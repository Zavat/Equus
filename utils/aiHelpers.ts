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
  const response = await fetch('/api/ai/suggest-appointment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ farrierId, horseId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get suggested appointment');
  }

  return response.json();
}

export async function getOptimizedRoute(
  farrierId: string,
  date: string
): Promise<OptimizedRoute> {
  const response = await fetch('/api/ai/route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ farrierId, date }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to optimize route');
  }

  return response.json();
}
