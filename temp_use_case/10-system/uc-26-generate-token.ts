/**
 * UC-26: Generare token
 *
 * Attore: Sistema
 * Descrizione: Genera token univoci per inviti
 */

interface GenerateTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function generateToken(): Promise<GenerateTokenResult> {
  try {
    // Generare UUID v4 usando crypto API
    const token = crypto.randomUUID();

    // Verificare che il token sia valido
    if (!token || token.length === 0) {
      return {
        success: false,
        error: 'Errore durante la generazione del token',
      };
    }

    return {
      success: true,
      token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Genera un token sicuro con verifica di unicità nel database
 */
export async function generateUniqueToken(
  tableName: string,
  columnName: string,
  supabaseClient: any
): Promise<GenerateTokenResult> {
  try {
    let token: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      token = crypto.randomUUID();

      // Verificare unicità nel database
      const { data, error } = await supabaseClient
        .from(tableName)
        .select('id')
        .eq(columnName, token)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: 'Errore durante la verifica dell\'unicità del token',
        };
      }

      if (!data) {
        isUnique = true;
        return {
          success: true,
          token: token!,
        };
      }
    }

    return {
      success: false,
      error: 'Impossibile generare un token univoco dopo multipli tentativi',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
