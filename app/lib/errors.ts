import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";
import {
  getKadenceErrorMessage,
  KADENCE_ERROR__INVALID_DISTANCE,
  KADENCE_ERROR__DISTANCE_TOO_LARGE,
  KADENCE_ERROR__INVALID_DURATION,
  KADENCE_ERROR__PACE_TOO_FAST,
  KADENCE_ERROR__MATH_OVERFLOW,
  type KadenceError,
} from "../generated/kadence";

const KADENCE_ERROR_CODES: Record<number, KadenceError> = {
  [KADENCE_ERROR__INVALID_DISTANCE]: KADENCE_ERROR__INVALID_DISTANCE,
  [KADENCE_ERROR__DISTANCE_TOO_LARGE]: KADENCE_ERROR__DISTANCE_TOO_LARGE,
  [KADENCE_ERROR__INVALID_DURATION]: KADENCE_ERROR__INVALID_DURATION,
  [KADENCE_ERROR__PACE_TOO_FAST]: KADENCE_ERROR__PACE_TOO_FAST,
  [KADENCE_ERROR__MATH_OVERFLOW]: KADENCE_ERROR__MATH_OVERFLOW,
};

export function parseTransactionError(err: unknown): string {
  // Wallet rejection (comes from wallet-standard, not a SolanaError)
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  // Anchor custom program errors — map to Codama-generated Kadence messages
  if (
    isSolanaError(err, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
    typeof err.context?.code === "number"
  ) {
    const kadenceError = KADENCE_ERROR_CODES[err.context.code];
    if (kadenceError !== undefined) {
      return getKadenceErrorMessage(kadenceError);
    }
  }

  // For all other errors, walk the cause chain to find the deepest message.
  const message = getDeepestMessage(err);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;

  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) {
      deepest = current.message;
    }
  }

  return deepest;
}
