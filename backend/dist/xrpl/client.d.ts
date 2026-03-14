/**
 * XRPL client (skill-aligned): explicit testnet default, maxFeeXRP for fee protection, disconnect on shutdown.
 */
import { Client } from "xrpl";
export declare function getClient(): Promise<Client>;
export declare function disconnectClient(): Promise<void>;
//# sourceMappingURL=client.d.ts.map