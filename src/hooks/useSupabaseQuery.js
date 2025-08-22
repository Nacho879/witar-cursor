import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Cache simple en memoria
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useSupabaseQuery(queryFn, dependencies = [], options = {}) {
  const {
    enabled = true,
    cacheTime = CACHE_DURATION,
    staleTime = 0,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  const abortControllerRef = useRef(null);
  const lastFetchRef = useRef(0);
  const cacheKey = JSON.stringify({ queryFn: queryFn.toString(), dependencies });

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Verificar cache
    const cached = queryCache.get(cacheKey);
    const now = Date.now();
    
    if (!force && cached && (now - cached.timestamp) < cacheTime) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      setIsStale(false);
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      // Solo actualizar si el request no fue cancelado
      if (!abortControllerRef.current.signal.aborted) {
        setData(result.data);
        setError(result.error);
        
        // Guardar en cache
        queryCache.set(cacheKey, {
          data: result.data,
          timestamp: now,
        });
        
        lastFetchRef.current = now;
        setIsStale(false);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [queryFn, enabled, cacheTime, cacheKey]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    queryCache.delete(cacheKey);
    setIsStale(true);
  }, [cacheKey]);

  // Efecto para fetch inicial
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [enabled, refetchOnMount, ...dependencies]);

  // Efecto para refetch en focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFetchRef.current > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, staleTime, fetchData]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale,
  };
}

// Hook para queries con paginación
export function useSupabasePaginatedQuery(
  queryFn,
  page = 1,
  pageSize = 10,
  dependencies = [],
  options = {}
) {
  const [hasMore, setHasMore] = useState(true);
  
  const paginatedQueryFn = useCallback(async () => {
    const result = await queryFn(page, pageSize);
    
    if (result.data) {
      setHasMore(result.data.length === pageSize);
    }
    
    return result;
  }, [queryFn, page, pageSize]);

  const query = useSupabaseQuery(paginatedQueryFn, dependencies, options);

  const loadMore = useCallback(() => {
    if (hasMore && !query.loading) {
      // Implementar lógica de "load more"
    }
  }, [hasMore, query.loading]);

  return {
    ...query,
    hasMore,
    loadMore,
  };
}

// Hook para queries con filtros
export function useSupabaseFilteredQuery(
  baseQueryFn,
  filters = {},
  dependencies = [],
  options = {}
) {
  const filteredQueryFn = useCallback(async () => {
    let query = baseQueryFn();
    
    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object' && value.operator) {
          query = query[value.operator](key, value.value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    
    return await query;
  }, [baseQueryFn, filters]);

  return useSupabaseQuery(filteredQueryFn, dependencies, options);
}

// Utilidad para limpiar cache
export const clearQueryCache = () => {
  queryCache.clear();
};

// Utilidad para invalidar queries específicas
export const invalidateQueries = (pattern) => {
  for (const [key] of queryCache) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}; 