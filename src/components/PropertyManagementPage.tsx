import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Check, CircleAlert, Clock3, FileImage, Plus, Save, Trash2, Video, X } from 'lucide-react';
import { fetchSessionUser, getStoredToken, registerUser, signIn, signOut } from '../auth';
import type { SessionUser } from '../auth';
import './marketAccount.css';

type PropertyKind = 'Hostel' | 'Apartment' | 'Frame' | 'House' | 'Land' | 'Commercial' | 'Other';
type TransactionType = 'Rent' | 'Sale';
type ApprovalStatus = 'Pending' | 'Approved' | 'Needs_Revision' | 'Withdrawn';
type AccountChoice = { id: number; name: string; role: 'Owner' | 'Agent' };
type PropertyRecord = {
  id: number;
  title: string;
  city: string;
  price: string;
  period: string;
  image: string;
  badge: string;
  tag: string;
  verification: string;
  status: string;
  approval_status: ApprovalStatus;
  approval_note: string;
  description: string;
  property_kind: PropertyKind;
  transaction_type: TransactionType;
  owner_id: number | null;
  agent_id: number | null;
  created_by: number;
  unit_label: string;
  bedrooms: number;
  bathrooms: number;
  lat: number | null;
  lng: number | null;
  features: string[];
  images: string[];
  videos: string[];
  updated_at: string;
};

type Editor = {
  title: string;
  city: string;
  price: string;
  period: string;
  transaction_type: TransactionType;
  property_kind: PropertyKind;
  unit_label: string;
  bedrooms: string;
  bathrooms: string;
  description: string;
  lat: string;
  lng: string;
  features: string[];
  featureDraft: string;
  imagesText: string;
  videosText: string;
  photoFiles: File[];
  videoFiles: File[];
  storedMedia: Array<{ id: string; url: string; kind: 'photo' | 'video' }>;
  owner_id: string;
  agent_id: string;
};

const commonFeatures = ['Wi-Fi', 'Balcony', 'Master bedroom', 'Parking', 'Air conditioning', 'Security', 'Water supply', 'Generator', 'Furnished', 'Garden'];
const emptyEditor = (): Editor => ({ title: '', city: '', price: '', period: 'per month', transaction_type: 'Rent', property_kind: 'Apartment', unit_label: '', bedrooms: '0', bathrooms: '0', description: '', lat: '', lng: '', features: [], featureDraft: '', imagesText: '', videosText: '', photoFiles: [], videoFiles: [], storedMedia: [], owner_id: '', agent_id: '' });
const listText = (items: string[] = []) => items.join('\n');
const parseLines = (value: string) => [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];

async function readPayload(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload;
}

