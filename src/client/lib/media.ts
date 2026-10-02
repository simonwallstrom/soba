import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";

// Below Tailwind's `sm` breakpoint, where popups become swipeable drawers.
export function useIsMobile() {
  return !useMediaQuery("(min-width: 40rem)", { noSsr: true });
}
