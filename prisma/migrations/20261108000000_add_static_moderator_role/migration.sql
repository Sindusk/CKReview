-- Static roles (lib/static-access.ts): OWNER > MODERATOR > MEMBER.
-- MODERATOR can upload/resync reviews, edit pull summaries and merge or
-- rename players; MEMBER becomes view-only. Only adds the enum value:
-- Postgres can't use a value added by ALTER TYPE ... ADD VALUE in the same
-- transaction, and existing MEMBER rows stay MEMBER (the owner promotes).

-- AlterEnum
ALTER TYPE "StaticMemberRole" ADD VALUE 'MODERATOR';
