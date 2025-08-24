// Allow usage of the Mux web component in TSX if it appears anywhere
// This prevents typecheck errors for '<mux-player ... />' tags.
declare namespace JSX {
  interface IntrinsicElements {
    'mux-player': any;
  }
}
