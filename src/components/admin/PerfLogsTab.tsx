import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PerfLog {
  id: string;
  user_id: string;
  case_id: string | null;
  created_at: string;
  stt_ms: number | null;
  chat_api_ms: number | null;
  chat_db_ms: number | null;
  chat_ai_ms: number | null;
  tts_api_ms: number | null;
  tts_generation_ms: number | null;
  audio_download_ms: number | null;
  audio_play_ms: number | null;
  total_ms: number | null;
  tts_provider: string | null;
  metadata: Record<string, any> | null;
}

const PAGE_SIZE = 25;

function MsCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = value < 500 ? 'text-green-600 dark:text-green-400' :
                value < 1500 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400';
  return <span className={cn('font-mono text-xs font-medium', color)}>{value.toLocaleString()}ms</span>;
}

export function PerfLogsTab() {
  const [logs, setLogs] = useState<PerfLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [ttsFilter, setTtsFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // Profile cache for display names
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chat_perf_logs')
        .select('*', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (ttsFilter !== 'all') {
        query = query.eq('tts_provider', ttsFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs((data as PerfLog[]) || []);
      setTotalCount(count || 0);

      // Fetch profiles for user_ids
      const userIds = [...new Set((data || []).map((l: PerfLog) => l.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profiles) {
          const cache: Record<string, string> = {};
          for (const p of profiles) {
            cache[p.id] = p.full_name || p.email || p.id.slice(0, 8);
          }
          setProfileCache(prev => ({ ...prev, ...cache }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch perf logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, ttsFilter, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
    </TableHead>
  );

  // Compute averages
  const averages = useMemo(() => {
    if (logs.length === 0) return null;
    const avg = (key: keyof PerfLog) => {
      const vals = logs.map(l => l[key] as number | null).filter((v): v is number => v != null);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return {
      stt_ms: avg('stt_ms'),
      chat_api_ms: avg('chat_api_ms'),
      chat_db_ms: avg('chat_db_ms'),
      chat_ai_ms: avg('chat_ai_ms'),
      tts_api_ms: avg('tts_api_ms'),
      tts_generation_ms: avg('tts_generation_ms'),
      audio_download_ms: avg('audio_download_ms'),
      audio_play_ms: avg('audio_play_ms'),
      total_ms: avg('total_ms'),
    };
  }, [logs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filteredLogs = search
    ? logs.filter(l => {
        const name = profileCache[l.user_id] || '';
        return name.toLowerCase().includes(search.toLowerCase()) ||
               (l.case_id && l.case_id.toLowerCase().includes(search.toLowerCase()));
      })
    : logs;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Voice Chat Performance Logs</CardTitle>
            <Badge variant="secondary">{totalCount} logs</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search user or case..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-48"
            />
            <Select value={ttsFilter} onValueChange={v => { setTtsFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="TTS Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                <SelectItem value="browser">Browser</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No performance logs recorded yet. Logs are captured automatically when students use voice chat.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader col="created_at" label="Time" />
                    <TableHead>User</TableHead>
                    <TableHead>Case</TableHead>
                    <SortHeader col="stt_ms" label="STT" />
                    <SortHeader col="chat_api_ms" label="Chat API" />
                    <TableHead className="text-xs text-muted-foreground">DB</TableHead>
                    <TableHead className="text-xs text-muted-foreground">AI</TableHead>
                    <SortHeader col="tts_api_ms" label="TTS API" />
                    <TableHead className="text-xs text-muted-foreground">Gen</TableHead>
                    <SortHeader col="audio_play_ms" label="Play" />
                    <SortHeader col="total_ms" label="Total" />
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {profileCache[log.user_id] || log.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[80px] truncate">
                        {log.case_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell><MsCell value={log.stt_ms} /></TableCell>
                      <TableCell><MsCell value={log.chat_api_ms} /></TableCell>
                      <TableCell><MsCell value={log.chat_db_ms} /></TableCell>
                      <TableCell><MsCell value={log.chat_ai_ms} /></TableCell>
                      <TableCell><MsCell value={log.tts_api_ms} /></TableCell>
                      <TableCell><MsCell value={log.tts_generation_ms} /></TableCell>
                      <TableCell><MsCell value={log.audio_play_ms} /></TableCell>
                      <TableCell><MsCell value={log.total_ms} /></TableCell>
                      <TableCell>
                        {log.tts_provider ? (
                          <Badge variant="outline" className="text-[10px]">{log.tts_provider}</Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Averages row */}
                  {averages && (
                    <TableRow className="bg-muted/30 font-medium border-t-2">
                      <TableCell className="text-xs">Averages</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell><MsCell value={averages.stt_ms} /></TableCell>
                      <TableCell><MsCell value={averages.chat_api_ms} /></TableCell>
                      <TableCell><MsCell value={averages.chat_db_ms} /></TableCell>
                      <TableCell><MsCell value={averages.chat_ai_ms} /></TableCell>
                      <TableCell><MsCell value={averages.tts_api_ms} /></TableCell>
                      <TableCell><MsCell value={averages.tts_generation_ms} /></TableCell>
                      <TableCell><MsCell value={averages.audio_play_ms} /></TableCell>
                      <TableCell><MsCell value={averages.total_ms} /></TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
