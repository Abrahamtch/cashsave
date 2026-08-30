/**
 * Client d'intégration API Maketou Payment & Redirection Boutique
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
  const directProductUrl = process.env.MAKETOU_PRODUCT_URL || 'https://cash-save.mymaketou.shop/en/products/abonnement-cash-save-3-000-fcfamois';

  // Tenter l'appel API Maketou REST s'il est disponible
  if (apiKey && productDocId) {
    try {
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

      if (response.ok) {
        const data = await response.json();
        return { url: data.payment_url || data.url || directProductUrl };
      }
    } catch (e) {
      console.warn('Fallback vers l\'URL directe de la boutique Maketou:', e);
    }
  }

  // Redirection directe garantie vers la page de paiement du produit Maketou 3 000 FCFA
  return { url: directProductUrl };
}

export async function verifyMaketouCart(cartId: string) {
  const apiKey = process.env.MAKETOU_API_KEY;

  if (!apiKey) {
    throw new Error('MAKETOU_API_KEY non configurée.');
  }

  try {
    const response = await fetch(`https://api.maketou.net/carts/${cartId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Erreur vérification panier Maketou:', e);
  }

  return null;
}
