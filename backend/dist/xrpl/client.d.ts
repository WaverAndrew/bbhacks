/**
 * XRPL client (skill-aligned): explicit testnet default, maxFeeXRP for fee protection, disconnect on shutdown.
 * Connection timeout and URL follow config (see TESTING.md if connection fails).
 */
import { Client } from "xrpl";
export declare function getClient(): Promise<Client>;
export declare function disconnectClient(): Promise<void>;
//# sourceMappingURL=client.d.ts.map