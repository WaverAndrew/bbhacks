/**
 * Polymarket market / token ID used for live premium pricing.
 * Edit this file to change which market drives the premium — users do not see or set this.
 *
 * Use either:
 * - A Gamma event ID (e.g. "2890") — premium is derived from that event's first market Yes token.
 * - A CLOB token ID (long numeric string) — premium = BUY price × insured amount for that token.
 */
export const POLYMARKET_MARKET_ID =
  "34522029811885165268273792456913474420221035255265728336691773789337117326368";
