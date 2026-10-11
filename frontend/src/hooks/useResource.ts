import { useCallback, useEffect, useRef, useState } from "react";
export function useResource<T>(loader: () => Promise<T>, key = "") {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: Error;
    loading: boolean;
  }>({ key, loading: true });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    setState({ key, loading: true });
    loaderRef
      .current()
      .then((data) => {
        if (live) setState({ key, data, loading: false });
      })
      .catch((error) => {
        if (live)
          setState({
            key,
            error:
              error instanceof Error
                ? error
                : new Error("Unable to load records."),
            loading: false,
          });
      });
    return () => {
      live = false;
    };
  }, [key, version]);
  return {
    ...(state.key === key
      ? state
      : { loading: true, data: undefined, error: undefined }),
    reload,
  };
}
