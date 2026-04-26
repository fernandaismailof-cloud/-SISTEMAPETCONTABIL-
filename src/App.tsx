/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle } from './lib/firebase';
import { db } from './lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  LogOut, 
  Mic, 
  Camera, 
  Send,
  Loader2,
  Trash2,
  Calendar,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';
import { processAIInput, TransactionData } from './services/geminiService';
import { Transaction } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(data);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
    });

    return unsubscribe;
  }, [user]);

  const handleAddTransaction = async (data: TransactionData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...data,
        userId: user.uid,
        attachmentType: 'none',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error adding transaction:", e);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setAiLoading(true);
    const result = await processAIInput(inputText);
    if (result) {
      await handleAddTransaction(result);
      setInputText('');
    }
    setAiLoading(false);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await processAIInput({
        mimeType: file.type,
        data: base64
      });
      if (result) {
        await handleAddTransaction(result);
      }
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [], 'audio/*': [] },
    multiple: false
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md space-y-8"
        >
          <div className="space-y-2">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xl">
              <Wallet size={40} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-stone-900">Pet Contábil</h1>
            <p className="text-lg text-stone-500">
              O braço direito financeiro da sua clínica veterinária.
            </p>
          </div>
          
          <button
            onClick={signInWithGoogle}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-lg font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="h-6 w-6" alt="Google" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wallet size={18} />
            </div>
            <span className="text-xl font-bold tracking-tight">Pet Contábil</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium">{user.displayName}</p>
              <button 
                onClick={() => auth.signOut()}
                className="text-xs text-stone-500 hover:text-red-600"
              >
                Sair
              </button>
            </div>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="h-10 w-10 rounded-full border border-stone-200"
              alt="Avatar"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Summary Section */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard 
              title="Saldo Atual" 
              value={balance} 
              icon={<Wallet className="text-sky-600" />} 
              trend={balance >= 0 ? 'up' : 'down'}
            />
            <SummaryCard 
              title="Receitas" 
              value={income} 
              icon={<TrendingUp className="text-emerald-600" />} 
              positive
            />
            <SummaryCard 
              title="Despesas" 
              value={expense} 
              icon={<TrendingDown className="text-orange-600" />} 
              negative
            />
          </div>

          {/* Input Section */}
          <section className="lg:col-span-12">
            <div 
              {...getRootProps()} 
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-white p-6 transition-all hover:border-emerald-300",
                isDragActive && "border-emerald-500 bg-emerald-50/50"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="relative flex flex-col items-center gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex gap-4">
                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform hover:scale-110">
                      <Mic size={24} />
                    </button>
                    <button className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-transform hover:scale-110">
                      <Camera size={24} />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold">Assistente Pet Contábil</h3>
                  <p className="text-sm text-stone-500">
                    Mande um texto (ex: "Gastei 50 reais em vacinas"), grave um áudio ou suba a foto de um recibo.
                  </p>
                </div>

                <form onSubmit={handleTextSubmit} className="relative w-full max-w-2xl">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Como posso ajudar hoje?"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 pr-12 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    disabled={aiLoading}
                  />
                  <button 
                    type="submit"
                    disabled={aiLoading || !inputText.trim()}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 disabled:text-stone-300"
                  >
                    {aiLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send size={24} />}
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* List Section */}
          <section className="lg:col-span-12 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Transações Recentes</h2>
              <button className="flex items-center gap-1 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700">
                <Calendar size={16} />
                Este mês
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {transactions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-stone-100 bg-white p-12 text-center"
                  >
                    <p className="text-stone-400">Nenhuma transação registrada ainda.</p>
                  </motion.div>
                ) : (
                  transactions.map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, icon, positive, negative, trend }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
  trend?: 'up' | 'down';
}) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            trend === 'up' ? "text-emerald-500" : "text-orange-500"
          )}>
            {trend === 'up' ? '+2.4%' : '-1.2%'}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
        <p className={cn(
          "text-2xl font-bold tracking-tight",
          positive && "text-emerald-600",
          negative && "text-orange-600"
        )}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
        </p>
      </div>
    </motion.div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center justify-between rounded-2xl border border-stone-100 bg-white p-4 transition-all hover:border-stone-200 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          transaction.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
        )}>
          {transaction.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div>
          <h4 className="font-semibold text-stone-900">{transaction.description}</h4>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium uppercase">{transaction.category}</span>
            <span>•</span>
            <span>{format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p className={cn(
          "text-lg font-bold tracking-tight",
          transaction.type === 'income' ? "text-emerald-600" : "text-stone-900"
        )}>
          {transaction.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
        </p>
        <button className="invisible group-hover:visible text-stone-300 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

