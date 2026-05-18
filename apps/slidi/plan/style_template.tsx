import React, { useState } from 'react';
import {
    Settings2,
    Share,
    Code2,
    Presentation,
    ArrowRight,
    Layers,
    TerminalSquare,
    SquareDashedBottomCode
} from 'lucide-react';

export default function SlidiApp() {
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
    const [chatInput, setChatInput] = useState('');

    return (
        <div className="flex flex-col h-screen bg-[#FDFDFD] font-sans text-slate-900 overflow-hidden selection:bg-slate-900 selection:text-white">
            {/* --- Top Navigation Bar --- */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
                {/* Minimalist Logo */}
                <div className="flex items-center gap-3 w-64">
                    <div className="w-6 h-6 bg-slate-900 flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tighter uppercase text-slate-900">
                        Slidi /
                    </span>
                </div>

                {/* View Toggle - Segmented Control Style */}
                <div className="flex items-center bg-slate-50 p-1 rounded-sm border border-slate-200/60">
                    <button
                        onClick={() => setActiveView('preview')}
                        className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${activeView === 'preview'
                                ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <Presentation className="w-3.5 h-3.5" />
                        Canvas
                    </button>
                    <button
                        onClick={() => setActiveView('code')}
                        className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${activeView === 'code'
                                ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <Code2 className="w-3.5 h-3.5" />
                        Source
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 w-64 justify-end">
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors">
                        <Share className="w-3.5 h-3.5" />
                        Deploy
                    </button>
                    <button className="text-slate-400 hover:text-slate-900 transition-colors" title="Configuration">
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* --- Main Content Area --- */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left Pane: The Thread (Formerly Chat) */}
                <aside className="w-[30%] min-w-[320px] max-w-[400px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-widest">Command Log</h2>
                        <TerminalSquare className="w-4 h-4 text-slate-300" />
                    </div>

                    {/* Thread Messages - Log Style */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* User Command */}
                        <div className="relative pl-5 border-l-[1.5px] border-slate-200">
                            <div className="absolute w-2 h-2 bg-slate-200 rounded-full -left-[4.5px] top-1"></div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase mb-1.5">User Input</div>
                            <p className="text-sm text-slate-800 font-medium leading-relaxed">
                                Generate a 3-slide pitch deck for a modern presentation tool. Prioritize strong typography and brutalist design.
                            </p>
                        </div>

                        {/* System Process */}
                        <div className="relative pl-5 border-l-[1.5px] border-slate-200">
                            <div className="absolute w-2 h-2 bg-slate-800 rounded-full -left-[4.5px] top-1"></div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase mb-1.5">System Process</div>
                            <div className="text-sm text-slate-600 leading-relaxed space-y-2">
                                <p>Scaffolding document structure...</p>
                                <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-blue-600 animate-pulse">Running build</span>
                                    <span className="text-slate-400">compiling components 45%</span>
                                </div>
                            </div>
                        </div>

                        {/* System Completion */}
                        <div className="relative pl-5 border-l-[1.5px] border-slate-800">
                            <div className="absolute w-2 h-2 bg-blue-600 rounded-full -left-[4.5px] top-1"></div>
                            <div className="text-[10px] font-mono text-slate-800 font-semibold uppercase mb-1.5">Output Ready</div>
                            <div className="text-sm text-slate-800 leading-relaxed">
                                <p>Initial layout mapped. Slide 1 rendered in preview pane. Waiting for further commands to adjust layout or styling.</p>
                            </div>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white">
                        <div className="relative flex items-end border border-slate-300 bg-slate-50 focus-within:border-blue-600 focus-within:bg-white transition-colors">
                            <div className="p-3 text-slate-400">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                            <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Enter command..."
                                className="w-full bg-transparent py-3 pr-12 text-sm focus:outline-none resize-none h-12 leading-tight placeholder:text-slate-400"
                                rows={1}
                            />
                            <button className="absolute right-2 bottom-2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <SquareDashedBottomCode className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-3 px-1">
                            <span className="text-[10px] font-mono text-slate-400">v 1.0.4 - stable</span>
                            <span className="text-[10px] font-mono text-slate-400">Press ↵ to send</span>
                        </div>
                    </div>
                </aside>

                {/* Right Pane: The Canvas */}
                <section className="flex-1 relative bg-slate-100 flex flex-col">
                    {/* Subtle Grid Background */}
                    <div className="absolute inset-0 z-0 opacity-10"
                        style={{ backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    </div>

                    <div className="flex-1 overflow-auto flex items-center justify-center p-12 z-10">
                        {activeView === 'preview' ? (
                            /* Visual Slide Mockup - Swiss Design Aesthetic */
                            <div className="w-full max-w-4xl aspect-video bg-white shadow-2xl relative flex flex-col p-16 border-t-8 border-t-blue-600 transform transition-transform hover:scale-[1.01] duration-500">

                                <div className="flex justify-between items-start mb-auto">
                                    <span className="font-mono text-sm text-slate-400 tracking-widest">SLIDI.CORE</span>
                                    <div className="text-right">
                                        <span className="font-mono text-sm text-slate-900 font-bold">01</span>
                                        <span className="font-mono text-sm text-slate-400"> / 03</span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center max-w-3xl">
                                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-slate-900 leading-[0.85] uppercase">
                                        Structural<br />Clarity.
                                    </h1>

                                    <div className="w-24 h-2 bg-slate-900 mt-10 mb-8"></div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <p className="text-slate-600 text-lg leading-snug font-medium">
                                            A new paradigm for presentation software. Less generative noise, more typographic rigor.
                                        </p>
                                        <ul className="space-y-3 font-mono text-sm text-slate-500">
                                            <li className="flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-blue-600 block"></span>
                                                Programmatic Layouts
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-slate-800 block"></span>
                                                Version Controlled Design
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 bg-slate-800 block"></span>
                                                Export to React / HTML
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Code View Mockup - IDE Vibe */
                            <div className="w-full max-w-4xl h-[600px] bg-slate-950 shadow-2xl flex flex-col border border-slate-800">
                                <div className="h-10 bg-slate-900 flex items-center px-4 justify-between border-b border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer transition-colors">Slide1.tsx</span>
                                        <span className="text-xs font-mono text-slate-600">globals.css</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Read Only</span>
                                </div>
                                <div className="flex-1 p-6 overflow-auto text-sm font-mono leading-relaxed bg-slate-950">
                                    <pre className="text-slate-300">
                                        <span className="text-slate-500">{'// Generated by Slidi Engine v1.0.4'}</span>
                                        <span className="text-blue-400">import</span> {'{'} Slide, Text, Container {'}'} <span className="text-blue-400">from</span> <span className="text-emerald-400">'@slidi/core'</span>;

                                        <span className="text-blue-400">export default</span> <span className="text-purple-400">function</span> <span className="text-yellow-300">Slide1</span>() {'{'}
                                        <span className="text-blue-400">return</span> (
                                        &lt;<span className="text-sky-400">Slide</span> <span className="text-emerald-300">theme</span>=<span className="text-emerald-400">"swiss-minimal"</span>&gt;
                                        &lt;<span className="text-sky-400">Container</span> <span className="text-emerald-300">layout</span>=<span className="text-emerald-400">"grid-split"</span> <span className="text-emerald-300">accent</span>=<span className="text-emerald-400">"blue-600"</span>&gt;

                                        &lt;<span className="text-sky-400">header</span> <span className="text-emerald-300">className</span>=<span className="text-emerald-400">"flex justify-between"</span>&gt;
                                        &lt;<span className="text-sky-400">Text</span> <span className="text-emerald-300">variant</span>=<span className="text-emerald-400">"meta"</span>&gt;SLIDI.CORE&lt;/<span className="text-sky-400">Text</span>&gt;
                                        &lt;<span className="text-sky-400">Text</span> <span className="text-emerald-300">variant</span>=<span className="text-emerald-400">"meta-bold"</span>&gt;01 / 03&lt;/<span className="text-sky-400">Text</span>&gt;
                                        &lt;/<span className="text-sky-400">header</span>&gt;

                                        &lt;<span className="text-sky-400">Text</span> <span className="text-emerald-300">variant</span>=<span className="text-emerald-400">"h1-display"</span> <span className="text-emerald-300">className</span>=<span className="text-emerald-400">"uppercase mt-auto"</span>&gt;
                                        Structural{'{'}<span className="text-yellow-300">'\n'</span>{'}'}Clarity.
                                        &lt;/<span className="text-sky-400">Text</span>&gt;

                                        &lt;<span className="text-sky-400">Divider</span> <span className="text-emerald-300">color</span>=<span className="text-emerald-400">"slate-900"</span> <span className="text-emerald-300">width</span>=<span className="text-emerald-400">"96px"</span> /&gt;

                                        <span className="text-slate-500">{'/* Content Block */'}</span>
                                        &lt;<span className="text-sky-400">div</span> <span className="text-emerald-300">className</span>=<span className="text-emerald-400">"grid grid-cols-2 gap-8"</span>&gt;
                                        &lt;<span className="text-sky-400">Text</span> <span className="text-emerald-300">variant</span>=<span className="text-emerald-400">"body-lead"</span>&gt;
                                        A new paradigm for presentation software...
                                        &lt;/<span className="text-sky-400">Text</span>&gt;
                                        &lt;/<span className="text-sky-400">div</span>&gt;

                                        &lt;/<span className="text-sky-400">Container</span>&gt;
                                        &lt;/<span className="text-sky-400">Slide</span>&gt;
                                        );
                                        {'}'}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}