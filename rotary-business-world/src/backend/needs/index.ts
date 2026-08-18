/**
 * Needs / Leads module — public API.
 *
 * Adapters (server actions, the worker, the leads pages) import from
 * `@/backend/needs`; matching internals live in ./matching and are only reached
 * through this barrel or the worker job.
 */
export {
  createNeed,
  estimateNeedRecipients,
  listNeedsForMember,
  listLeadsForOwner,
  countUnviewedLeads,
  markAllLeadsViewed,
  recordLeadFeedback,
  getLeadBuyer,
  type NeedInput,
  type LeadDTO,
  type MyNeedDTO,
} from "./service";

export { matchNeed } from "./matching";
