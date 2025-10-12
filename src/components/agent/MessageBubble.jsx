
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-slate-50",
                    expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-slate-700">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-slate-500", isError && "text-red-600")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-slate-400 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Parameters:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Result:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ChartRenderer = ({ chartConfig }) => {
    const { type, data, config } = chartConfig;
    const title = config?.title || 'Chart';
    const dataKey = config?.dataKey || 'value';

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

    if (type === 'bar') {
        return (
            <div className="my-4 p-4 bg-white border rounded-lg overflow-hidden">
                <h4 className="text-sm font-semibold mb-3 text-slate-700 break-words">{title}</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                            <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'line') {
        return (
            <div className="my-4 p-4 bg-white border rounded-lg overflow-hidden">
                <h4 className="text-sm font-semibold mb-3 text-slate-700 break-words">{title}</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'pie') {
        return (
            <div className="my-4 p-4 bg-white border rounded-lg overflow-hidden">
                <h4 className="text-sm font-semibold mb-3 text-slate-700 break-words">{title}</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={dataKey}
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return null;
};

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    
    // Process content to extract and render charts
    const processContent = (content) => {
        if (!content) return null;

        // Split content by code blocks
        const parts = [];
        let lastIndex = 0;
        const chartRegex = /```json-chart\n([\s\S]*?)```/g;
        let match;

        while ((match = chartRegex.exec(content)) !== null) {
            // Add text before chart
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex, match.index)
                });
            }

            // Add chart
            try {
                const chartConfig = JSON.parse(match[1]);
                parts.push({
                    type: 'chart',
                    config: chartConfig
                });
            } catch (error) {
                console.error('Failed to parse chart JSON:', error);
                // If parsing fails, show as code
                parts.push({
                    type: 'text',
                    content: match[0]
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.substring(lastIndex)
            });
        }

        return parts.length > 0 ? parts : [{ type: 'text', content }];
    };

    const contentParts = !isUser ? processContent(message.content) : null;
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                </div>
            )}
            <div className={cn("max-w-[85%] min-w-0", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5 break-words overflow-hidden",
                        isUser ? "bg-slate-800 text-white" : "bg-white border border-slate-200"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed break-words">{message.content}</p>
                        ) : (
                            <div className="overflow-hidden">
                                {contentParts && contentParts.map((part, index) => (
                                    part.type === 'chart' ? (
                                        <ChartRenderer key={index} chartConfig={part.config} />
                                    ) : (
                                        <ReactMarkdown 
                                            key={index}
                                            className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words overflow-wrap-anywhere"
                                            components={{
                                                code: ({ inline, className, children, ...props }) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="relative group/code overflow-hidden">
                                                            <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2 break-all whitespace-pre-wrap">
                                                                <code className={className} {...props}>{children}</code>
                                                            </pre>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                                    toast.success('Code copied');
                                                                }}
                                                            >
                                                                <Copy className="h-3 w-3 text-slate-400" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs break-all">
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                a: ({ children, ...props }) => (
                                                    <a {...props} target="_blank" rel="noopener noreferrer" className="break-words">{children}</a>
                                                ),
                                                p: ({ children }) => <p className="my-1 leading-relaxed break-words">{children}</p>,
                                                ul: ({ children }) => <ul className="my-1 ml-4 list-disc break-words">{children}</ul>,
                                                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal break-words">{children}</ol>,
                                                li: ({ children }) => <li className="my-0.5 break-words">{children}</li>,
                                                h1: ({ children }) => <h1 className="text-lg font-semibold my-2 break-words">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-base font-semibold my-2 break-words">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-sm font-semibold my-2 break-words">{children}</h3>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600 break-words">
                                                        {children}
                                                    </blockquote>
                                                ),
                                                table: ({ children }) => (
                                                    <div className="overflow-x-auto my-2">
                                                        <table className="min-w-full border-collapse">{children}</table>
                                                    </div>
                                                ),
                                            }}
                                        >
                                            {part.content}
                                        </ReactMarkdown>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 w-full">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
