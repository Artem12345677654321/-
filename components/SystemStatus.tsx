import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: '1', value: 400 },
  { name: '2', value: 300 },
  { name: '3', value: 550 },
  { name: '4', value: 450 },
  { name: '5', value: 600 },
  { name: '6', value: 350 },
  { name: '7', value: 700 },
];

export const SystemStatus: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-end mb-4">
         <div>
            <div className="text-2xl font-bold text-white">98%</div>
            <div className="text-xs text-emerald-400">System Optimal</div>
         </div>
         <div className="text-right">
            <div className="text-xs text-slate-500">Latency</div>
            <div className="text-sm text-slate-300 font-mono">24ms</div>
         </div>
       </div>
       
       <div className="flex-1 min-h-[100px] w-full">
         <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={data}>
             <defs>
               <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                 <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
               </linearGradient>
             </defs>
             <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#818cf8' }}
                labelStyle={{ display: 'none' }}
             />
             <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
             />
           </AreaChart>
         </ResponsiveContainer>
       </div>
       
       <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
             <span className="text-slate-500 block">Thinking Budget</span>
             <span className="text-indigo-300 font-mono">2048 TK</span>
          </div>
          <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
             <span className="text-slate-500 block">Context Window</span>
             <span className="text-indigo-300 font-mono">2M</span>
          </div>
       </div>
    </div>
  );
};
