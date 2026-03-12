"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  
  const [cards, setCards] = useState<any[]>([])
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Lấy thông tin bộ thẻ
      const { data: setData } = await supabase
        .from('study_sets')
        .select('title, description')
        .eq('id', id)
        .single()
      
      if (setData) {
        setTitle(setData.title)
        setDescription(setData.description || '')
      }

      // 2. Lấy danh sách cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', id)
        .order('id', { ascending: true })
      
      // 3. Lấy tiến độ học tập của User hiện tại
      const { data: progressData } = await supabase
        .from('learning_progress')
        .select('card_id')
        .eq('user_id', user.id)
        .eq('status', 'mastered')

      if (cardsData) setCards(cardsData)
      if (progressData) {
        setMasteredIds(new Set(progressData.map(p => p.card_id)))
      }
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  const toggleMastered = async (cardId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isAlreadyMastered = masteredIds.has(cardId)
    
    // Cập nhật Database (Upsert)
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ 
        user_id: user.id, 
        card_id: cardId, 
        status: isAlreadyMastered ? 'learning' : 'mastered',
        last_reviewed: new Date().toISOString()
      }, { onConflict: 'user_id, card_id' })

    if (!error) {
      // Cập nhật UI cục bộ để ko cần load lại trang
      const newMastered = new Set(masteredIds)
      if (isAlreadyMastered) newMastered.delete(cardId)
      else newMastered.add(cardId)
      setMasteredIds(newMastered)
    }
  }

  const nextCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev + 1) % cards.length) }
  const prevCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length) }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-emerald-600 font-bold animate-pulse text-xs tracking-widest uppercase">Đang mở học phần...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 pb-20">
      <nav className="sticky top-0 z-10 backdrop-blur-md bg-white/60 border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xs font-black uppercase tracking-tighter text-slate-400 hover:text-emerald-600 transition">
            ← Dashboard
          </Link>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700/40">IELTS Lock In Mode</div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-10">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="mt-2 text-slate-500 italic text-sm">{description}</p>
        </div>

        {cards.length > 0 && (
          <div className="mb-16">
            <div 
              className="relative h-64 md:h-96 w-full cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] shadow-2xl shadow-emerald-100/30 border border-emerald-50 flex items-center justify-center p-12 text-center">
                  <span className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tighter">{cards[currentIndex].term}</span>
                </div>
                <div className="absolute inset-0 backface-hidden bg-emerald-600 rounded-[3rem] shadow-2xl rotate-y-180 flex items-center justify-center p-12 text-center">
                  <span className="text-2xl md:text-3xl font-medium text-white leading-relaxed">{cards[currentIndex].definition}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between max-w-sm mx-auto">
              <button onClick={prevCard} className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center hover:bg-emerald-50 transition active:scale-90 text-slate-400">←</button>
              
              {/* Nút Đã Thuộc quan trọng */}
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMastered(cards[currentIndex].id) }}
                className={`flex flex-col items-center gap-1 transition-all ${masteredIds.has(cards[currentIndex].id) ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
              >
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${masteredIds.has(cards[currentIndex].id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-current'}`}>
                   {masteredIds.has(cards[currentIndex].id) ? '✓' : '?'}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{masteredIds.has(cards[currentIndex].id) ? 'Đã thuộc' : 'Chưa thuộc'}</span>
              </button>

              <button onClick={nextCard} className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center hover:bg-emerald-50 transition active:scale-90 text-slate-400">→</button>
            </div>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold text-slate-800">Danh sách thẻ ({cards.length})</h2>
             <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
               Tiến độ: {Math.round((masteredIds.size / (cards.length || 1)) * 100)}%
             </div>
          </div>
          
          <div className="grid gap-4">
            {cards.map((card) => (
              <div key={card.id} className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm flex items-center gap-6 transition hover:shadow-md">
                <button 
                  onClick={() => toggleMastered(card.id)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${masteredIds.has(card.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}
                >
                  <span className="text-[10px]">✓</span>
                </button>
                <div className="md:w-1/3 font-bold text-slate-800">{card.term}</div>
                <div className="flex-1 text-slate-500 text-sm leading-relaxed border-l pl-6 border-slate-100">{card.definition}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}