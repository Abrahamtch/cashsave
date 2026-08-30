/**
 * Client d'intégration API Maketou Payment
 * Documentation: https://docs-api.maketou.com
 */

export interface CreateCartParams {
  userId: string;
  userEmail: string;
  redirectUrl: string;
}

export async function createMaketouCart({ userId, userEmail, redirectUrl }: CreateCartParams) {
  const apiKey = process.env.MAKETOU_API_KEY;
  const productDocId = process.env.MAKETOU_PRODUCT_DOCUMENT_ID;

  if (!apiKey || !productDocId) {
    throw new Error('Les identifiants Maketou API (MAKETOU_API_KEY, MAKETOU_PRODUCT_DOCUMENT_ID) ne sont pas configurés.');
  }

  const response = await fetch('https://api.maketou.net/carts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      items: [
        {
          document_id: productDocId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        user_email: userEmail,
      },
      redirectURL: redirectUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Maketou API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  // Expect data to contain redirection URL
  return data;
}

export async function verifyMaketouCart(cartId: string) {
  const apiKey = process.env.MAKETOU_API_KEY;

  if (!apiKey) {
    throw new Error('MAKETOU_API_KEY non configurée.');
  }

  const response = await fetch(`https://api.maketou.net/carts/${cartId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur vérification panier Maketou (${response.status})`);
  }

  return await response.json();
}
