/**
 * Messaging module — public API.
 *
 * This barrel is the ONLY import surface for the messaging bounded context.
 * Adapters (server actions, the polling route handler) import from
 * `@/backend/messaging`; they must not reach into `./service` or `./types`
 * directly. See ARCHITECTURE.md for the seam rules.
 */
export {
  startConversation,
  sendMessage,
  listConversations,
  getConversation,
  getMessagesAfter,
  markRead,
  countUnread,
  blockUser,
  unblockUser,
} from "./service";

export type * from "@/shared/types/messaging";
