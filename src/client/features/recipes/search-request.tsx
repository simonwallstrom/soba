import { useNavigate, useRouter } from "@tanstack/react-router";
import { createContext, use, useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

type SearchRequest = {
  register: (input: HTMLInputElement | null) => () => void;
  request: () => void;
};

const SearchRequestContext = createContext<SearchRequest | null>(null);

// Lets the app shell's shortcuts and buttons open the recipe list with its search focused.
//
// Phones raise the keyboard only for focus that happens during the tap itself. On the recipe
// list the field takes focus right away. From another page, a hidden field holds the keyboard
// up while the list loads, and then hands focus to the real one.
export function RecipeSearchRequestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigate = useNavigate();
  const field = useRef<HTMLInputElement>(null);
  const placeholder = useRef<HTMLInputElement>(null);
  const pending = useRef(false);

  function request() {
    if (field.current) {
      field.current.focus();
      field.current.select();
      return;
    }
    pending.current = true;
    placeholder.current?.focus();
    if (router.state.location.pathname !== "/recipes") void navigate({ to: "/recipes" });
  }

  function register(input: HTMLInputElement | null) {
    field.current = input;
    if (pending.current) {
      pending.current = false;
      input?.focus();
    }
    return () => {
      if (field.current === input) field.current = null;
    };
  }

  return (
    <SearchRequestContext value={{ register, request }}>
      {children}
      <input
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
        ref={placeholder}
        tabIndex={-1}
      />
    </SearchRequestContext>
  );
}

export function useRequestRecipeSearch() {
  const context = use(SearchRequestContext);
  if (!context) throw new Error("useRequestRecipeSearch needs a RecipeSearchRequestProvider");
  return context.request;
}

// Makes `input` the field that search requests focus, including the one that opened this page.
export function useRecipeSearchField(input: RefObject<HTMLInputElement | null>) {
  const context = use(SearchRequestContext);
  if (!context) throw new Error("useRecipeSearchField needs a RecipeSearchRequestProvider");
  const { register } = context;

  useEffect(() => register(input.current), [register, input]);
}
