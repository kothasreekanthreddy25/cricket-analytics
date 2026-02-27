'use client'

import { Award, Zap, GraduationCap, BrainCircuit, Bot, Sparkles } from 'lucide-react'

export default function AdSidebar() {
  return (
    <div className="sticky top-20 space-y-4">
      {/* ── Sponsor of the Month ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Sponsor of the Month
          </span>
        </div>
        <div className="p-4 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-3">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Yoshikha Technologies
          </h3>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            Transforming businesses with cutting-edge AI & Machine Learning solutions
          </p>
          <a
            href="https://yoshikha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-all"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* ── Offers ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Top Offers
          </span>
        </div>
        <div className="divide-y divide-gray-800">
          {/* Offer 1 */}
          <a
            href="https://yoshikha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 hover:bg-gray-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                AI/ML Training Program
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Master TensorFlow, PyTorch & NLP. Live projects + certification.
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                50% OFF — Limited Seats
              </span>
            </div>
          </a>

          {/* Offer 2 */}
          <a
            href="https://yoshikha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 hover:bg-gray-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                ChatBot Development Course
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Build production chatbots with LLMs, RAG & fine-tuning.
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                New Batch — Enroll Now
              </span>
            </div>
          </a>

          {/* Offer 3 */}
          <a
            href="https://yoshikha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 hover:bg-gray-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                Generative AI Workshop
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Hands-on with Stable Diffusion, GPT APIs & image generation.
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                Free Demo Class
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* ── Ad Banner — AI Training ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-3 pt-2">
          Advertisement
        </p>
        <div className="p-4">
          <div className="rounded-lg bg-gradient-to-br from-indigo-900/80 via-violet-900/60 to-gray-900 border border-violet-500/20 p-4 text-center">
            <BrainCircuit className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">
              Learn AI & Data Science
            </h4>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
              Industry-ready AI training by Yoshikha Technologies. 100% placement assistance.
            </p>
            <a
              href="https://yoshikha.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-gray-900 text-[11px] font-bold px-4 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
            >
              Start Learning &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* ── Ad Banner — Corporate Training ── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-3 pt-2">
          Advertisement
        </p>
        <div className="p-4">
          <div className="rounded-lg bg-gradient-to-br from-emerald-900/60 via-teal-900/40 to-gray-900 border border-emerald-500/20 p-4 text-center">
            <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">
              Corporate AI Solutions
            </h4>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
              Custom AI models, automation & team training by Yoshikha Technologies.
            </p>
            <a
              href="https://yoshikha.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-md hover:bg-emerald-400 transition-colors"
            >
              Get a Quote &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
