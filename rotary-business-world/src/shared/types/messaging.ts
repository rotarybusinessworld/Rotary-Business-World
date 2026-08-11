/**
 * Messaging DTOs — the shape that crosses the frontend/backend boundary.
 *
 * The frontend imports these (never Prisma row types). The messaging service
 * maps its Prisma rows to these before returning. Dates are serialized to ISO
 * strings so they survive the Server Action / JSON boundary unchanged.
 */

export type MessageDTO = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationParticipant = {
  id: string;
  fullName: string;
  photoUrl: string | null;
};

/** One row in the inbox list. */
export type ConversationSummary = {
  id: string;
  other: ConversationParticipant;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unread: boolean;
};

/** A full thread view (participant + ordered messages, oldest first). */
export type ConversationThread = {
  id: string;
  other: ConversationParticipant;
  messages: MessageDTO[];
};
