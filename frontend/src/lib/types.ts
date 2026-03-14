export type Voyage = {
  id: string;
  route_name: string;
  insured_amount: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
};

export type Policy = {
  id: number;
  voyage_id: string;
  owner_address: string;
  premium_amount: string;
  nft_id: string | null;
  status: string;
  created_at: string;
};

export type Loan = {
  id: number;
  borrower_address: string;
  principal: string;
  rate: string;
  due_date: string;
  status: string;
  created_at: string;
};

export type VaultData = {
  totalRlusd: string;
  totalVrlusd: string;
  tvl: string;
  userRlusd: string;
  userVrlusd: string;
  estimatedApr: string;
  vaultAddress?: string;
};

// Maritime mode ship data
export type Ship = {
  id: string;
  name: string;
  voyageId: string;
  routeName: string;
  position: [number, number]; // lat, lng
  heading: number;
  speed: number; // knots
  status: "underway" | "anchored" | "incident";
  insuredAmount: string;
  premium: string;
  policyStatus: string;
  path: [number, number][]; // route waypoints
  cargo: string;
  flag: string;
  imo: string;
};

// Disaster mode property data
export type Property = {
  id: string;
  address: string;
  position: [number, number];
  damageLevel: "none" | "minor" | "moderate" | "severe" | "destroyed";
  insuredAmount: string;
  premium: string;
  policyStatus: string;
  claimStatus: string;
  policyId?: string;
  nftId?: string;
  owner: string;
};

export type DisasterZone = {
  id: string;
  name: string;
  center: [number, number];
  radius: number; // meters
  severity: "low" | "medium" | "high" | "critical";
  type: string; // earthquake, flood, hurricane, etc.
};

// XRPL transaction step for timeline visualization
export type XrplStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "complete" | "error";
  txHash?: string;
  detail?: string;
};

export type Role = "exporter" | "provider";
