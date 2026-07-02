import { SITE_STATE_ID, SUPABASE_BUCKET, hasSupabaseConfig, supabase } from "./supabase";

export type SharedCmsPayload = Record<string, unknown>;

export type DiagnosticResult = {
  ok: boolean;
  message: string;
};

// Diagnostic détaillé en deux temps :
// 1) un appel réseau BRUT (fetch direct sur l'API REST, sans passer par le
//    SDK) pour isoler immédiatement les erreurs de réseau/CORS/URL/clé,
//    avec le vrai code HTTP renvoyé ;
// 2) si l'étape 1 réussit, un appel via le client Supabase pour vérifier
//    la table, les policies et les données.
// Cela permet de savoir EXACTEMENT à quel niveau ça bloque au lieu de
// deviner.
export async function diagnoseSupabaseConnection(): Promise<DiagnosticResult> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      message:
        "Variables manquantes au moment du build : VITE_SUPABASE_URL et/ou VITE_SUPABASE_ANON_KEY ne sont pas définies dans ce déploiement. Ajoutez-les dans Vercel (Settings > Environment Variables, cochez Production), puis allez dans Deployments > ... > Redeploy. Elles ne s'appliquent jamais rétroactivement à un ancien build.",
    };
  }

  const cleanedUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

  if (supabaseUrl !== cleanedUrl) {
    return {
      ok: false,
      message: `VITE_SUPABASE_URL contient des caractères en trop (valeur actuelle : "${supabaseUrl}"). Utilisez exactement : ${cleanedUrl}`,
    };
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleanedUrl)) {
    return {
      ok: false,
      message: `L'URL "${cleanedUrl}" ne ressemble pas à une URL Supabase valide. Le format attendu est https://votre-projet.supabase.co (sans /rest/v1, sans espace, sans guillemets).`,
    };
  }

  // Étape 1 : test réseau brut, sans le SDK.
  let rawResponse: Response;
  try {
    rawResponse = await fetch(`${cleanedUrl}/rest/v1/site_state?select=id&id=eq.${SITE_STATE_ID}`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
  } catch (networkError) {
    return {
      ok: false,
      message: `Échec réseau avant même d'atteindre Supabase (${networkError instanceof Error ? networkError.message : "erreur inconnue"}). Vérifiez que l'URL "${cleanedUrl}" est correcte et que le projet Supabase existe toujours (pas en pause).`,
    };
  }

  if (rawResponse.status === 401 || rawResponse.status === 403) {
    const body = await rawResponse.text();
    return {
      ok: false,
      message: `Clé refusée par Supabase (HTTP ${rawResponse.status}). La clé VITE_SUPABASE_ANON_KEY ne correspond pas à ce projet (${cleanedUrl}), ou elle a été régénérée depuis. Réponse Supabase : ${body.slice(0, 200)}`,
    };
  }

  if (rawResponse.status === 404) {
    const body = await rawResponse.text();
    return {
      ok: false,
      message: `Table introuvable (HTTP 404) sur ${cleanedUrl}. Le script supabase/schema.sql n'a probablement pas été exécuté sur CE projet. Réponse Supabase : ${body.slice(0, 200)}`,
    };
  }

  if (!rawResponse.ok) {
    const body = await rawResponse.text();
    return {
      ok: false,
      message: `Supabase a répondu avec une erreur HTTP ${rawResponse.status} sur ${cleanedUrl}. Réponse : ${body.slice(0, 300)}`,
    };
  }

  // Étape 2 : vérification via le SDK (données réelles + policies d'écriture).
  const client = supabase;
  if (!client) {
    return { ok: false, message: "Le test réseau brut a réussi, mais le client Supabase interne n'a pas pu être créé. Rechargez la page et réessayez." };
  }

  const { data, error, status } = await client
    .from("site_state")
    .select("id, updated_at")
    .eq("id", SITE_STATE_ID)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: `Le test réseau de base fonctionne, mais la lecture via le client échoue (code ${error.code || status}) : ${error.message}. ${error.hint ? `Indice : ${error.hint}.` : ""}`,
    };
  }

  if (!data) {
    return {
      ok: false,
      message: `Connexion et lecture OK, mais aucune ligne avec l'id "${SITE_STATE_ID}" n'existe dans la table site_state sur ${cleanedUrl}. Réexécutez la partie "insert into public.site_state" du script supabase/schema.sql sur CE projet.`,
    };
  }

  return {
    ok: true,
    message: `Connexion réussie sur ${cleanedUrl}. Dernière mise à jour enregistrée : ${data.updated_at ? new Date(data.updated_at).toLocaleString("fr-FR") : "jamais modifiée"}.`,
  };
}

export type UploadSuccess = {
  ok: true;
  publicUrl: string;
  path: string;
  contentType: string;
  size: number;
};

export type UploadFailure = {
  ok: false;
  error: string;
};

export type UploadOutcome = UploadSuccess | UploadFailure;

export async function fetchRemoteCmsState<T>() {
  const client = supabase;
  if (!hasSupabaseConfig || !client) return null;

  const { data, error } = await client
    .from("site_state")
    .select("data")
    .eq("id", SITE_STATE_ID)
    .maybeSingle();

  if (error) {
    console.error("Erreur Supabase fetchRemoteCmsState:", error.message);
    return null;
  }

  return (data?.data as T | null) ?? null;
}

export async function saveRemoteCmsState<T extends SharedCmsPayload>(payload: T) {
  const client = supabase;
  if (!hasSupabaseConfig || !client) return { ok: false as const, remote: false as const };

  const { error } = await client.from("site_state").upsert(
    {
      id: SITE_STATE_ID,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Erreur Supabase saveRemoteCmsState:", error.message);
    return { ok: false as const, remote: true as const, error: error.message };
  }

  return { ok: true as const, remote: true as const };
}

export function subscribeToRemoteCms(onChange: () => void) {
  const client = supabase;
  if (!hasSupabaseConfig || !client) return () => undefined;

  const channel = client
    .channel("site-state-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "site_state",
        filter: `id=eq.${SITE_STATE_ID}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function uploadMediaToSupabase(file: File, folder = "gallery"): Promise<UploadOutcome> {
  const client = supabase;
  if (!hasSupabaseConfig || !client) {
    return { ok: false, error: "Supabase n'est pas configuré (variables d'environnement manquantes)." };
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${Date.now()}-${sanitized}`;

  const { error: uploadError } = await client.storage.from(SUPABASE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    console.error("Erreur Supabase uploadMediaToSupabase:", uploadError.message);
    return { ok: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = client.storage.from(SUPABASE_BUCKET).getPublicUrl(path);

  return {
    ok: true,
    publicUrl,
    path,
    contentType: file.type || "application/octet-stream",
    size: file.size || 0,
  };
}
