import React, { useState, useEffect } from 'react';
import {
  User, Building2, CreditCard, Plus, Edit2, Trash2,
  Camera, Save, CheckCircle, Phone, Mail, MapPin,
  Globe, FileText, Lock, Eye, EyeOff, ChevronRight,
  Landmark, X, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import LogtaModal from '../components/Modal';

type Tab = 'meus-dados' | 'empresa' | 'cartao' | 'contas';

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  agency: string;
  account_number: string;
  pix_key?: string;
  is_main: boolean;
}

interface PaymentCard {
  id: string;
  holder_name: string;
  last_four: string;
  brand: string;
  expiry: string;
  is_main: boolean;
}

const AdminProfile: React.FC = () => {
  const { profile } = useAuth();
  const { company } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('meus-dados');
  const [saving, setSaving] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formProfile, setFormProfile] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: '',
    bio: '',
    current_password: '',
    new_password: ''
  });

  const [formCompany, setFormCompany] = useState({
    name: company?.name || '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    website: '',
    segment: ''
  });

  const [newAccount, setNewAccount] = useState({
    bank_name: '', account_type: 'CORRENTE', agency: '', account_number: '', pix_key: ''
  });

  const [newCard, setNewCard] = useState({
    holder_name: '', number: '', expiry: '', cvv: '', brand: 'visa'
  });

  // Mock data (would be fetched from Supabase)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: '1', bank_name: 'Banco do Brasil', account_type: 'Corrente', agency: '1234-5', account_number: '12345-6', pix_key: 'empresa@email.com', is_main: true },
    { id: '2', bank_name: 'Itaú', account_type: 'Poupança', agency: '5678-0', account_number: '98765-4', is_main: false },
  ]);

  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([
    { id: '1', holder_name: 'EMPRESA LOGTA LTDA', last_four: '4242', brand: 'Visa', expiry: '12/28', is_main: true },
  ]);

  const tabs = [
    { id: 'meus-dados', label: 'Meus Dados', icon: User },
    { id: 'empresa', label: 'Minha Empresa', icon: Building2 },
    { id: 'cartao', label: 'Cartões', icon: CreditCard },
    { id: 'contas', label: 'Contas Bancárias', icon: Landmark },
  ] as const;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    const tid = toastLoading('Salvando perfil...');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formProfile.full_name })
        .eq('id', profile.id);
      if (error) throw error;
      toastDismiss(tid);
      toastSuccess('Perfil atualizado!');
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setSaving(true);
    const tid = toastLoading('Salvando dados da empresa...');
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: formCompany.name })
        .eq('id', company.id);
      if (error) throw error;
      toastDismiss(tid);
      toastSuccess('Empresa atualizada!');
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = () => {
    setBankAccounts(prev => [...prev, {
      id: Date.now().toString(),
      bank_name: newAccount.bank_name,
      account_type: newAccount.account_type,
      agency: newAccount.agency,
      account_number: newAccount.account_number,
      pix_key: newAccount.pix_key,
      is_main: false
    }]);
    setNewAccount({ bank_name: '', account_type: 'CORRENTE', agency: '', account_number: '', pix_key: '' });
    setIsAddAccountOpen(false);
    toastSuccess('Conta cadastrada!');
  };

  const handleAddCard = () => {
    setPaymentCards(prev => [...prev, {
      id: Date.now().toString(),
      holder_name: newCard.holder_name,
      last_four: newCard.number.slice(-4),
      brand: newCard.brand,
      expiry: newCard.expiry,
      is_main: false
    }]);
    setNewCard({ holder_name: '', number: '', expiry: '', cvv: '', brand: 'visa' });
    setIsAddCardOpen(false);
    toastSuccess('Cartão cadastrado!');
  };

  const handleSetMainAccount = (id: string) => {
    setBankAccounts(prev => prev.map(a => ({ ...a, is_main: a.id === id })));
    toastSuccess('Conta principal atualizada!');
  };

  const handleDeleteAccount = (id: string) => {
    setBankAccounts(prev => prev.filter(a => a.id !== id));
    toastSuccess('Conta removida!');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      toastSuccess('Foto selecionada! Salve para confirmar.');
    }
  };

  const renderMeusDados = () => (
    <form onSubmit={handleSaveProfile} style={styles.formContent}>
      {/* Avatar */}
      <div style={styles.avatarSection}>
        <div style={styles.avatarZone}>
          <div style={styles.avatarLarge}>
            {avatarPreview || profile?.avatar_url ? (
              <img src={avatarPreview || profile?.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={styles.avatarInitial}>{profile?.full_name?.[0] || 'A'}</span>
            )}
          </div>
          <label style={styles.avatarOverlay}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            <Camera size={20} color="white" />
            <span>Alterar foto</span>
          </label>
        </div>
        <div>
          <h3 style={styles.avatarName}>{profile?.full_name || 'Administrador'}</h3>
          <span style={styles.roleBadge}>{profile?.role || 'ADMIN'}</span>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>{profile?.email}</p>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome Completo</label>
          <input style={styles.input} value={formProfile.full_name} onChange={e => setFormProfile({ ...formProfile, full_name: e.target.value })} placeholder="Seu nome completo" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>E-mail</label>
          <div style={{ position: 'relative' }}>
            <input 
              style={{ ...styles.input, opacity: 0.6, paddingRight: '40px' }} 
              value={formProfile.email} 
              disabled 
              placeholder="Email não editável" 
            />
            <Lock size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Para alterar seu e-mail, entre em contato com o Administrador Master.
          </span>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Telefone</label>
          <input style={styles.input} value={formProfile.phone} onChange={e => setFormProfile({ ...formProfile, phone: e.target.value })} placeholder="+55 (11) 9 9999-9999" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Cargo / Função</label>
          <input style={{ ...styles.input, opacity: 0.6 }} value={profile?.role || ''} disabled />
        </div>
      </div>

      <div style={styles.divider} />

      <h4 style={styles.sectionSubtitle}>🔐 Segurança & Senha</h4>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Senha Atual</label>
          <input style={styles.input} type="password" value={formProfile.current_password} onChange={e => setFormProfile({ ...formProfile, current_password: e.target.value })} placeholder="••••••••" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nova Senha</label>
          <input style={styles.input} type="password" value={formProfile.new_password} onChange={e => setFormProfile({ ...formProfile, new_password: e.target.value })} placeholder="••••••••" />
        </div>
      </div>

      <div style={styles.formActions}>
        <button type="submit" style={styles.btnPrimary} disabled={saving}>
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </form>
  );

  const renderEmpresa = () => (
    <form onSubmit={handleSaveCompany} style={styles.formContent}>
      <div style={styles.empresaHeader}>
        <div style={styles.empresaLogo}>
          {company?.logo_url ? (
            <img src={company.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Building2 size={32} color="var(--primary)" />
          )}
        </div>
        <div>
          <h3 style={styles.avatarName}>{company?.name || 'Minha Empresa'}</h3>
          <p style={{ color: '#64748b', fontSize: '13px' }}>ID: {company?.id?.slice(0, 8) || '—'}</p>
          <span style={{ ...styles.roleBadge, backgroundColor: '#ecfdf5', color: '#166534' }}>✓ Conta Ativa</span>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome da Empresa</label>
          <input style={styles.input} value={formCompany.name} onChange={e => setFormCompany({ ...formCompany, name: e.target.value })} placeholder="Razão Social" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>CNPJ</label>
          <input style={styles.input} value={formCompany.cnpj} onChange={e => setFormCompany({ ...formCompany, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Telefone</label>
          <input style={styles.input} value={formCompany.phone} onChange={e => setFormCompany({ ...formCompany, phone: e.target.value })} placeholder="+55 (11) 3333-4444" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>E-mail Corporativo</label>
          <input style={styles.input} value={formCompany.email} onChange={e => setFormCompany({ ...formCompany, email: e.target.value })} placeholder="contato@empresa.com.br" />
        </div>
        <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
          <label style={styles.label}>Endereço</label>
          <input style={styles.input} value={formCompany.address} onChange={e => setFormCompany({ ...formCompany, address: e.target.value })} placeholder="Rua, Número, Complemento" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Cidade</label>
          <input style={styles.input} value={formCompany.city} onChange={e => setFormCompany({ ...formCompany, city: e.target.value })} placeholder="São Paulo" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Estado</label>
          <select style={styles.input} value={formCompany.state} onChange={e => setFormCompany({ ...formCompany, state: e.target.value })}>
            <option value="">Selecione</option>
            {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF', 'CE', 'PE', 'AM', 'PA'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Website</label>
          <input style={styles.input} value={formCompany.website} onChange={e => setFormCompany({ ...formCompany, website: e.target.value })} placeholder="https://empresa.com.br" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Segmento</label>
          <select style={styles.input} value={formCompany.segment} onChange={e => setFormCompany({ ...formCompany, segment: e.target.value })}>
            <option value="">Selecione o segmento</option>
            <option value="transportadora">Transportadora</option>
            <option value="logistica">Logística & Armazenagem</option>
            <option value="ecommerce">E-commerce</option>
            <option value="distribuicao">Distribuição</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </div>

      <div style={styles.formActions}>
        <button type="submit" style={styles.btnPrimary} disabled={saving}>
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Empresa'}
        </button>
      </div>
    </form>
  );

  const renderCartao = () => (
    <div style={styles.formContent}>
      <div style={styles.listHeader}>
        <h4 style={styles.sectionSubtitle}>Cartões Cadastrados</h4>
        <button style={styles.btnPrimary} onClick={() => setIsAddCardOpen(true)}>
          <Plus size={16} /> Adicionar Cartão
        </button>
      </div>

      <div style={styles.cardsList}>
        {paymentCards.map(card => (
          <div key={card.id} style={{ ...styles.bankCard, background: card.brand === 'Visa' ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)' : 'linear-gradient(135deg, #2d1b69 0%, #1a0f3d 100%)' }}>
            <div style={styles.cardTop}>
              <span style={styles.cardBrand}>{card.brand}</span>
              {card.is_main && <span style={styles.mainBadge}>Principal</span>}
            </div>
            <div style={styles.cardNumber}>•••• •••• •••• {card.last_four}</div>
            <div style={styles.cardBottom}>
              <div>
                <p style={styles.cardLabel}>TITULAR</p>
                <p style={styles.cardValue}>{card.holder_name}</p>
              </div>
              <div>
                <p style={styles.cardLabel}>VALIDADE</p>
                <p style={styles.cardValue}>{card.expiry}</p>
              </div>
              <div style={styles.cardActions}>
                {!card.is_main && (
                  <button style={styles.cardBtn} onClick={() => setPaymentCards(p => p.map(c => ({ ...c, is_main: c.id === card.id })))}>
                    Tornar Principal
                  </button>
                )}
                <button style={{ ...styles.cardBtn, opacity: 0.7 }} onClick={() => setPaymentCards(p => p.filter(c => c.id !== card.id))}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}

        {paymentCards.length === 0 && (
          <div style={styles.emptyState}>
            <CreditCard size={48} color="#e2e8f0" />
            <p style={styles.emptyText}>Nenhum cartão cadastrado</p>
            <button style={styles.btnPrimary} onClick={() => setIsAddCardOpen(true)}>
              <Plus size={16} /> Adicionar primeiro cartão
            </button>
          </div>
        )}
      </div>

      <div style={styles.securityNote}>
        <Shield size={16} color="#D9FF00" />
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Seus dados de pagamento são criptografados e armazenados com segurança. Nunca compartilhamos seus dados com terceiros.
        </p>
      </div>
    </div>
  );

  const renderContas = () => (
    <div style={styles.formContent}>
      <div style={styles.listHeader}>
        <h4 style={styles.sectionSubtitle}>Contas Bancárias da Empresa</h4>
        <button style={styles.btnPrimary} onClick={() => setIsAddAccountOpen(true)}>
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {bankAccounts.map(account => (
          <div key={account.id} style={{ ...styles.accountCard, border: account.is_main ? '2px solid var(--primary)' : '1px solid #e8e8e8' }}>
            <div style={styles.accountHeader}>
              <div style={styles.accountIcon}>
                <Landmark size={20} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.accountName}>{account.bank_name}</div>
                <div style={styles.accountType}>{account.account_type}</div>
              </div>
              {account.is_main && (
                <span style={styles.mainPill}>⭐ Principal</span>
              )}
            </div>

            <div style={styles.accountDetails}>
              <div style={styles.accountDetail}>
                <span style={styles.accountDetailLabel}>Agência</span>
                <span style={styles.accountDetailValue}>{account.agency}</span>
              </div>
              <div style={styles.accountDetail}>
                <span style={styles.accountDetailLabel}>Conta</span>
                <span style={styles.accountDetailValue}>{account.account_number}</span>
              </div>
              {account.pix_key && (
                <div style={styles.accountDetail}>
                  <span style={styles.accountDetailLabel}>Chave PIX</span>
                  <span style={styles.accountDetailValue}>{account.pix_key}</span>
                </div>
              )}
            </div>

            <div style={styles.accountFooter}>
              {!account.is_main && (
                <button style={styles.btnOutline} onClick={() => handleSetMainAccount(account.id)}>
                  Definir como Principal
                </button>
              )}
              <button style={styles.btnEdit}><Edit2 size={14} /></button>
              <button style={styles.btnDelete} onClick={() => handleDeleteAccount(account.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {bankAccounts.length === 0 && (
          <div style={styles.emptyState}>
            <Landmark size={48} color="#e2e8f0" />
            <p style={styles.emptyText}>Nenhuma conta bancária cadastrada</p>
            <button style={styles.btnPrimary} onClick={() => setIsAddAccountOpen(true)}>
              <Plus size={16} /> Cadastrar primeira conta
            </button>
          </div>
        )}
      </div>

      <div style={styles.securityNote}>
        <CheckCircle size={16} color="#10b981" />
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          As contas cadastradas ficam vinculadas ao módulo financeiro para facilitar conciliações bancárias e pagamentos.
        </p>
      </div>
    </div>
  );

  return (
    <div style={styles.pageWrapper}>
      {/* Header Hero */}
      <div style={styles.hero}>
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"
          style={styles.heroBg}
          alt="Profile background"
        />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.heroAvatar}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={styles.heroInitial}>{profile?.full_name?.[0] || 'A'}</span>
            )}
          </div>
          <div>
            <h1 style={styles.heroName}>{profile?.full_name || 'Administrador'}</h1>
            <span style={styles.heroRole}>{profile?.role || 'ADMIN'}</span>
            <p style={styles.heroCompany}>{company?.name || 'Minha Empresa'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.contentCard}>
        {activeTab === 'meus-dados' && renderMeusDados()}
        {activeTab === 'empresa' && renderEmpresa()}
        {activeTab === 'cartao' && renderCartao()}
        {activeTab === 'contas' && renderContas()}
      </div>

      {/* Add Bank Account Modal */}
      <LogtaModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} title="Cadastrar Conta Bancária" width="560px">
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Banco</label>
            <input style={styles.input} placeholder="Ex: Banco do Brasil, Itaú, Bradesco..." value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tipo de Conta</label>
            <select style={styles.input} value={newAccount.account_type} onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}>
              <option value="CORRENTE">Conta Corrente</option>
              <option value="POUPANÇA">Conta Poupança</option>
              <option value="PAGAMENTO">Conta de Pagamento</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Agência</label>
              <input style={styles.input} placeholder="0000-0" value={newAccount.agency} onChange={e => setNewAccount({ ...newAccount, agency: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Número da Conta</label>
              <input style={styles.input} placeholder="00000-0" value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Chave PIX (opcional)</label>
            <input style={styles.input} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" value={newAccount.pix_key} onChange={e => setNewAccount({ ...newAccount, pix_key: e.target.value })} />
          </div>
          <button style={styles.btnPrimary} onClick={handleAddAccount}>
            <Landmark size={16} /> Cadastrar Conta
          </button>
        </div>
      </LogtaModal>

      {/* Add Card Modal */}
      <LogtaModal isOpen={isAddCardOpen} onClose={() => setIsAddCardOpen(false)} title="Adicionar Cartão" width="560px">
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Titular (como no cartão)</label>
            <input style={styles.input} placeholder="EMPRESA LTDA" value={newCard.holder_name} onChange={e => setNewCard({ ...newCard, holder_name: e.target.value })} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Número do Cartão</label>
            <input style={styles.input} placeholder="0000 0000 0000 0000" maxLength={19} value={newCard.number} onChange={e => setNewCard({ ...newCard, number: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Validade</label>
              <input style={styles.input} placeholder="MM/AA" value={newCard.expiry} onChange={e => setNewCard({ ...newCard, expiry: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>CVV</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...styles.input, paddingRight: '40px' }} type={showCVV ? 'text' : 'password'} placeholder="•••" maxLength={4} value={newCard.cvv} onChange={e => setNewCard({ ...newCard, cvv: e.target.value })} />
                <button type="button" onClick={() => setShowCVV(!showCVV)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showCVV ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Bandeira</label>
              <select style={styles.input} value={newCard.brand} onChange={e => setNewCard({ ...newCard, brand: e.target.value })}>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="elo">Elo</option>
                <option value="amex">Amex</option>
              </select>
            </div>
          </div>
          <div style={styles.securityNote}>
            <Lock size={14} color="#D9FF00" />
            <span style={{ fontSize: '12px', color: '#64748b' }}>Dados protegidos com criptografia SSL de 256 bits</span>
          </div>
          <button style={styles.btnPrimary} onClick={handleAddCard}>
            <CreditCard size={16} /> Adicionar Cartão
          </button>
        </div>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  pageWrapper: {
    maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0'
  },

  // Hero
  hero: { position: 'relative', height: '200px', borderRadius: '24px', overflow: 'hidden', marginBottom: '0' },
  heroBg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.85), rgba(15,23,42,0.4))' },
  heroContent: { position: 'absolute', bottom: '32px', left: '40px', display: 'flex', alignItems: 'center', gap: '24px' },
  heroAvatar: { width: '80px', height: '80px', borderRadius: '20px', border: '3px solid white', overflow: 'hidden', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroInitial: { fontSize: '32px', fontWeight: '700', color: 'white' },
  heroName: { color: 'white', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' },
  heroRole: { display: 'inline-block', padding: '3px 10px', backgroundColor: 'rgba(217, 255, 0, 0.6)', color: '#c4b5fd', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
  heroCompany: { color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '6px 0 0 0' },

  // Tabs
  tabBar: { display: 'flex', gap: '4px', backgroundColor: 'white', padding: '8px', borderRadius: '18px', border: '1px solid #e8e8e8', margin: '20px 0 0 0' },
  tabBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#64748b', transition: 'all 0.2s' },
  tabBtnActive: { backgroundColor: 'var(--primary)', color: 'white', fontWeight: '600', boxShadow: '0 4px 12px rgba(217, 255, 0, 0.3)' },

  // Content Card
  contentCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e8e8e8', marginTop: '16px', overflow: 'hidden' },
  formContent: { padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' },

  // Avatar section
  avatarSection: { display: 'flex', alignItems: 'center', gap: '24px' },
  avatarZone: { position: 'relative', width: '96px', height: '96px', borderRadius: '24px', flexShrink: 0 },
  avatarLarge: { width: '96px', height: '96px', borderRadius: '24px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitial: { fontSize: '36px', fontWeight: '700', color: 'white' },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: '24px', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'white', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', fontSize: '11px' },
  avatarName: { fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' },
  roleBadge: { display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(217, 255, 0, 0.18)', color: 'var(--primary)', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' },

  // Empresa
  empresaHeader: { display: 'flex', alignItems: 'center', gap: '24px', padding: '24px', backgroundColor: '#f4f4f4', borderRadius: '20px' },
  empresaLogo: { width: '72px', height: '72px', borderRadius: '18px', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0' },

  // Form
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' },
  input: { padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', color: 'var(--text-main)', transition: 'border-color 0.2s' },
  formActions: { display: 'flex', justifyContent: 'flex-end' },
  sectionSubtitle: { fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', margin: 0 },
  divider: { height: '1px', backgroundColor: '#ebebeb' },

  // Buttons
  btnPrimary: { padding: '14px 24px', borderRadius: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  btnOutline: { padding: '8px 16px', borderRadius: '10px', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  btnEdit: { padding: '8px', borderRadius: '10px', backgroundColor: '#ebebeb', color: '#64748b', border: 'none', cursor: 'pointer' },
  btnDelete: { padding: '8px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' },

  // Card styles
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  bankCard: { borderRadius: '20px', padding: '24px', color: 'white', position: 'relative' },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' },
  cardBrand: { fontSize: '20px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' },
  mainBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  cardNumber: { fontSize: '22px', fontWeight: '700', letterSpacing: '4px', marginBottom: '24px', fontFamily: 'monospace' },
  cardBottom: { display: 'flex', gap: '32px', alignItems: 'flex-end' },
  cardLabel: { fontSize: '9px', fontWeight: '700', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' },
  cardValue: { fontSize: '13px', fontWeight: '600', margin: 0 },
  cardActions: { marginLeft: 'auto', display: 'flex', gap: '8px' },
  cardBtn: { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },

  // Account styles
  accountCard: { backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  accountHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  accountIcon: { width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'rgba(217, 255, 0, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' },
  accountType: { fontSize: '12px', color: '#64748b', fontWeight: '600' },
  mainPill: { padding: '4px 12px', backgroundColor: 'rgba(217, 255, 0, 0.18)', color: 'var(--primary)', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  accountDetails: { display: 'flex', gap: '32px', padding: '16px', backgroundColor: '#f4f4f4', borderRadius: '14px', marginBottom: '16px', flexWrap: 'wrap' },
  accountDetail: { display: 'flex', flexDirection: 'column', gap: '4px' },
  accountDetailLabel: { fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  accountDetailValue: { fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' },
  accountFooter: { display: 'flex', gap: '8px', alignItems: 'center' },

  // Empty state
  emptyState: { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  emptyText: { color: '#94a3b8', fontWeight: '600', margin: 0 },

  // Security note
  securityNote: { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', backgroundColor: '#f4f4f4', borderRadius: '14px', border: '1px solid #e8e8e8' },
};

export default AdminProfile;