export function PropertyManagementPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'register'>('signIn');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [people, setPeople] = useState<{ owners: AccountChoice[]; agents: AccountChoice[] }>({ owners: [], agents: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  const token = getStoredToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const refresh = async (currentSession = session) => {
    if (!currentSession) return;
    setIsLoading(true);
    try {
      const [propertyResponse, peopleResponse] = await Promise.all([
        fetch('/api/property-workbench', { cache: 'no-store', headers: authHeaders }),
        fetch('/api/property-workbench/users', { cache: 'no-store', headers: authHeaders }),
      ]);
      const [propertyPayload, peoplePayload] = await Promise.all([readPayload(propertyResponse), readPayload(peopleResponse)]);
      setProperties(propertyPayload.properties || []);
      setPeople({ owners: peoplePayload.owners || [], agents: peoplePayload.agents || [] });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Property records could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let current = true;
    fetchSessionUser().then((user) => { if (current) setSession(user); }).catch(() => { if (current) setSession(null); }).finally(() => { if (current) setIsCheckingSession(false); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    void refresh(session);
    const timer = window.setInterval(() => void refresh(session), 15000);
    return () => window.clearInterval(timer);
  }, [session]);

  const submitAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    try {
      const user = authMode === 'signIn'
        ? await signIn(authForm.email, authForm.password)
        : await registerUser(authForm.name, authForm.email, authForm.password, 'Owner');
      setSession(user);
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : 'Authentication failed.');
    }
  };

  const beginEdit = (property?: PropertyRecord) => {
    if (!property) {
      setEditingId(null);
      setEditor(emptyEditor());
      setApprovalNote('');
      return;
    }
    setEditingId(property.id);
    const mediaPattern = new RegExp(`^/api/properties/${property.id}/media/([^/?]+)$`);
    const storedMedia = [...(property.images || []).map((url) => ({ url, kind: 'photo' as const })), ...(property.videos || []).map((url) => ({ url, kind: 'video' as const }))]
      .flatMap((media) => {
        const match = media.url.match(mediaPattern);
        return match ? [{ ...media, id: match[1] }] : [];
      });
    const storedUrls = new Set(storedMedia.map((media) => media.url));
    setEditor({
      title: property.title || '', city: property.city || '', price: property.price || '', period: property.period || '',
      transaction_type: property.transaction_type || 'Rent', property_kind: property.property_kind || 'Apartment', unit_label: property.unit_label || '',
      bedrooms: String(property.bedrooms ?? 0), bathrooms: String(property.bathrooms ?? 0), description: property.description || '',
      lat: property.lat == null ? '' : String(property.lat), lng: property.lng == null ? '' : String(property.lng),
      features: property.features || [], featureDraft: '', imagesText: listText((property.images || []).filter((url) => !storedUrls.has(url))), videosText: listText((property.videos || []).filter((url) => !storedUrls.has(url))),
      photoFiles: [], videoFiles: [], storedMedia,
      owner_id: property.owner_id == null ? '' : String(property.owner_id), agent_id: property.agent_id == null ? '' : String(property.agent_id),
    });
    setApprovalNote(property.approval_note || '');
  };

  const setField = <K extends keyof Editor>(field: K, value: Editor[K]) => setEditor((current) => current ? { ...current, [field]: value } : current);

  const toggleFeature = (feature: string) => {
    if (!editor) return;
    setField('features', editor.features.includes(feature) ? editor.features.filter((item) => item !== feature) : [...editor.features, feature]);
  };

  const addFeature = () => {
    if (!editor) return;
    const feature = editor.featureDraft.trim();
    if (!feature || editor.features.some((item) => item.toLowerCase() === feature.toLowerCase())) return setField('featureDraft', '');
    setField('features', [...editor.features, feature]);
    setField('featureDraft', '');
  };

  const saveProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || isSaving) return;
    setIsSaving(true);
    setError('');
    setNotice('');
    const payload = {
      title: editor.title, city: editor.city, price: editor.price, period: editor.period,
      transaction_type: editor.transaction_type, property_kind: editor.property_kind, unit_label: editor.unit_label,
      bedrooms: Number(editor.bedrooms), bathrooms: Number(editor.bathrooms), description: editor.description,
      lat: editor.lat || null, lng: editor.lng || null, features: editor.features,
      images: parseLines(editor.imagesText), videos: parseLines(editor.videosText),
      owner_id: editor.owner_id || null, agent_id: editor.agent_id || null,
    };
    for (const file of [...editor.photoFiles, ...editor.videoFiles]) {
      const isPhoto = editor.photoFiles.includes(file);
      const maxBytes = isPhoto ? 15 * 1024 * 1024 : 70 * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`${file.name} exceeds the ${isPhoto ? '15 MB photo' : '70 MB video'} limit.`);
        return;
      }
    }
    try {
      const response = await fetch(editingId == null ? '/api/property-workbench' : `/api/property-workbench/${editingId}`, {
        method: editingId == null ? 'POST' : 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const savedPayload = await readPayload(response);
      const savedId = Number(savedPayload.property.id);
      try {
        for (const [kind, files] of [['photo', editor.photoFiles], ['video', editor.videoFiles]] as const) {
          for (const file of files) {
            const uploadResponse = await fetch(`/api/property-workbench/${savedId}/media`, {
              method: 'POST',
              headers: { ...authHeaders, 'Content-Type': file.type, 'X-Media-Kind': kind, 'X-File-Name': encodeURIComponent(file.name) },
              body: file,
            });
            await readPayload(uploadResponse);
          }
        }
      } catch (cause) {
        setEditingId(savedId);
        setEditor({ ...editor, photoFiles: [], videoFiles: [] });
        throw new Error(`Property saved as Pending, but media upload failed: ${cause instanceof Error ? cause.message : 'upload failed'}. Re-select the file and save again.`);
      }
      setEditor(null);
      setNotice(editingId == null ? 'Property saved as Pending. An Admin must approve it before public listing.' : 'Changes saved. The property is Pending Admin approval before it appears publicly.');
      setEditingId(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Property could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeStoredMedia = async (media: Editor['storedMedia'][number]) => {
    if (editingId == null) return;
    try {
      const response = await fetch(`/api/property-workbench/${editingId}/media/${media.id}`, { method: 'DELETE', headers: authHeaders });
      await readPayload(response);
      setEditor((current) => current ? { ...current, storedMedia: current.storedMedia.filter((item) => item.id !== media.id) } : current);
      setNotice('Media removed. The property is Pending Admin review.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media could not be removed.');
    }
  };

  const deleteProperty = async (property: PropertyRecord) => {
    if (!window.confirm(`Withdraw “${property.title}” from the active inventory?`)) return;
    setError('');
    try {
      const response = await fetch(`/api/property-workbench/${property.id}`, { method: 'DELETE', headers: authHeaders });
      await readPayload(response);
      setNotice('Property withdrawn. It is no longer in public inventory.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Property could not be withdrawn.');
    }
  };

  const decideApproval = async (property: PropertyRecord, decision: 'Approved' | 'Needs_Revision') => {
    setError('');
    try {
      const response = await fetch(`/api/property-workbench/${property.id}/approval`, {
        method: 'PATCH', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: approvalNote.trim() }),
      });
      await readPayload(response);
      setApprovalNote('');
      setNotice(decision === 'Approved' ? 'Property approved and published.' : 'Property returned to its owner/agent for revision.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Approval decision could not be saved.');
    }
  };

  if (isCheckingSession) return <main className="property-workbench-page"><p className="property-workbench-state">Checking your session…</p></main>;

  if (!session) return <main className="property-workbench-page">
    <header className="property-workbench-header"><a href="/">FLX Real Estate</a><a href="/">Back to marketplace</a></header>
    <section className="property-workbench-auth"><span>PROPERTY MANAGEMENT</span><h1>{authMode === 'signIn' ? 'Sign in to manage property records' : 'Create an Owner account'}</h1><p>Owners can manage their listings. Agents and Admins sign in with their assigned accounts.</p>
      <form onSubmit={submitAuthentication}>
        {authMode === 'register' && <label>Full name<input value={authForm.name} onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} autoComplete="username" required /></label>
        <label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} required minLength={8} /></label>
        {authError && <p className="property-workbench-error" role="alert">{authError}</p>}
        <button type="submit">{authMode === 'signIn' ? 'Sign in' : 'Create Owner account'}</button>
      </form>
      <button type="button" className="property-workbench-text-button" onClick={() => { setAuthMode((mode) => mode === 'signIn' ? 'register' : 'signIn'); setAuthError(''); }}>{authMode === 'signIn' ? 'New property owner? Create an account' : 'Already registered? Sign in'}</button>
    </section>
  </main>;

  return <main className="property-workbench-page">
    <header className="property-workbench-header"><a href="/">FLX Real Estate</a><div><span>{session.name}</span><b>{session.role}</b><button type="button" onClick={() => { signOut(); setSession(null); }}>Sign out</button></div></header>
    <div className="property-workbench-content">
      <div className="property-workbench-title"><div><span>PROPERTY WORKBENCH</span><h1>Property records</h1><p>Every change is saved to the shared property record. Edits return listings to Admin review.</p></div><button type="button" onClick={() => beginEdit()}><Plus size={16} /> Add property</button></div>
      {error && <p className="property-workbench-error" role="alert"><CircleAlert size={16} /> {error}</p>}
      {notice && <p className="property-workbench-notice" role="status"><Check size={16} /> {notice}</p>}
      {isLoading && <p className="property-workbench-state">Refreshing shared records…</p>}
      {!isLoading && properties.length === 0 && <div className="property-workbench-state"><strong>No property records yet</strong><span>Add the first property and its media links, features, owner, and agent assignment.</span></div>}
      <section className="property-workbench-list" aria-label="Property records">
        {properties.map((property) => <article className="property-record-card" key={property.id}>
          <div className="property-record-media">{property.images?.[0] ? <img src={property.images[0]} alt={property.title} /> : <FileImage size={23} />}</div>
          <div className="property-record-main"><div className="property-record-heading"><div><span className={`property-approval-badge is-${property.approval_status.toLowerCase()}`}>{property.approval_status.replace('_', ' ')}</span><small>{property.transaction_type} · {property.property_kind} {property.unit_label ? `· ${property.unit_label}` : ''}</small></div><strong>{property.price}<small>{property.period}</small></strong></div>
            <h2>{property.title}</h2><p>{property.city}</p>
            <div className="property-record-meta"><span>{property.bedrooms} bedrooms</span><span>{property.bathrooms} bathrooms</span><span>{property.images?.length || 0} photos</span><span>{property.videos?.length || 0} videos</span></div>
            <div className="property-feature-list">{property.features?.map((feature) => <span key={feature}>{feature}</span>)}</div>
            {(session.role === 'Admin' || (session.role === 'Agent' && property.approval_status === 'Pending')) && <label className="property-approval-note">Admin decision note<input value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Required when requesting revisions" /></label>}
            {property.approval_note && <p className="property-record-note">Review note: {property.approval_note}</p>}
            <div className="property-record-actions"><button type="button" onClick={() => beginEdit(property)}>Edit details</button><button type="button" className="is-danger" onClick={() => void deleteProperty(property)}>Withdraw listing</button>{session.role === 'Admin' && property.approval_status !== 'Approved' && <><button type="button" className="is-approve" onClick={() => void decideApproval(property, 'Approved')}>Approve & publish</button><button type="button" className="is-revision" disabled={!approvalNote.trim()} onClick={() => void decideApproval(property, 'Needs_Revision')}>Request revision</button></>}</div>
          </div>
        </article>)}
      </section>
    </div>

    {editor && <div className="property-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className="property-editor" role="dialog" aria-modal="true" aria-labelledby="property-editor-title">
      <header><div><span>{editingId == null ? 'NEW PROPERTY RECORD' : 'EDIT PROPERTY RECORD'}</span><h2 id="property-editor-title">{editingId == null ? 'Add a property' : 'Edit property details'}</h2><p>Saving changes sets this listing to Pending until an Admin approves it.</p></div><button type="button" aria-label="Close property editor" onClick={() => setEditor(null)}><X size={18} /></button></header>
      <form onSubmit={saveProperty}>
        <div className="property-editor-grid">
          <label className="is-wide">Property name<input value={editor.title} onChange={(event) => setField('title', event.target.value)} required /></label>
          <label>Property type<select value={editor.property_kind} onChange={(event) => setField('property_kind', event.target.value as PropertyKind)}>{(['Hostel','Apartment','Frame','House','Land','Commercial','Other'] as PropertyKind[]).map((kind) => <option key={kind}>{kind}</option>)}</select></label>
          <label>Listing type<select value={editor.transaction_type} onChange={(event) => { const transaction = event.target.value as TransactionType; setField('transaction_type', transaction); setField('period', transaction === 'Rent' ? 'per month' : 'For sale'); }}>{(['Rent','Sale'] as TransactionType[]).map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Price<input value={editor.price} onChange={(event) => setField('price', event.target.value)} placeholder="TZS 950,000" required /></label>
          <label>Payment period<input value={editor.period} onChange={(event) => setField('period', event.target.value)} placeholder="per month / per semester / outright" /></label>
          <label className="is-wide">Address / area<input value={editor.city} onChange={(event) => setField('city', event.target.value)} required /></label>
          <label>Unit or room label<input value={editor.unit_label} onChange={(event) => setField('unit_label', event.target.value)} placeholder="Room 2B, Frame 14" /></label>
          <label>Bedrooms / rooms<input type="number" min="0" max="100" value={editor.bedrooms} onChange={(event) => setField('bedrooms', event.target.value)} /></label>
          <label>Bathrooms<input type="number" min="0" max="100" step="0.5" value={editor.bathrooms} onChange={(event) => setField('bathrooms', event.target.value)} /></label>
          <label>Latitude<input type="number" step="any" value={editor.lat} onChange={(event) => setField('lat', event.target.value)} /></label>
          <label>Longitude<input type="number" step="any" value={editor.lng} onChange={(event) => setField('lng', event.target.value)} /></label>
          {(session.role === 'Agent' || session.role === 'Admin') && <label>Link Owner<select value={editor.owner_id} onChange={(event) => setField('owner_id', event.target.value)}><option value="">No owner linked</option>{people.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · #{owner.id}</option>)}</select></label>}
          {(session.role === 'Owner' || session.role === 'Admin') && <label>Assigned Agent<select value={editor.agent_id} onChange={(event) => setField('agent_id', event.target.value)}><option value="">No agent assigned</option>{people.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · #{agent.id}</option>)}</select></label>}
          <label className="is-wide">Description<textarea rows={4} value={editor.description} onChange={(event) => setField('description', event.target.value)} /></label>
        </div>

        <section className="property-editor-features"><div><h3>Property features</h3><p>Select common features or add custom ones. Remove any feature with its × control.</p></div><div className="property-feature-presets">{commonFeatures.map((feature) => <label key={feature}><input type="checkbox" checked={editor.features.includes(feature)} onChange={() => toggleFeature(feature)} /> {feature}</label>)}</div><div className="property-feature-add"><input aria-label="Add a custom feature" value={editor.featureDraft} onChange={(event) => setField('featureDraft', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFeature(); } }} placeholder="Add feature, e.g. ensuite bathroom" /><button type="button" onClick={addFeature}><Plus size={14} /> Add</button></div><div className="property-feature-list">{editor.features.map((feature) => <span key={feature}>{feature}<button type="button" aria-label={`Remove ${feature}`} onClick={() => toggleFeature(feature)}><X size={12} /></button></span>)}</div></section>

        <section className="property-editor-features property-editor-media">
          <div><h3>Photos and videos</h3><p>Upload onsite media or add hosted HTTPS links. Photos up to 15 MB; videos up to 70 MB. Uploading new media returns the listing to Admin review.</p></div>
          {editor.storedMedia.length > 0 && <div className="property-uploaded-media">{editor.storedMedia.map((media) => <div key={media.id}><span>{media.kind === 'photo' ? <FileImage size={14} /> : <Video size={14} />} {media.kind === 'photo' ? 'Uploaded photo' : 'Uploaded video'} · {media.id.slice(0, 8)}</span><button type="button" aria-label={`Remove uploaded ${media.kind}`} onClick={() => void removeStoredMedia(media)}><Trash2 size={14} /></button></div>)}</div>}
          <div className="property-editor-grid property-editor-media-fields">
            <label>Upload photos<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => setField('photoFiles', Array.from(event.target.files || []))} /><small>{editor.photoFiles.map((file) => file.name).join(' · ') || 'JPG, PNG, WebP or AVIF'}</small></label>
            <label>Upload videos<input type="file" accept="video/mp4,video/webm,video/quicktime" multiple onChange={(event) => setField('videoFiles', Array.from(event.target.files || []))} /><small>{editor.videoFiles.map((file) => file.name).join(' · ') || 'MP4, WebM or MOV'}</small></label>
            <label>Photo URLs <small>One HTTPS image URL per line</small><textarea rows={3} value={editor.imagesText} onChange={(event) => setField('imagesText', event.target.value)} placeholder="https://…/front.jpg" /></label>
            <label>Video URLs <small>One HTTPS video or hosted video link per line</small><textarea rows={3} value={editor.videosText} onChange={(event) => setField('videosText', event.target.value)} placeholder="https://…/property-tour.mp4" /></label>
          </div>
        </section>
        {error && <p className="property-workbench-error" role="alert">{error}</p>}
        <footer><button type="button" className="is-cancel" onClick={() => setEditor(null)}>Cancel</button><button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : <><Save size={15} /> Save pending review</>}</button></footer>
      </form>
    </section></div>}
  </main>;
}
