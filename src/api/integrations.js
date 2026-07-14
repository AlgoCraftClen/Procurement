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

export async function InvokeLLM({ response_json_schema } = {}) {
  if (response_json_schema?.properties?.executive_summary) {
    return {
      executive_summary: "Supabase migration is active. AI report generation can be added later with a Supabase Edge Function.",
      key_insights: ["Live procurement data is available through the app records table."],
      recommendations: ["Add a Supabase Edge Function for AI-assisted reporting after the core workflow is stable."],
      action_items: ["Confirm Supabase credentials in the deployed hosting environment."],
      risk_alerts: [],
      charts: []
    };
  }
  return {};
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
