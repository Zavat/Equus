import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { farrierId, horseId } = await request.json();

    if (!farrierId || !horseId) {
      return new Response(
        JSON.stringify({ error: 'farrierId and horseId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: horse, error: horseError } = await supabase
      .from('horses')
      .select('*, owner:owner_id(full_name, address, city, latitude, longitude)')
      .eq('id', horseId)
      .single();

    if (horseError || !horse) {
      return new Response(
        JSON.stringify({ error: 'Horse not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 90);

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('proposed_date, num_horses, status')
      .eq('farrier_id', farrierId)
      .gte('proposed_date', today.toISOString())
      .lte('proposed_date', futureDate.toISOString())
      .in('status', ['proposed', 'accepted', 'confirmed'])
      .order('proposed_date', { ascending: true });

    if (appointmentsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch appointments' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastShoeingDate = (horse as any).last_shoeing_date
      ? new Date((horse as any).last_shoeing_date)
      : null;

    const weeksSinceLastShoeing = lastShoeingDate
      ? Math.floor((today.getTime() - lastShoeingDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : null;

    const recommendedWeeks = 6;
    const suggestedDate = lastShoeingDate
      ? new Date(lastShoeingDate.getTime() + recommendedWeeks * 7 * 24 * 60 * 60 * 1000)
      : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const distance = (farrier as any).latitude && (farrier as any).longitude &&
                    (horse as any).owner?.latitude && (horse as any).owner?.longitude
      ? calculateDistance(
          (farrier as any).latitude,
          (farrier as any).longitude,
          (horse as any).owner.latitude,
          (horse as any).owner.longitude
        )
      : null;

    const prompt = `
You are an AI assistant helping a farrier schedule appointments. Analyze the following data and suggest the best appointment date and time.

Horse Information:
- Last shoeing date: ${lastShoeingDate ? lastShoeingDate.toISOString() : 'unknown'}
- Weeks since last shoeing: ${weeksSinceLastShoeing ?? 'unknown'}
- Recommended interval: 6-8 weeks
- Work type: ${(horse as any).work_type}

Farrier Information:
- Home base: ${(farrier as any).city ?? 'unknown'}
- Distance to customer: ${distance ? `${distance.toFixed(1)} km` : 'unknown'}

Customer Location:
- Address: ${(horse as any).owner?.address ?? 'unknown'}
- City: ${(horse as any).owner?.city ?? 'unknown'}

Existing Appointments (next 90 days):
${appointments?.map((apt: any) => `- ${new Date(apt.proposed_date).toLocaleDateString()} at ${new Date(apt.proposed_date).toLocaleTimeString()} (${apt.num_horses} horses, ${apt.status})`).join('\n') || 'None'}

Guidelines:
1. Ideal shoeing interval is 6-8 weeks
2. Prefer morning slots (8:00-12:00) or afternoon slots (14:00-18:00)
3. Avoid conflicts with existing appointments
4. Consider travel efficiency - suggest dates when farrier might be in the area
5. Allow 45 minutes per horse (estimate based on work type)

Return ONLY a JSON object with this exact format (no markdown, no explanation):
{
  "proposed_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "reason": "Brief explanation of why this slot is optimal"
}`;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      const fallbackDate = new Date(suggestedDate);
      fallbackDate.setHours(10, 0, 0, 0);
      const endTime = new Date(fallbackDate);
      endTime.setMinutes(endTime.getMinutes() + 45);

      return new Response(
        JSON.stringify({
          proposed_date: fallbackDate.toISOString().split('T')[0],
          start_time: fallbackDate.toTimeString().slice(0, 5),
          end_time: endTime.toTimeString().slice(0, 5),
          reason: `Suggested based on ${recommendedWeeks}-week interval from last shoeing`,
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
          { role: 'system', content: 'You are a scheduling assistant for farriers. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content.trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return new Response(JSON.stringify(suggestion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error suggesting appointment:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to suggest appointment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
