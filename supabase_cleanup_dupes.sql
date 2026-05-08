-- ============================================================
-- CLEANUP DUPLICATE CHATS — Run in Supabase SQL Editor
-- This removes duplicate receiverId entries in user_chats,
-- keeping only the most recently updated one per contact.
-- ============================================================

UPDATE public.user_chats uc
SET chats = (
  SELECT jsonb_agg(latest_chat)
  FROM (
    SELECT DISTINCT ON ((chat_item->>'receiverId'))
      chat_item AS latest_chat
    FROM jsonb_array_elements(uc.chats) AS chat_item
    ORDER BY (chat_item->>'receiverId'), (chat_item->>'updatedAt')::bigint DESC NULLS LAST
  ) deduped
)
WHERE jsonb_array_length(chats) > 0;
