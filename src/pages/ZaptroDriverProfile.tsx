import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Route, Truck, User } from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useAuth } from '../context/AuthContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { ZAPTRO_ROUTES, zaptroDriverProfilePath } from '../constants/zaptroRoutes';
import { isZaptroDemoDriverId, ZAPTRO_DEMO_DRIVERS } from '../constants/zaptroDriversDemo';
import { extractPlateFromVehicleText, vehicleTextContainsPlate } from '../utils/zaptroDriverVehicle';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';

type DriverRow = {
  id: string;
  name: string;
  phone: string;
  vehicle?: string | null;
  status?: string | null;
  company_id?: string | null;
};

const ZaptroDriverProfileContent: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : '';
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';

  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [fleetPeers, setFleetPeers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);

  const plate = useMemo(() => extractPlateFromVehicleText(driver?.vehicle), [driver?.vehicle]);

  const samePlateOthers = useMemo(() => {
    if (!plate || !driver) return [];
    return fleetPeers.filter(
      (p) => p.id !== driver.id && vehicleTextContainsPlate(p.vehicle, plate),
    );
  }, [fleetPeers, driver, plate]);

  const load = useCallback(async () => {
    if (!id) {
      setDriver(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isZaptroDemoDriverId(id)) {
        const d = ZAPTRO_DEMO_DRIVERS.find((x) => x.id === id);
        setDriver(d ? { ...d } : null);
        setFleetPeers(ZAPTRO_DEMO_DRIVERS.filter((x) => x.id !== id));
        setLoading(false);
        return;
      }

      if (!profile?.company_id) {
        setDriver(null);
        setLoading(false);
        return;
      }

      const { data: row, error } = await supabaseZaptro
        .from('whatsapp_drivers')
        .select('id,name,phone,vehicle,status,company_id')
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      if (!row) {
        setDriver(null);
        setFleetPeers([]);
        setLoading(false);
        return;
      }

      const mapped: DriverRow = {
        id: String(row.id),
        name: row.name,
        phone: row.phone,
        vehicle: row.vehicle,
        status: row.status,
        company_id: row.company_id,
      };
      setDriver(mapped);

      const { data: peers, error: e2 } = await supabaseZaptro
        .from('whatsapp_drivers')
        .select('id,name,phone,vehicle,status')
        .eq('company_id', profile.company_id)
        .neq('id', id);

      if (e2) throw e2;
      setFleetPeers((peers as DriverRow[]) || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar.';
      notifyZaptro('error', 'Motorista', msg);
      setDriver(null);
      setFleetPeers([]);
    } finally {
      setLoading(false);
    }
  }, [id, profile?.company_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const border = palette.sidebarBorder;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const soft = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: palette.textMuted, fontWeight: 700 }}>
        A carregar perfil…
      </div>
    );
  }

  if (!driver) {
    return (
      <div style={{ padding: 32, maxWidth: 520, margin: '0 auto' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>Motorista não encontrado</p>
        <p style={{ color: palette.textMuted, fontWeight: 600, lineHeight: 1.55 }}>
          Confirme o link ou volte à lista. Só é possível ver motoristas da mesma transportadora.
        </p>
        <Link
          to={ZAPTRO_ROUTES.DRIVERS}
          style={{
            display: 'inline-flex',
            marginTop: 18,
            fontWeight: 950,
            color: '#000',
            background: palette.lime,
            padding: '12px 18px',
            borderRadius: 14,
            textDecoration: 'none',
          }}
        >
          Voltar a Motoristas
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <button
        type="button"
        onClick={() => navigate(ZAPTRO_ROUTES.DRIVERS)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 22,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: 14,
          color: palette.text,
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={18} /> Motoristas
      </button>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 22,
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: isDark ? 'rgba(217,255,0,0.12)' : '#EEFCEF',
            border: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={34} color={isDark ? palette.lime : '#0f172a'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: '-0.04em', color: palette.text }}>
            {driver.name}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: palette.textMuted }}>
            Identificação: <strong style={{ color: palette.text }}>{driver.phone}</strong> · nome no cadastro
          </p>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: '0.06em',
                padding: '6px 12px',
                borderRadius: 999,
                backgroundColor: driver.status === 'ativo' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                color: driver.status === 'ativo' ? '#16a34a' : '#dc2626',
              }}
            >
              {driver.status === 'ativo' ? 'OPERACIONAL' : 'BLOQUEADO'}
            </span>
            {plate && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: '0.08em',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${border}`,
                  color: palette.text,
                }}
              >
                PLACA {plate}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 22 }}>
        <div style={{ borderRadius: 20, border: `1px solid ${border}`, padding: 20, backgroundColor: cardBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Phone size={18} color={palette.textMuted} />
            <span style={{ fontSize: 11, fontWeight: 950, color: palette.textMuted, letterSpacing: '0.08em' }}>WHATSAPP</span>
          </div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 950, color: palette.text }}>{driver.phone}</p>
          <a
            href={`https://wa.me/${String(driver.phone).replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 10, display: 'inline-block', fontSize: 13, fontWeight: 800, color: '#16a34a' }}
          >
            Abrir WhatsApp
          </a>
        </div>
        <div style={{ borderRadius: 20, border: `1px solid ${border}`, padding: 20, backgroundColor: cardBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Truck size={18} color={palette.textMuted} />
            <span style={{ fontSize: 11, fontWeight: 950, color: palette.textMuted, letterSpacing: '0.08em' }}>VEÍCULO</span>
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: palette.text, lineHeight: 1.45 }}>
            {driver.vehicle || 'Sem veículo cadastrado'}
          </p>
        </div>
        <div style={{ borderRadius: 20, border: `1px solid ${border}`, padding: 20, backgroundColor: cardBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Route size={18} color={palette.textMuted} />
            <span style={{ fontSize: 11, fontWeight: 950, color: palette.textMuted, letterSpacing: '0.08em' }}>VIAGENS</span>
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 950, color: palette.text }}>—</p>
          <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
            Contagem de rotas entregues liga-se ao módulo operacional (em desenvolvimento).
          </p>
        </div>
        <div style={{ borderRadius: 20, border: `1px solid ${border}`, padding: 20, backgroundColor: cardBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <MapPin size={18} color={palette.textMuted} />
            <span style={{ fontSize: 11, fontWeight: 950, color: palette.textMuted, letterSpacing: '0.08em' }}>LOCAL</span>
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: palette.text }}>—</p>
          <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
            Última posição / estado da rota virá da API de rastreio.
          </p>
        </div>
      </div>

      {plate && (
        <div
          style={{
            borderRadius: 22,
            border: `1px solid ${border}`,
            padding: 22,
            backgroundColor: soft,
            marginBottom: 22,
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 950, color: palette.text }}>Quem já usou a placa {plate}</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: palette.textMuted, lineHeight: 1.55 }}>
            A mesma viatura pode passar por vários motoristas. Aqui listamos outros condutores da frota com esta placa no
            campo «veículo / placa» (texto livre).
          </p>
          {samePlateOthers.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.textMuted }}>
              Nenhum outro motorista na mesma empresa com esta placa no cadastro.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.text, fontWeight: 700 }}>
              {samePlateOthers.map((p) => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <Link
                    to={zaptroDriverProfilePath(p.id)}
                    style={{ color: palette.text, fontWeight: 950, textDecoration: 'underline' }}
                  >
                    {p.name}
                  </Link>
                  <span style={{ color: palette.textMuted, fontWeight: 600 }}> · {p.phone}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p style={{ fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.5 }}>
        ID interno: <code style={{ fontSize: 12 }}>{driver.id}</code> · tabela <code style={{ fontSize: 12 }}>whatsapp_drivers</code>
      </p>
    </div>
  );
};

const ZaptroDriverProfile: React.FC = () => (
  <ZaptroLayout>
    <ZaptroDriverProfileContent />
  </ZaptroLayout>
);

export default ZaptroDriverProfile;
