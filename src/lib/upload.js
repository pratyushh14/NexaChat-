import { supabase } from "./supabase";

const upload = async (file) => {
  const date = new Date();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `images/${date.getTime()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from("chat-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error("Upload failed: " + error.message);
  }

  const { data: urlData } = supabase.storage
    .from("chat-images")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

export default upload;
