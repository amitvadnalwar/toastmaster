-- "Best MRP" is broadened to cover TMOD, General Evaluator, and Table
-- Topics Master (not just TMOD). "Best ARP" is a new category covering
-- Timer, Ah Counter, and Grammarian.

ALTER TYPE public.vote_category ADD VALUE IF NOT EXISTS 'best_arp';
