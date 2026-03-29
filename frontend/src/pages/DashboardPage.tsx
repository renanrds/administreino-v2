import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Flame, Calendar, Clock, TrendingUp, ChevronRight, Play, Zap, Timer, MapPin, ExternalLink, X, Plus, Navigation } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { DashboardData, Coordinates } from '../types';
import { calculateDistanceMeters } from '../utils/haversine';
import TermsModal from '../components/TermsModal';

// Raio em metros para disparar o geofencing (100 metros)
const GEOFENCE_RADIUS_METERS = 100;

// Deep link para abrir o app do Wellhub na tela inicial
const WELLHUB_APP_URL = 'gympass://'; 

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default function DashboardPage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeElapsed, setActiveElapsed] = useState(0);

  // Estados para Geofencing
  const [gymLocation, setGymLocation] = useState<Coordinates | null>(null);
  const [isNearGym, setIsNearGym] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Estados para Modal de Coordenadas
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);
  const [gyms, setGyms] = useState<Array<{ id?: number; name: string; lat: string; lng: string }>>([]);
  const [newGym, setNewGym] = useState({ name: '', lat: '', lng: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [showDeleteGymModal, setShowDeleteGymModal] = useState(false);
  const [gymToDelete, setGymToDelete] = useState<{ id?: number; index: number; name: string } | null>(null);
  const [deletingGym, setDeletingGym] = useState(false);

  // Estado para descartar card de Wellhub por dia
  const [wellhubCardDismissed, setWellhubCardDismissed] = useState(() => {
    const stored = localStorage.getItem('wellhub_card_dismissed_date');
    if (!stored) return false;
    const today = new Date().toISOString().split('T')[0];
    return stored === today;
  });

    // Estado para Modal de Termos
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [acceptingTerms, setAcceptingTerms] = useState(false);

  useEffect(() => {
    api.get('/dashboard/')
      .then((r) => {
        setData(r.data);
        // Supondo que a API retorne as coordenadas da academia cadastrada para o próximo treino
        // ou a academia padrão do usuário.
        if (r.data.gym_coordinates) {
          setGymLocation(r.data.gym_coordinates);
        }
      })
      .finally(() => setLoading(false));
  }, []);

    // Verificar se precisa mostrar modal de termos
    useEffect(() => {
      if (user && !user.terms_accepted) {
        setShowTermsModal(true);
      }
    }, [user]);

  // Cronômetro em tempo real para o card de sessão ativa
  useEffect(() => {
    if (!data?.active_session?.started_at) return;
    const startTime = new Date(data.active_session.started_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor((now - startTime) / 1000);
      setActiveElapsed(diffInSeconds > 0 ? diffInSeconds : 0);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data?.active_session?.started_at]);

  // ─── Lógica de Geofencing ───────────────────────────────────────────────────
  useEffect(() => {
    // Só vigia a posição se NÃO houver treino ativo e se houver uma academia cadastrada
    if (data?.active_session || !gymLocation) return;

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocalização não suportada neste navegador.');
      return;
    }

    // Vigia a posição do usuário em tempo real
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const currentLoc: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Calcula distância e verifica se está próximo
        const distance = calculateDistanceMeters(currentLoc, gymLocation);
        setIsNearGym(distance <= GEOFENCE_RADIUS_METERS);
        setLocationError(null);
      },
      (error) => {
        console.error('Erro de localização:', error);
        setLocationError('Não foi possível obter sua localização para o check-in automático.');
      },
      {
        enableHighAccuracy: true, // Usa GPS se disponível
        timeout: 15000,           // Espera até 15 segundos
        maximumAge: 10000         // Aceita localização com até 10 segundos de idade
      }
    );

    // Limpa o monitoramento ao sair da página
    return () => navigator.geolocation.clearWatch(watchId);
  }, [data?.active_session, gymLocation]);

  const toggleWellhubIntegration = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      if (user.wellhub_enabled) {
        // Desativar
        await api.post('/auth/gym-locations/disable_wellhub/');
        updateUser({ wellhub_enabled: false });
      } else {
        // Ativar
        await api.post('/auth/gym-locations/enable_wellhub/');
        updateUser({ wellhub_enabled: true });
      }
    } catch (error) {
      console.error('Erro ao alternar Wellhub:', error);
      alert('Erro ao alternar Wellhub');
    }
  };

  const dismissWellhubCard = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('wellhub_card_dismissed_date', today);
    setWellhubCardDismissed(true);
  };

  const openWellhubConfigModal = async () => {
    if (!user) return;
    setShowCoordinatesModal(true);
    // Carrega as academias já cadastradas quando abre o modal
    await loadUserGyms();
  };

  const captureGpsCoordinate = async () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        setNewGym({
          name: newGym.name || 'Minha Academia',
          lat,
          lng,
        });
        setGpsLoading(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Erro ao obter localização. Verifique as permissões de geolocalização.');
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const addGymCoordinate = async () => {
    if (!newGym.name || !newGym.lat || !newGym.lng) {
      alert('Preencha todos os campos');
      return;
    }

    const lat = parseFloat(newGym.lat);
    const lng = parseFloat(newGym.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Latitude e Longitude devem ser números válidos');
      return;
    }

    try {
      // Limita a 6 casas decimais conforme o schema do backend
      const latitudeRounded = Math.round(lat * 1000000) / 1000000;
      const longitudeRounded = Math.round(lng * 1000000) / 1000000;

      // Payload que será enviado
      const payload = {
        name: newGym.name,
        latitude: latitudeRounded,
        longitude: longitudeRounded,
      };
            // Salva a academia no backend imediatamente
      const response: any = await api.post('/auth/gym-locations/', payload);

      // Se for a primeira academia, define como principal
      if (gyms.length === 0) {
        try {
          await api.post(`/auth/gym-locations/${response.data.id}/set_primary/`);
          response.data.is_primary = true;
        } catch (err) {
          console.warn('⚠️ Não foi possível definir como principal:', err);
        }
      }

      // Adiciona a academia retornada do servidor à lista local
      setGyms([...gyms, {
        id: response.data.id,
        name: response.data.name,
        lat: response.data.latitude.toString(),
        lng: response.data.longitude.toString(),
      }]);

      // Limpa o formulário
      setNewGym({ name: '', lat: '', lng: '' });
      alert(`Academia "${response.data.name}" adicionada com sucesso!`);
    } catch (error: any) {
      console.error('❌ Erro ao adicionar academia:');
      console.error('Status:', error.response?.status);
      console.error('Dados de erro:', error.response?.data);
      console.error('Headers da resposta:', error.response?.headers);
      console.error('Erro completo:', error);

      // Tenta extrair mensagem de erro mais específica
      let errorMessage = 'Erro ao adicionar academia. Tente novamente.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Tenta diferentes formatos de erro do Django/DRF
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.name) {
          errorMessage = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
        } else if (errorData.latitude) {
          errorMessage = Array.isArray(errorData.latitude) ? errorData.latitude[0] : errorData.latitude;
        } else if (errorData.longitude) {
          errorMessage = Array.isArray(errorData.longitude) ? errorData.longitude[0] : errorData.longitude;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      }

      console.error('📝 Mensagem final:', errorMessage);
      alert(errorMessage);
    }
  };

  const openDeleteGymModal = (index: number) => {
    const gym = gyms[index];
    setGymToDelete({ id: gym.id, index, name: gym.name });
    setShowDeleteGymModal(true);
  };

  const confirmDeleteGym = async () => {
    if (!gymToDelete) return;

    try {
      setDeletingGym(true);

      // Se tem ID, remove no backend; caso contrário remove apenas local
      if (gymToDelete.id) {
        await removeGymCoordinateFromBackend(gymToDelete.id);
      } else {
        setGyms((prev) => prev.filter((_, i) => i !== gymToDelete.index));
      }

      setShowDeleteGymModal(false);
      setGymToDelete(null);
    } finally {
      setDeletingGym(false);
    }
  };

  const removeGymCoordinateFromBackend = async (gymId: number) => {
    try {
      await api.delete(`/auth/gym-locations/${gymId}/`);
      // Recarrega as academias
      loadUserGyms();
    } catch (error) {
      console.error('Erro ao remover academia:', error);
      alert('Erro ao remover academia');
      throw error;
    }
  };

  const loadUserGyms = async () => {
    try {
      setGymsLoading(true);
      const response = await api.get('/auth/gym-locations/');
      
      setGyms(response.data.map((gym: any) => ({
        name: gym.name,
        lat: gym.latitude.toString(),
        lng: gym.longitude.toString(),
        id: gym.id,
      })));

      // Se Wellhub está ativado e há academias, configura a academia principal para geofencing
      if (user?.wellhub_enabled && response.data.length > 0) {
        const primaryGym = response.data.find((g: any) => g.is_primary) || response.data[0];
        setGymLocation({
          latitude: parseFloat(primaryGym.latitude),
          longitude: parseFloat(primaryGym.longitude),
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar academias:', error);
      alert('Erro ao carregar academias');
    } finally {
      setGymsLoading(false);
    }
  };

  // Carrega as academias quando a página carrega (se Wellhub está ativado)
  useEffect(() => {
    if (user?.wellhub_enabled) {
      loadUserGyms();
    }
  }, [user?.wellhub_enabled]);

  const acceptTerms = async () => {
    try {
      setAcceptingTerms(true);
      await api.post('/auth/accept-terms/');
      updateUser({ terms_accepted: true });
      setShowTermsModal(false);
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
      alert('Erro ao aceitar termos. Tente novamente.');
    } finally {
      setAcceptingTerms(false);
    }
  };

  const saveCoordinatesAndEnable = async () => {
    if (gyms.length === 0) {
      alert('Cadastre pelo menos uma academia');
      return;
    }

    try {
      // Define a primeira academia como principal (se não houver uma definida)
      const primaryGym = gyms.find(g => g.id) || gyms[0];

      // Se houver um ID, significa que foi salva do backend
      if (primaryGym.id) {
        await api.post(`/auth/gym-locations/${primaryGym.id}/set_primary/`);
      }

      // Ativa o Wellhub
      await api.post('/auth/gym-locations/enable_wellhub/');

      // Atualiza o estado local
      updateUser({
        wellhub_enabled: true,
      });

      // Atualiza a localização da academia principal para o geofencing
      setGymLocation({
        latitude: parseFloat(primaryGym.lat),
        longitude: parseFloat(primaryGym.lng),
      });

      // Fecha e limpa o modal
      setShowCoordinatesModal(false);
      setGyms([]);
      setNewGym({ name: '', lat: '', lng: '' });

      alert('Wellhub ativado com sucesso!');
    } catch (error) {
      console.error('Erro ao ativar Wellhub:', error);
      alert('Erro ao ativar Wellhub. Tente novamente.');
    }
  };

  const formatActiveElapsed = () => {
    const h = Math.floor(activeElapsed / 3600);
    const m = Math.floor((activeElapsed % 3600) / 60);
    const s = activeElapsed % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#ff8a1f', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const stats = data?.stats;
  const activeSession = data?.active_session;

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-in pb-20">
      {/* Saudação e Toggle Wellhub */}
        {showTermsModal && (
          <TermsModal onAccept={acceptTerms} isLoading={acceptingTerms} />
        )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Bom treino,</p>
          <h1 className="text-2xl font-black text-white">
            {user?.first_name || user?.username} 💪
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full p-1.5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <button 
                onClick={openWellhubConfigModal}
                className="text-xs font-bold pl-2 py-1 px-2 rounded-full hover:bg-slate-700/50 transition-colors"
                style={{ color: user?.wellhub_enabled ? '#10b981' : '#94a3b8'}}
            >
              Wellhub
            </button>
            <button 
                onClick={toggleWellhubIntegration}
                className={`w-12 h-6 rounded-full p-1 flex transition-colors duration-300 ${user?.wellhub_enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                style={{ justifyContent: user?.wellhub_enabled ? 'flex-end' : 'flex-start' }}
            >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
        </div>
      </div>

      {/* Sugestão Wellhub (Geofencing ativado) */}
      {isNearGym && user?.wellhub_enabled && !activeSession && !wellhubCardDismissed && (
        <div className="rounded-2xl p-4 animate-slide-up"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 8px 32px rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-950 border border-emerald-700">
                  <MapPin className="text-emerald-400" size={20} />
              </div>
              <div>
                  <p className="text-sm font-bold text-white">Você chegou na academia!</p>
                  <p className="text-xs text-emerald-300">Deseja abrir o app do Wellhub para check-in?</p>
              </div>
            </div>
            <button
              onClick={dismissWellhubCard}
              className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-emerald-900/30"
              title="Descartar"
            >
              <X size={16} className="text-emerald-300" />
            </button>
          </div>
          <a 
            href={WELLHUB_APP_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm"
          >
            <ExternalLink size={16} />
            Abrir Wellhub
          </a>
        </div>
      )}

      {/* Erro de Localização */}
      {locationError && user?.wellhub_enabled && (
        <div className="text-center text-xs p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300">
            {locationError}
        </div>
      )}

      {/* Sessão ativa */}
      {activeSession && (
        <div
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)', boxShadow: '0 8px 32px rgba(255,138,31,0.35)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Treino em andamento</span>
            </div>
            
            {/* Adicionado Timer no Card do Dashboard */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/20 text-white/90">
              <Timer size={14} />
              <span className="text-xs font-bold font-mono">{formatActiveElapsed()}</span>
            </div>
          </div>
          <p className="text-xl font-black text-white mb-2">{activeSession.workout_name}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all"
                style={{ width: `${activeSession.completion_percentage}%` }} />
            </div>
            <span className="text-sm font-bold text-white">{activeSession.completion_percentage}%</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Zap size={14} />
              <span>Toque para continuar</span>
            </div>
            <ChevronRight size={18} />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total de Treinos', value: stats?.total_sessions ?? 0, icon: Flame, color: '#f59e0b' },
          { label: 'Esta Semana', value: stats?.sessions_this_week ?? 0, icon: Calendar, color: '#10b981' },
          { label: 'Este Mês', value: stats?.sessions_this_month ?? 0, icon: TrendingUp, color: '#ff8a1f' },
          {
            label: 'Duração Média',
            value: stats?.avg_duration_seconds ? formatDuration(stats.avg_duration_seconds) : '—',
            icon: Clock, color: '#ff5a00'
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Ação rápida */}
      {!activeSession && (
        <button
          onClick={() => navigate('/workouts')}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #ff8a1f, #ff5a00)', boxShadow: '0 4px 20px rgba(255,138,31,0.25)' }}>
          <Play size={20} />
          Iniciar Novo Treino
        </button>
      )}

      {/* Sessões recentes */}
      {data?.recent_sessions && data.recent_sessions.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-white mb-3">Treinos Recentes</h2>
          <div className="space-y-2">
            {data.recent_sessions.map((session) => (
              <div key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer active:scale-95 transition-transform"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: session.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                    <Dumbbell size={18} style={{ color: session.status === 'completed' ? '#10b981' : '#ef4444' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{session.workout_name}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{formatDate(session.started_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    session.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                    style={{
                      background: session.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'
                    }}>
                    {session.completion_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data?.recent_sessions?.length === 0 && !activeSession && (
        <div className="text-center py-10">
          <Dumbbell size={48} className="mx-auto mb-3 opacity-20 text-white" />
          <p className="font-semibold text-white">Nenhum treino ainda</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Crie seu primeiro treino e comece agora!</p>
        </div>
      )}

      {/* Modal de Cadastro de Coordenadas */}
      {showCoordinatesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50 animate-fade-in">
          <div className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
            style={{ 
              boxShadow: '0 -12px 40px rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.2)'
            }}>
            
            {/* Header com gradiente verde */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600/20 border border-emerald-500/30">
                    <MapPin size={16} className="text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white">Adicionar Academias</h2>
                </div>
                <p className="text-sm text-slate-400 mt-1 ml-10">Use GPS ou insira os dados manualmente</p>
              </div>
              <button
                onClick={() => {
                  setShowCoordinatesModal(false);
                  setGyms([]);
                  setNewGym({ name: '', lat: '', lng: '' });
                  setGymsLoading(false);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700/50"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Botão de Capturar GPS - Destacado */}
            <button
              onClick={captureGpsCoordinate}
              disabled={gpsLoading}
              className="w-full mb-6 p-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 group"
              style={{ 
                background: gpsLoading 
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3))'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: !gpsLoading ? '0 8px 24px rgba(16,185,129,0.3)' : 'none',
                border: gpsLoading ? '1px solid rgba(16,185,129,0.4)' : 'none'
              }}
            >
              {gpsLoading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Localizando...</span>
                </>
              ) : (
                <>
                  <Navigation size={20} className={gpsLoading ? '' : 'group-hover:animate-pulse'} />
                  <span>Capturar Localização com GPS</span>
                </>
              )}
            </button>

            {/* Formulário para nova academia */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(26,26,46,0.8)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ou insira manualmente</p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Nome da Academia
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Academia Fitness, CrossFit..."
                    value={newGym.name}
                    onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500/50"
                    style={{ background: '#2a2a4a', border: '1px solid #3a3a5a' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      placeholder="-23.5505"
                      step="0.000001"
                      value={newGym.lat}
                      onChange={(e) => setNewGym({ ...newGym, lat: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500/50"
                      style={{ background: '#2a2a4a', border: '1px solid #3a3a5a' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Longitude
                    </label>
                    <input
                      type="number"
                      placeholder="-46.6333"
                      step="0.000001"
                      value={newGym.lng}
                      onChange={(e) => setNewGym({ ...newGym, lng: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500/50"
                      style={{ background: '#2a2a4a', border: '1px solid #3a3a5a' }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={addGymCoordinate}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: '#3b82f6' }}
              >
                <Plus size={18} />
                Adicionar Academia
              </button>
            </div>

            {/* Lista de academias cadastradas */}
            {gyms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                  Academias Cadastradas ({gyms.length})
                </h3>
                <div className="space-y-3">
                  {gyms.map((gym, index) => (
                    <div
                      key={gym.id ?? index}
                      className="flex items-center justify-between p-4 rounded-xl backdrop-blur-sm transition-all"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                          <MapPin size={18} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{gym.name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {parseFloat(gym.lat).toFixed(4)}, {parseFloat(gym.lng).toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openDeleteGymModal(index)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-600/20"
                      >
                        <X size={16} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading de academias */}
            {gymsLoading && gyms.length === 0 && (
              <div className="mb-6 p-4 rounded-xl text-center"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-blue-300">Carregando suas academias...</p>
              </div>
            )}

            {/* Mensagem de ajuda */}
            {!gymsLoading && gyms.length === 0 && (
              <div className="mb-6 p-4 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-xs text-blue-300">
                  💡 <strong>Dica:</strong> Use o GPS para capturar a localização automaticamente, ou insira as coordenadas manualmente se preferir.
                </p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCoordinatesModal(false);
                  setGyms([]);
                  setNewGym({ name: '', lat: '', lng: '' });
                  setGymsLoading(false);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-slate-300 transition-all hover:bg-slate-700/50 active:scale-95"
                style={{ background: 'rgba(42,42,74,0.5)', border: '1px solid #3a3a5a' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveCoordinatesAndEnable}
                disabled={gyms.length === 0}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: gyms.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3))',
                  boxShadow: gyms.length > 0 ? '0 8px 24px rgba(16,185,129,0.3)' : 'none'
                }}
              >
                <MapPin size={18} />
                Ativar Wellhub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão de academia */}
      {showDeleteGymModal && gymToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <h3 className="text-lg font-bold text-white mb-2">Excluir academia?</h3>
            <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>
              Esta ação removerá <strong className="text-white">{gymToDelete.name}</strong> da sua lista.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deletingGym) return;
                  setShowDeleteGymModal(false);
                  setGymToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl font-bold"
                style={{ background: '#2a2a4a', color: '#cbd5e1' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteGym}
                disabled={deletingGym}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-60"
                style={{ background: '#dc2626' }}
              >
                {deletingGym ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}