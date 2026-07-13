// The only valid destinations for a Saída — kept as a fixed list (not
// free text) because these are the actual packaging lines that exist on
// the floor. Shared between the form (dropdown options) and the server
// action (validation) so they can never drift apart.
export const DESTINATION_LINES = ["Farinha 1kg", "Farinha 5kg", "Farinha 25kg", "Big Bag"] as const;

export type DestinationLine = (typeof DESTINATION_LINES)[number];
