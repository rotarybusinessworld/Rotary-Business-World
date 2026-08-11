import "server-only";
import { db } from "@/backend/db";
import { assertVerified, type Actor } from "@/backend/actor";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/backend/errors";
import type {
  ConversationSummary,
  ConversationThread,
  MessageDTO,
} from "@/shared/types/messaging";
import {
  canonicalPair,
  isUnread,
  myReadField,
  otherParticipantId,
  toMessageDTO,
  toParticipant,
} from "./types";

/**
 * Member-to-member direct messaging (1:1).
 *
 * Transport-agnostic like the other services: takes an `Actor` + validated
 * input, returns DTOs from `@/shared/types/messaging`, throws `AppError` on
 * failure. Adapters (server actions, the polling route) own parsing, redirects
 * and cache revalidation. This file uses `db` directly.
 */

const MAX_BODY = 4000;

/** Block in either direction stops the conversation. */
async function ensureNotBlocked(a: string, b: string): Promise<void> {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  if (block) throw new ForbiddenError("You can't message this member");
}

/** Load a conversation the actor participates in, or throw NotFoundError. */
async function requireParticipation(actor: Actor, conversationId: string) {
  const conv = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1Id: actor.id }, { participant2Id: actor.id }],
    },
  });
  if (!conv) throw new NotFoundError("Conversation not found");
  return conv;
}

/**
 * Get (or atomically create) the 1:1 conversation between the actor and
 * `recipientId`. Returns the conversation id so the caller can redirect to it.
 */
export async function startConversation(
  actor: Actor,
  recipientId: string,
): Promise<{ conversationId: string }> {
  assertVerified(actor);
  if (recipientId === actor.id) {
    throw new ValidationError("You can't message yourself");
  }

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, status: true },
  });
  if (!recipient) throw new NotFoundError("Member not found");
  if (recipient.status !== "VERIFIED") {
    throw new ValidationError("This member isn't verified yet");
  }

  await ensureNotBlocked(actor.id, recipientId);

  const [participant1Id, participant2Id] = canonicalPair(actor.id, recipientId);
  const conversation = await db.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id, participant2Id } },
    create: { participant1Id, participant2Id },
    update: {},
    select: { id: true },
  });

  return { conversationId: conversation.id };
}

/**
 * Post a message. Creates the row and bumps the conversation's sort key while
 * marking it read for the sender, all in one transaction so the inbox order and
 * the sender's own read state can't drift.
 */
export async function sendMessage(
  actor: Actor,
  input: { conversationId: string; body: string },
): Promise<MessageDTO> {
  assertVerified(actor);

  const body = input.body.trim();
  if (!body) throw new ValidationError("Message can't be empty");
  if (body.length > MAX_BODY) {
    throw new ValidationError("Message is too long");
  }

  const conv = await requireParticipation(actor, input.conversationId);
  await ensureNotBlocked(actor.id, otherParticipantId(conv, actor.id));

  const now = new Date();
  const readUpdate =
    myReadField(conv, actor.id) === "p1LastReadAt"
      ? { p1LastReadAt: now }
      : { p2LastReadAt: now };

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId: conv.id, senderId: actor.id, body },
    }),
    db.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now, ...readUpdate },
    }),
  ]);

  return toMessageDTO(message);
}

/** Inbox list, newest activity first, with the other participant + unread flag. */
export async function listConversations(
  actor: Actor,
): Promise<ConversationSummary[]> {
  assertVerified(actor);

  const convs = await db.conversation.findMany({
    where: {
      OR: [{ participant1Id: actor.id }, { participant2Id: actor.id }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      participant1: { include: { profile: true } },
      participant2: { include: { profile: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return convs.map((conv) => {
    const other =
      conv.participant1Id === actor.id ? conv.participant2 : conv.participant1;
    const last = conv.messages[0];
    return {
      id: conv.id,
      other: toParticipant(other),
      lastMessagePreview: last?.body ?? null,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      unread: !!last && isUnread(conv, actor.id),
    };
  });
}

/** Full thread (participant + messages oldest-first). Marks nothing read. */
export async function getConversation(
  actor: Actor,
  conversationId: string,
): Promise<ConversationThread> {
  assertVerified(actor);

  const conv = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1Id: actor.id }, { participant2Id: actor.id }],
    },
    include: {
      participant1: { include: { profile: true } },
      participant2: { include: { profile: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conv) throw new NotFoundError("Conversation not found");

  const other =
    conv.participant1Id === actor.id ? conv.participant2 : conv.participant1;

  return {
    id: conv.id,
    other: toParticipant(other),
    messages: conv.messages.map(toMessageDTO),
  };
}

/** Messages created after `afterIso` — the polling read for near-live threads. */
export async function getMessagesAfter(
  actor: Actor,
  conversationId: string,
  afterIso: string,
): Promise<MessageDTO[]> {
  assertVerified(actor);
  await requireParticipation(actor, conversationId);

  const parsed = new Date(afterIso);
  const after = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;

  const messages = await db.message.findMany({
    where: { conversationId, createdAt: { gt: after } },
    orderBy: { createdAt: "asc" },
  });
  return messages.map(toMessageDTO);
}

/** Mark the conversation read up to now for the actor. */
export async function markRead(
  actor: Actor,
  conversationId: string,
): Promise<void> {
  assertVerified(actor);
  const conv = await requireParticipation(actor, conversationId);

  const now = new Date();
  const readUpdate =
    myReadField(conv, actor.id) === "p1LastReadAt"
      ? { p1LastReadAt: now }
      : { p2LastReadAt: now };

  await db.conversation.update({
    where: { id: conv.id },
    data: readUpdate,
  });
}

/** Count of conversations with unread messages (header badge). */
export async function countUnread(actor: Actor): Promise<number> {
  assertVerified(actor);

  const convs = await db.conversation.findMany({
    where: {
      OR: [{ participant1Id: actor.id }, { participant2Id: actor.id }],
    },
    select: {
      participant1Id: true,
      lastMessageAt: true,
      p1LastReadAt: true,
      p2LastReadAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
    },
  });

  return convs.filter((c) => c.messages.length > 0 && isUnread(c, actor.id))
    .length;
}

/**
 * Block a member. Enforcement already lives in startConversation/sendMessage;
 * this + unblockUser back the (future) moderation UI. Idempotent.
 */
export async function blockUser(actor: Actor, userId: string): Promise<void> {
  assertVerified(actor);
  if (userId === actor.id) throw new ValidationError("You can't block yourself");

  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: actor.id, blockedId: userId } },
    create: { blockerId: actor.id, blockedId: userId },
    update: {},
  });
}

export async function unblockUser(actor: Actor, userId: string): Promise<void> {
  assertVerified(actor);
  await db.block.deleteMany({
    where: { blockerId: actor.id, blockedId: userId },
  });
}
