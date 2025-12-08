import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { farrierId, date } = await req.json();

    if (!farrierId || !date) {
      return new Response(
        JSON.stringify({ error: "farrierId and date are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: farrier, error: farrierError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", farrierId)
      .eq("role", "farrier")
      .single();

    if (farrierError || !farrier) {
      return new Response(
        JSON.stringify({ error: "Farrier not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
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
      .eq("farrier_id", farrierId)
      .gte("proposed_date", targetDate.toISOString())
      .lt("proposed_date", nextDay.toISOString())
      .in("status", ["confirmed", "accepted"])
      .order("proposed_date", { ascending: true });

    if (appointmentsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch appointments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          order: [],
          total_estimated_minutes: 0,
          steps: [],
          message: "No confirmed appointments for this date"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          message: "Appointments found but missing location data"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple fallback route optimization (no AI)
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
        customer_name: apt.customer.full_name,
        customer_address: `${apt.customer.address}, ${apt.customer.city}`,
        num_horses: apt.num_horses,
      };
    });

    return new Response(
      JSON.stringify({
        order: fallbackOrder,
        total_estimated_minutes: validAppointments.reduce((sum: number, apt: any) => sum + apt.num_horses * 45, 0),
        steps: fallbackSteps,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error optimizing route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to optimize route" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});