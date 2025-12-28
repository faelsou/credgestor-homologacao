import React, { useContext, useState } from 'react';
import { Shield, Briefcase, Plus, Trash2, Mail } from 'lucide-react';
import { AppContext } from '@/pages/App';
import { UserRole, User } from '@/types';

export const UsersView: React.FC = () => {
  const { usersList, addUser, removeUser, user } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New User State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.COLLECTION);
  const [whatsappContacts, setWhatsappContacts] = useState('');

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="text-center p-10 text-slate-500">
        <Shield size={48} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Negado</h2>
        <p>Apenas administradores podem gerenciar a equipe.</p>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      role,
      whatsappContacts: whatsappContacts
        .split(/[,;\n]/)
        .map(item => item.trim())
        .filter(Boolean)
    };

    try {
      await addUser(newUser);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole(UserRole.COLLECTION);
      setWhatsappContacts('');
    } catch (err) {
      console.error('Erro ao adicionar usuário', err);
      alert('Não foi possível cadastrar o usuário no Supabase. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Equipe & Acessos</h2>
           <p className="text-slate-500 text-sm">Gerencie quem tem acesso ao sistema</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-900 transition shadow-lg shadow-slate-200"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {usersList.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === UserRole.ADMIN ? <Shield size={24} /> : <Briefcase size={24} />}
                </div>
                {u.id !== user?.id && (
                    <button
                        onClick={async () => {
                            if(window.confirm('Tem certeza que deseja remover este usuário?')) {
                              try {
                                await removeUser(u.id);
                              } catch (err) {
                                console.error('Erro ao remover usuário', err);
                                alert('Falha ao remover usuário no Supabase.');
                              }
                            }
                        }}
                        className="text-slate-400 hover:text-red-500 transition"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
            
            <div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">{u.name}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                    <Mail size={14} /> {u.email}
                </div>
                {u.whatsappContacts?.length ? (
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-600">WhatsApp Admin</p>
                    <ul className="space-y-1">
                      {u.whatsappContacts.map(contact => (
                        <li key={contact} className="font-mono text-slate-600">{contact}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-auto">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                    {u.role === UserRole.ADMIN ? 'Acesso Total' : 'Somente Leitura'}
                </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Cadastro Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Adicionar Membro da Equipe</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                    required 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                    required
                    type="email"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input
                    required
                    type="password"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp do Admin (opcional)</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white text-sm"
                  placeholder="Inclua um número por linha ou separado por vírgula"
                  rows={3}
                  value={whatsappContacts}
                  onChange={e => setWhatsappContacts(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Números cadastrados receberão o relatório diário automaticamente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Acesso</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setRole(UserRole.COLLECTION)}
                        className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition ${
                            role === UserRole.COLLECTION 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Briefcase size={20} />
                        Cobrador
                        <span className="text-[10px] opacity-70">Leitura, WhatsApp</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole(UserRole.ADMIN)}
                        className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition ${
                            role === UserRole.ADMIN 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Shield size={20} />
                        Administrador
                        <span className="text-[10px] opacity-70">Acesso Total</span>
                    </button>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};