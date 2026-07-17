import { isSupabaseConfigured, supabase } from "./supabaseClient";

const UPLOAD_BUCKET = "procurement_uploads";

export const Core = {};

export async function UploadFile({ file }) {
  if (!file) throw new Error("No file supplied");

  if (!isSupabaseConfigured) {
    return {
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      storage_path: null
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(storagePath);
  return {
    file_url: data.publicUrl,
    file_name: file.name,
    storage_path: storagePath
  };
}

export async function CreateFileSignedUrl({ path, expiresIn = 3600 } = {}) {
  if (!isSupabaseConfigured || !path) return { signed_url: path || "" };
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return { signed_url: data.signedUrl };
}

export const UploadPrivateFile = UploadFile;

export async function InvokeLLM(payload = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("AI extraction requires Supabase to be configured.");
  }

  const { data, error } = await supabase.functions.invoke("procurement-ai", {
    body: payload
  });

  if (error) {
    throw new Error(error.message || "AI extraction request failed.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.result ?? data;
}

export async function SendEmail() {
  return { success: true, skipped: true };
}

export async function GenerateImage() {
  return { url: "" };
}

export async function ExtractDataFromUploadedFile() {
  return { output: null };
}
