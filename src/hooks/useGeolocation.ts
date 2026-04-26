import { useState, useEffect } from 'react';

interface GeolocationResult {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (watch = false) => {
  const [state, setState] = useState<GeolocationResult>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalização não suportada', loading: false }));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let message = 'Erro ao capturar localização';
      if (error.code === 1) message = 'Permissão de GPS negada pelo usuário';
      else if (error.code === 2) message = 'Sinal de GPS não disponível';
      else if (error.code === 3) message = 'Tempo limite de captura excedido';
      
      setState(prev => ({ ...prev, error: message, loading: false }));
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    let watcher: number;
    if (watch) {
      watcher = navigator.geolocation.watchPosition(onSuccess, onError, options);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }

    return () => {
      if (watcher) navigator.geolocation.clearWatch(watcher);
    };
  }, [watch]);

  return state;
};
