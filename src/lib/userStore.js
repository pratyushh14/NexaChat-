import { create } from "zustand";
import { supabase } from "./supabase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .single();

      if (error || !data) {
        set({ currentUser: null, isLoading: false });
      } else {
        set({ currentUser: data, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },
}));