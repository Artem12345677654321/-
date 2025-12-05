import React, { useState } from 'react';
import { Search, ArrowRight, Loader2, Globe, ExternalLink } from 'lucide-react';
import { generateGroundedContent } from '../services/geminiService';

export const SmartSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await generateGroundedContent(query);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleSearch} className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Omni about anything..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <button 
          type="submit"
          disabled={loading || !query}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {result ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{result.text}</p>
            </div>
            
            {result.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Sources
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-indigo-400 transition-all truncate max-w-full"
                    >
                      <span className="truncate max-w-[150px]">{source.title}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !loading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Globe className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Search the real world with live grounding.</p>
          </div>
        )}
      </div>
    </div>
  );
};
