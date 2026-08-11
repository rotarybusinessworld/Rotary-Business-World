import "server-only";
import type { Conversation, Message, Profile, User } from "@prisma/client";
import type {
  ConversationParticipant,
  MessageDTO,
} from "@/shared/types/messaging";

/**
 * Internal helpers for the messaging module: canonical pair ordering, unread
 * derivation, and Prisma-row → DTO mapping. Nothing here leaks outside the
 * module — the barrel (index.ts) only re-exports the service.
 */

type UserWithProfile = Pick<User, "id"> & { profile: Profile | null };

/**
 * Order a pair of user ids so a conversation between A and B always maps to the
 * same (participant1Id, participant2Id) row, letting the composite unique dedup
 * the pair regardless of who starts it.
 */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** The `pXLastReadAt` field belonging to `userId` in this conversation. */
export function myReadField(
  conv: Pick<Conversation, "participant1Id">,
  userId: string,
): "p1LastReadAt" | "p2LastReadAt" {
  return conv.participant1Id === userId ? "p1LastReadAt" : "p2LastReadAt";
}

/** The other participant's id. */
export function otherParticipantId(
  conv: Pick<Conversation, "participant1Id" | "participant2Id">,
  userId: string,
): string {
  return conv.participant1Id === userId
    ? conv.participant2Id
    : conv.participant1Id;
}

/**
 * A conversation is unread for `userId` when a message arrived after they last
 * read it. We don't track per-message reads; last-read timestamp is enough for
 * a 1:1 thread and the inbox unread dot.
 */
export function isUnread(
  conv: Pick<
    Conversation,
    "participant1Id" | "lastMessageAt" | "p1LastReadAt" | "p2LastReadAt"
  >,
  userId: string,
): boolean {
  const lastRead =
    conv.participant1Id === userId ? conv.p1LastReadAt : conv.p2LastReadAt;
  return !lastRead || conv.lastMessageAt > lastRead;
}

export function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toParticipant(user: UserWithProfile): ConversationParticipant {
  return {
    id: user.id,
    fullName: user.profile?.fullName ?? "Rotarian",
    photoUrl: user.profile?.photoUrl ?? null,
  };
}
