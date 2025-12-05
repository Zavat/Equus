import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InvoiceData {
  invoiceNumber: string;
  farrier: {
    name: string;
    address: string;
    taxId: string;
  };
  customer: {
    name: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  platformFee: number;
  total: number;
  issuedDate: string;
  dueDate: string;
  language: string;
}

function generateInvoiceHTML(data: InvoiceData): string {
  const translations: Record<string, any> = {
    en: {
      invoice: 'INVOICE',
      invoiceNumber: 'Invoice Number',
      issuedDate: 'Issued Date',
      dueDate: 'Due Date',
      from: 'From',
      billTo: 'Bill To',
      description: 'Description',
      quantity: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      platformFee: 'Platform Fee (5%)',
      totalAmount: 'Total Amount',
      paymentTerms: 'Payment Terms',
      paymentTermsText: 'Payment due within 10 days',
      thankYou: 'Thank you for your business!',
    },
    it: {
      invoice: 'FATTURA',
      invoiceNumber: 'Numero Fattura',
      issuedDate: 'Data Emissione',
      dueDate: 'Data Scadenza',
      from: 'Da',
      billTo: 'Fatturare A',
      description: 'Descrizione',
      quantity: 'Qtà',
      unitPrice: 'Prezzo Unitario',
      total: 'Totale',
      subtotal: 'Subtotale',
      platformFee: 'Commissione Piattaforma (5%)',
      totalAmount: 'Totale Fattura',
      paymentTerms: 'Termini di Pagamento',
      paymentTermsText: 'Pagamento dovuto entro 10 giorni',
      thankYou: 'Grazie per la vostra collaborazione!',
    },
    de: {
      invoice: 'RECHNUNG',
      invoiceNumber: 'Rechnungsnummer',
      issuedDate: 'Rechnungsdatum',
      dueDate: 'Fälligkeitsdatum',
      from: 'Von',
      billTo: 'Rechnung An',
      description: 'Beschreibung',
      quantity: 'Anz.',
      unitPrice: 'Einzelpreis',
      total: 'Gesamt',
      subtotal: 'Zwischensumme',
      platformFee: 'Plattformgebühr (5%)',
      totalAmount: 'Gesamtbetrag',
      paymentTerms: 'Zahlungsbedingungen',
      paymentTermsText: 'Zahlung fällig innerhalb von 10 Tagen',
      thankYou: 'Vielen Dank für Ihr Vertrauen!',
    },
  };

  const t = translations[data.language] || translations.en;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
        }
        .invoice-header {
          border-bottom: 3px solid #007AFF;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: bold;
          color: #007AFF;
          margin: 0;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .meta-item {
          margin-bottom: 10px;
        }
        .meta-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        .meta-value {
          font-size: 14px;
          font-weight: 600;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .party {
          width: 45%;
        }
        .party-title {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 10px;
        }
        .party-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .party-address {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #F5F5F5;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #E0E0E0;
        }
        td {
          padding: 12px;
          font-size: 14px;
          border-bottom: 1px solid #E0E0E0;
        }
        .text-right {
          text-align: right;
        }
        .totals {
          margin-left: auto;
          width: 300px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .total-row.grand {
          border-top: 2px solid #333;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: bold;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #E0E0E0;
          font-size: 12px;
          color: #666;
        }
        .thank-you {
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: #007AFF;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <h1 class="invoice-title">${t.invoice}</h1>
      </div>

      <div class="invoice-meta">
        <div>
          <div class="meta-item">
            <div class="meta-label">${t.invoiceNumber}</div>
            <div class="meta-value">${data.invoiceNumber}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${t.issuedDate}</div>
            <div class="meta-value">${data.issuedDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${t.dueDate}</div>
            <div class="meta-value">${data.dueDate}</div>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-title">${t.from}</div>
          <div class="party-name">${data.farrier.name}</div>
          <div class="party-address">${data.farrier.address}</div>
          <div class="party-address">VAT: ${data.farrier.taxId}</div>
        </div>
        <div class="party">
          <div class="party-title">${t.billTo}</div>
          <div class="party-name">${data.customer.name}</div>
          <div class="party-address">${data.customer.address}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${t.description}</th>
            <th class="text-right">${t.quantity}</th>
            <th class="text-right">${t.unitPrice}</th>
            <th class="text-right">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">€${item.unitPrice.toFixed(2)}</td>
              <td class="text-right">€${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>${t.subtotal}</span>
          <span>€${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>${t.platformFee}</span>
          <span>€${data.platformFee.toFixed(2)}</span>
        </div>
        <div class="total-row grand">
          <span>${t.totalAmount}</span>
          <span>€${data.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <div><strong>${t.paymentTerms}:</strong> ${t.paymentTermsText}</div>
      </div>

      <div class="thank-you">${t.thankYou}</div>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const paymentResponse = await fetch(
      `${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}&select=*,appointment:appointment_id(*,farrier:farrier_id(*),customer:customer_id(*))`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const payments = await paymentResponse.json();
    const payment = payments[0];

    if (!payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const invoiceNumber = `INV-${Date.now()}-${payment.id.substring(0, 8)}`;
    const issuedDate = new Date().toLocaleDateString();
    const dueDate = payment.due_date ? new Date(payment.due_date).toLocaleDateString() : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const invoiceData: InvoiceData = {
      invoiceNumber,
      farrier: {
        name: payment.appointment.farrier.full_name,
        address: `${payment.appointment.farrier.address || ''}, ${payment.appointment.farrier.city || ''}`,
        taxId: payment.appointment.farrier.tax_id || 'N/A',
      },
      customer: {
        name: payment.appointment.customer.full_name,
        address: `${payment.appointment.customer.address || ''}, ${payment.appointment.customer.city || ''}`,
      },
      items: [
        {
          description: `Farrier Services - ${payment.appointment.num_horses} horse(s)`,
          quantity: 1,
          unitPrice: payment.amount,
          total: payment.amount,
        },
      ],
      subtotal: payment.amount,
      platformFee: payment.platform_fee,
      total: payment.amount,
      issuedDate,
      dueDate,
      language: payment.appointment.customer.language || 'en',
    };

    const html = generateInvoiceHTML(invoiceData);

    const { error: invoiceError } = await fetch(
      `${supabaseUrl}/rest/v1/invoices`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          appointment_id: payment.appointment_id,
          payment_id: payment.id,
          invoice_number: invoiceNumber,
          issued_date: new Date().toISOString().split('T')[0],
          status: payment.status === 'paid' ? 'paid' : 'issued',
          language: invoiceData.language,
        }),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber,
        html,
        message: 'Invoice generated successfully. PDF generation requires additional setup.',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Invoice generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});