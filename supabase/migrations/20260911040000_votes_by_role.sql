-- Lets a member (or guest) vote for a nominee who has no app account (added
-- by name only), and lets a member add a missing nominee straight from the
-- voting screen — same fallback already built for speaker feedback.
--
-- Votes are keyed on (meeting_id, voter_id, category) — nominee_id was only
-- ever the payload, never part of that uniqueness — so this only needs a new
-- nominee_role_id column (the nominee's own meeting_roles row, which always
-- exists regardless of member account) plus a relaxed NOT NULL, mirroring
-- speaker_feedback.speaker_role_id.

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS nominee_role_id UUID REFERENCES public.meeting_roles(id) ON DELETE CASCADE;

UPDATE public.votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_speaker'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'speaker';

UPDATE public.votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_evaluator'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'evaluator';

UPDATE public.votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_table_topic'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'table_topics_speaker';

UPDATE public.votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_mrp'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id
  AND mr.role IN ('tmod', 'general_evaluator', 'table_topics_master');

UPDATE public.votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_arp'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id
  AND mr.role IN ('timer', 'ah_counter', 'grammarian');

ALTER TABLE public.votes
  ALTER COLUMN nominee_id DROP NOT NULL;

-- Same treatment for guest votes.

ALTER TABLE public.guest_votes
  ADD COLUMN IF NOT EXISTS nominee_role_id UUID REFERENCES public.meeting_roles(id) ON DELETE CASCADE;

UPDATE public.guest_votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_speaker'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'speaker';

UPDATE public.guest_votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_evaluator'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'evaluator';

UPDATE public.guest_votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_table_topic'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'table_topics_speaker';

UPDATE public.guest_votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_main_role'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id
  AND mr.role IN ('tmod', 'general_evaluator');

UPDATE public.guest_votes v SET nominee_role_id = mr.id FROM public.meeting_roles mr
WHERE v.nominee_role_id IS NULL AND v.category = 'best_supporting_role'
  AND mr.meeting_id = v.meeting_id AND mr.member_id = v.nominee_id AND mr.role = 'supporting_role';

ALTER TABLE public.guest_votes
  ALTER COLUMN nominee_id DROP NOT NULL;
