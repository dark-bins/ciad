import { useCallback, useEffect, useState } from "react";
import { catalogAPI, CommandCatalogResponse } from "../api/client";

interface UseCommandCatalogState {
  catalog: CommandCatalogResponse | null;
  loading: boolean;
  error: string | null;
}

export const useCommandCatalog = () => {
  const [state, setState] = useState<UseCommandCatalogState>({ catalog: null, loading: true, error: null });

  const fetchCatalog = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await catalogAPI.getCatalog();
      setState({ catalog: data, loading: false, error: null });
    } catch (error) {
      console.error("Error cargando el catálogo de comandos", error);
      setState({ catalog: null, loading: false, error: "No se pudo cargar el catálogo de comandos" });
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  return {
    catalog: state.catalog,
    loading: state.loading,
    error: state.error,
    refresh: fetchCatalog,
  };
};
