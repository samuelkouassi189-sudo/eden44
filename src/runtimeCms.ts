import { useEffect, useState } from "react";
import { fetchRemoteCmsState, subscribeToRemoteCms } from "./cmsSync";
import { hasSupabaseConfig } from "./supabase";

export const CMS_STORAGE_KEY = "eden-admin-cms-state";
export const CMS_UPDATED_EVENT = "eden-cms-updated";

export type RuntimeMedia = {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  category: string;
  src: string;
  poster?: string;
  hidden?: boolean;
  featured?: boolean;
};

export type RuntimeCollectionItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  mediaId?: string;
  published?: boolean;
  hidden?: boolean;
  updatedAt?: string;
  label?: string;
};

export type RuntimeSettings = {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  menuStyle?: string;
  footerText?: string;
  address?: string;
  email?: string;
  phones?: string[];
  whatsapp?: string;
  facebook?: string;
  tiktok?: string;
  mapsUrl?: string;
  globalSeoTitle?: string;
  globalSeoDescription?: string;
};

export type RuntimeCmsState = {
  media?: RuntimeMedia[];
  collections?: Partial<Record<"formations" | "actualites" | "evenements" | "enseignants" | "documents", RuntimeCollectionItem[]>>;
  settings?: RuntimeSettings;
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readRuntimeCms() {
  if (typeof window === "undefined") return null;
  return safeParse<RuntimeCmsState>(window.localStorage.getItem(CMS_STORAGE_KEY));
}

export function getRuntimeMedia(media: RuntimeMedia[] | undefined, mediaId?: string) {
  if (!media || !mediaId) return null;
  return media.find((item) => item.id === mediaId && !item.hidden) ?? null;
}

export function getPublishedCollection(
  collections: RuntimeCmsState["collections"],
  key: "formations" | "actualites" | "evenements" | "enseignants" | "documents",
) {
  return (collections?.[key] ?? []).filter((item) => item.published && !item.hidden);
}

export function useRuntimeCms() {
  const [cms, setCms] = useState<RuntimeCmsState | null>(() => readRuntimeCms());

  useEffect(() => {
    let mounted = true;

    const refreshLocal = () => {
      if (!mounted) return;
      const localData = readRuntimeCms();
      setCms((prev) => (JSON.stringify(prev) === JSON.stringify(localData) ? prev : localData));
    };

    const refreshRemote = async () => {
      if (!mounted) return;
      const remote = await fetchRemoteCmsState<RuntimeCmsState>(3500);
      if (!mounted) return;
      if (remote) {
        const serialized = JSON.stringify(remote);
        if (window.localStorage.getItem(CMS_STORAGE_KEY) !== serialized) {
          window.localStorage.setItem(CMS_STORAGE_KEY, serialized);
        }
        setCms(remote);
      }
    };

    void refreshRemote();

    window.addEventListener("storage", refreshLocal);
    window.addEventListener(CMS_UPDATED_EVENT, refreshLocal as EventListener);
    const unsubscribe = hasSupabaseConfig ? subscribeToRemoteCms(() => void refreshRemote()) : () => undefined;

    return () => {
      mounted = false;
      window.removeEventListener("storage", refreshLocal);
      window.removeEventListener(CMS_UPDATED_EVENT, refreshLocal as EventListener);
      unsubscribe();
    };
  }, []);

  return cms;
}
