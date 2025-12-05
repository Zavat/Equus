import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { farrierId, date } = await request.json();

    if (!farrierId || !date) {
      return new Response(
        JSON.stringify({ error: 'farrierId and date are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: farrier, error: farrierError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', farrierId)
      .eq('role', 'farrier')
      .single();

    if (farrierError || !farrier) {
      return new Response(
        JSON.stringify({ error: 'Farrier not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        proposed_date,
        num_horses,
        status,
        customer:customer_id(
          full_name,
          address,
          city,
          latitude,
          longitude
        )
      `)
      .eq('farrier_id', farrierId)
      .gte('proposed_date', targetDate.toISOString())
      .lt('proposed_date', nextDay.toISOString())
      .in('status', ['confirmed', 'accepted'])
      .order('proposed_date', { ascending: true });

    if (appointmentsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch appointments' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          order: [],
          total_estimated_minutes: 0,
          steps: [],
          message: 'No confirmed appointments for this date'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validAppointments = appointments.filter(
      (apt: any) => apt.customer?.latitude && apt.customer?.longitude
    );

    if (validAppointments.length === 0) {
      return new Response(
        JSON.stringify({
          order: appointments.map((_, i) => i),
          total_estimated_minutes: appointments.length * 45,
          steps: [],
          message: 'Appointments found but missing location data'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `
You are an AI assistant helping optimize a farrier's daily route. Analyze the appointments and suggest the most efficient travel order.

Farrier Home Base:
- Address: ${(farrier as any).address ?? 'unknown'}
- City: ${(farrier as any).city ?? 'unknown'}
- Coordinates: ${(farrier as any).latitude && (farrier as any).longitude ? `${(farrier as any).latitude}, ${(farrier as any).longitude}` : 'unknown'}

Appointments to visit (index, customer, location, horses):
${validAppointments.map((apt: any, idx: number) => `${idx}: ${apt.customer.full_name} at ${apt.customer.address}, ${apt.customer.city} (${apt.customer.latitude}, ${apt.customer.longitude}) - ${apt.num_horses} horses`).join('\n')}

Guidelines:
1. Start from farrier's home base
2. Minimize total travel distance
3. Allow 45 minutes per horse for work time
4. Estimate 10 minutes per 10km for travel time
5. Consider starting at 08:00
6. Use actual coordinates for distance calculations

Return ONLY a JSON object with this exact format (no markdown, no explanation):
{
  "order": [2, 0, 1],
  "total_estimated_minutes": 180,
  "steps": [
    {
      "appointment_index": 2,
      "departure_time": "08:00",
      "arrival_time": "08:25",
      "work_duration_minutes": 45,
      "maps_url": "https://www.google.com/maps/dir/START_LAT,START_LNG/DEST_LAT,DEST_LNG"
    }
  ]
}

Where:
- order: array of appointment indices in optimal visit order
- total_estimated_minutes: sum of all travel + work time
- steps: detailed breakdown for each stop with Google Maps URLs`;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      const fallbackOrder = validAppointments.map((_: any, idx: number) => idx);
      const fallbackSteps = validAppointments.map((apt: any, idx: number) => {
        const startTime = new Date(targetDate);
        startTime.setHours(8 + idx * 2, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + apt.num_horses * 45);

        return {
          appointment_id: apt.id,
          appointment_index: idx,
          departure_time: startTime.toTimeString().slice(0, 5),
          arrival_time: startTime.toTimeString().slice(0, 5),
          work_duration_minutes: apt.num_horses * 45,
          maps_url: `https://www.google.com/maps/dir/?api=1&destination=${apt.customer.latitude},${apt.customer.longitude}`,
        };
      });

      return new Response(
        JSON.stringify({
          order: fallbackOrder,
          total_estimated_minutes: validAppointments.reduce((sum: number, apt: any) => sum + apt.num_horses * 45, 0),
          steps: fallbackSteps,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a route optimization assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content.trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const optimization = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    const enrichedSteps = optimization.steps.map((step: any) => {
      const apt: any = validAppointments[step.appointment_index];
      return {
        ...step,
        appointment_id: apt.id,
        customer_name: apt.customer.full_name,
        customer_address: `${apt.customer.address}, ${apt.customer.city}`,
        num_horses: apt.num_horses,
      };
    });

    return new Response(
      JSON.stringify({
        ...optimization,
        steps: enrichedSteps,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error optimizing route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to optimize route' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
