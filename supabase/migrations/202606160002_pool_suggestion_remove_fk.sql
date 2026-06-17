-- Allow draft items referenced by remove suggestions to be deleted on accept.
-- Pending remove suggestions still require a target item; resolved ones may clear it.

alter table public.pool_suggestions
  drop constraint pool_suggestions_target_item_id_fkey;

alter table public.pool_suggestions
  add constraint pool_suggestions_target_item_id_fkey
  foreign key (target_item_id) references public.draft_items(id) on delete set null;

alter table public.pool_suggestions
  drop constraint pool_suggestions_action_payload;

alter table public.pool_suggestions
  add constraint pool_suggestions_action_payload check (
    (
      action = 'add'
      and target_item_id is null
      and suggested_name is not null
      and char_length(btrim(suggested_name)) between 1 and 200
    )
    or (
      action = 'remove'
      and suggested_name is null
      and (status <> 'pending' or target_item_id is not null)
    )
  );
